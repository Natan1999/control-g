-- Governed form editorial workflow. Published forms remain stable while a
-- separate candidate is drafted, reviewed and approved. Publication copies
-- the candidate atomically and the existing snapshot trigger preserves the
-- immutable version answered by field devices.

alter table public.forms
  drop constraint if exists forms_status_check;
alter table public.forms
  add constraint forms_status_check
  check (status in ('draft','published','retired')) not valid;
alter table public.forms
  validate constraint forms_status_check;

create table if not exists public.form_change_requests (
  id text primary key default gen_random_uuid()::text,
  form_id text not null references public.forms(id) on delete cascade,
  entity_id text not null references public.entities(id) on delete cascade,
  base_version integer not null default 0 check (base_version >= 0),
  published_version integer check (published_version is null or published_version > 0),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  description text,
  type text not null check (type in ('ex_ante','encounter_1','encounter_2','encounter_3','ex_post')),
  definition text not null default '[]',
  definition_sha256 text not null check (definition_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'draft'
    check (status in ('draft','in_review','changes_requested','approved','published','withdrawn')),
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(definition::jsonb) = 'array')
);

create unique index if not exists form_change_requests_one_active_idx
  on public.form_change_requests(form_id)
  where status in ('draft','in_review','changes_requested','approved');
create index if not exists form_change_requests_entity_status_idx
  on public.form_change_requests(entity_id, status, updated_at desc);

create table if not exists public.form_editorial_events (
  id text primary key default gen_random_uuid()::text,
  form_id text not null references public.forms(id) on delete cascade,
  change_request_id text references public.form_change_requests(id) on delete set null,
  entity_id text not null references public.entities(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in (
    'created','saved','submitted','changes_requested','approved',
    'published','withdrawn','retired'
  )),
  from_status text,
  to_status text,
  comment text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists form_editorial_events_form_idx
  on public.form_editorial_events(entity_id, form_id, created_at desc);

drop trigger if exists set_form_change_requests_updated_at on public.form_change_requests;
create trigger set_form_change_requests_updated_at
before update on public.form_change_requests
for each row execute function public.set_updated_at();

create or replace function public.prepare_form_version()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.status in ('published','retired')
     and (
       new.definition is distinct from old.definition
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.type is distinct from old.type
     ) then
    new.version := greatest(coalesce(new.version, 1), old.version + 1);
    new.v := new.version;
  elsif tg_op = 'INSERT' then
    new.version := greatest(coalesce(new.version, 1), 1);
    new.v := new.version;
  else
    new.version := greatest(coalesce(new.version, old.version, 1), 1);
    new.v := new.version;
  end if;
  return new;
end;
$$;

create or replace function public.snapshot_published_form_version()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  should_snapshot boolean := false;
begin
  if tg_op = 'INSERT' then
    should_snapshot := new.status = 'published';
  else
    should_snapshot := new.status = 'published' and (
      new.definition is distinct from old.definition
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.type is distinct from old.type
      or new.status is distinct from old.status
    );
  end if;

  if should_snapshot then
    insert into public.form_versions (
      form_id, entity_id, version, title, description, type, definition,
      definition_sha256, status, published_at, created_by
    ) values (
      new.id, new.entity_id, new.version, new.title, new.description, new.type, new.definition,
      encode(extensions.digest(convert_to(new.definition, 'UTF8'), 'sha256'), 'hex'),
      'published', now(), auth.uid()
    ) on conflict (form_id, version) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_form_version_trigger on public.forms;
create trigger prepare_form_version_trigger
  before insert or update of definition, title, description, type, status, version on public.forms
  for each row execute function public.prepare_form_version();

drop trigger if exists snapshot_published_form_version_trigger on public.forms;
create trigger snapshot_published_form_version_trigger
  after insert or update of definition, title, description, type, status, version on public.forms
  for each row execute function public.snapshot_published_form_version();

create or replace function public.save_form_change(
  p_form_id text,
  p_entity_id text,
  p_title text,
  p_description text,
  p_type text,
  p_definition text,
  p_change_id text default null,
  p_expected_revision integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := public.is_control_g_admin();
  actor_role text := public.current_profile_role();
  actor_entity text := public.current_entity_id();
  target_form public.forms%rowtype;
  target_change public.form_change_requests%rowtype;
  previous_status text;
  parsed_definition jsonb;
begin
  if actor_id is null then
    raise exception 'FORM_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_entity_id is null or (
    not actor_is_admin
    and not (actor_role = 'coordinator' and actor_entity = p_entity_id)
  ) then
    raise exception 'FORM_EDITOR_FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 180 then
    raise exception 'FORM_TITLE_INVALID' using errcode = '22023';
  end if;
  if p_type not in ('ex_ante','encounter_1','encounter_2','encounter_3','ex_post') then
    raise exception 'FORM_TYPE_INVALID' using errcode = '22023';
  end if;
  begin
    parsed_definition := p_definition::jsonb;
  exception when others then
    raise exception 'FORM_DEFINITION_INVALID' using errcode = '22023';
  end;
  if jsonb_typeof(parsed_definition) <> 'array' then
    raise exception 'FORM_DEFINITION_INVALID' using errcode = '22023';
  end if;

  if p_form_id is null then
    insert into public.forms (
      entity_id, name, title, description, type, definition, pages_json,
      status, version, v
    ) values (
      p_entity_id, btrim(p_title), btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
      p_type, p_definition, p_definition, 'draft', 1, 1
    ) returning * into target_form;
  else
    select * into target_form from public.forms
    where id = p_form_id for update;
    if not found then
      raise exception 'FORM_NOT_FOUND' using errcode = 'P0002';
    end if;
    if target_form.status = 'retired' then
      raise exception 'FORM_RETIRED' using errcode = '55000';
    end if;
    if target_form.entity_id <> p_entity_id then
      raise exception 'FORM_ENTITY_MISMATCH' using errcode = '42501';
    end if;
  end if;

  if p_change_id is not null then
    select * into target_change from public.form_change_requests
    where id = p_change_id and form_id = target_form.id for update;
    if not found then
      raise exception 'FORM_CHANGE_NOT_FOUND' using errcode = 'P0002';
    end if;
  else
    select * into target_change from public.form_change_requests
    where form_id = target_form.id
      and status in ('draft','in_review','changes_requested','approved')
    order by created_at desc limit 1 for update;
  end if;

  if target_change.id is null then
    insert into public.form_change_requests (
      form_id, entity_id, base_version, title, description, type, definition,
      definition_sha256, status, revision, created_by
    ) values (
      target_form.id, target_form.entity_id,
      case when target_form.status = 'published' then target_form.version else 0 end,
      btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), p_type, p_definition,
      encode(extensions.digest(convert_to(p_definition, 'UTF8'), 'sha256'), 'hex'),
      'draft', 1, actor_id
    ) returning * into target_change;
    insert into public.form_editorial_events (
      form_id, change_request_id, entity_id, actor_id, action,
      from_status, to_status, metadata
    ) values (
      target_form.id, target_change.id, target_form.entity_id, actor_id, 'created',
      null, 'draft', jsonb_build_object('revision', target_change.revision)
    );
  else
    if target_change.status not in ('draft','changes_requested') then
      raise exception 'FORM_CHANGE_LOCKED' using errcode = '55000';
    end if;
    if p_expected_revision is not null and target_change.revision <> p_expected_revision then
      raise exception 'FORM_DRAFT_CONFLICT' using errcode = '40001';
    end if;
    previous_status := target_change.status;
    update public.form_change_requests
    set title = btrim(p_title),
        description = nullif(btrim(coalesce(p_description, '')), ''),
        type = p_type,
        definition = p_definition,
        definition_sha256 = encode(extensions.digest(convert_to(p_definition, 'UTF8'), 'sha256'), 'hex'),
        status = 'draft',
        revision = revision + 1
    where id = target_change.id
    returning * into target_change;
    insert into public.form_editorial_events (
      form_id, change_request_id, entity_id, actor_id, action,
      from_status, to_status, metadata
    ) values (
      target_form.id, target_change.id, target_form.entity_id, actor_id, 'saved',
      previous_status, 'draft', jsonb_build_object('revision', target_change.revision)
    );
  end if;

  if target_form.status = 'draft' then
    update public.forms
    set name = target_change.title,
        title = target_change.title,
        description = target_change.description,
        type = target_change.type,
        definition = target_change.definition,
        pages_json = target_change.definition
    where id = target_form.id;
  end if;

  return jsonb_build_object(
    'form_id', target_form.id,
    'change_id', target_change.id,
    'status', target_change.status,
    'revision', target_change.revision,
    'base_version', target_change.base_version,
    'definition_sha256', target_change.definition_sha256
  );
end;
$$;

create or replace function public.transition_form_change(
  p_change_id text,
  p_target_status text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := public.is_control_g_admin();
  actor_role text := public.current_profile_role();
  actor_entity text := public.current_entity_id();
  target_change public.form_change_requests%rowtype;
  target_form public.forms%rowtype;
  previous_status text;
  action_name text;
  new_published_version integer;
begin
  if actor_id is null then
    raise exception 'FORM_AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into target_change from public.form_change_requests
  where id = p_change_id for update;
  if not found then
    raise exception 'FORM_CHANGE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not actor_is_admin
     and not (actor_role = 'coordinator' and actor_entity = target_change.entity_id) then
    raise exception 'FORM_EDITOR_FORBIDDEN' using errcode = '42501';
  end if;
  select * into target_form from public.forms
  where id = target_change.form_id for update;
  if not found or target_form.entity_id <> target_change.entity_id then
    raise exception 'FORM_ENTITY_MISMATCH' using errcode = '42501';
  end if;

  previous_status := target_change.status;
  if p_target_status = 'in_review' then
    if previous_status not in ('draft','changes_requested') then
      raise exception 'FORM_TRANSITION_INVALID' using errcode = '22023';
    end if;
    update public.form_change_requests
    set status = 'in_review', submitted_by = actor_id, submitted_at = now()
    where id = target_change.id;
    action_name := 'submitted';
  elsif p_target_status in ('approved','changes_requested') then
    if previous_status <> 'in_review' then
      raise exception 'FORM_TRANSITION_INVALID' using errcode = '22023';
    end if;
    if not actor_is_admin and target_change.submitted_by = actor_id then
      raise exception 'FORM_REVIEWER_MUST_DIFFER' using errcode = '42501';
    end if;
    if p_target_status = 'changes_requested'
       and char_length(btrim(coalesce(p_comment, ''))) < 5 then
      raise exception 'FORM_REVIEW_COMMENT_REQUIRED' using errcode = '22023';
    end if;
    update public.form_change_requests
    set status = p_target_status,
        reviewed_by = actor_id,
        reviewed_at = now(),
        review_notes = nullif(btrim(coalesce(p_comment, '')), '')
    where id = target_change.id;
    action_name := case when p_target_status = 'approved' then 'approved' else 'changes_requested' end;
  elsif p_target_status = 'published' then
    if previous_status <> 'approved' then
      raise exception 'FORM_TRANSITION_INVALID' using errcode = '22023';
    end if;
    if target_form.status = 'published' and target_form.version <> target_change.base_version then
      raise exception 'FORM_BASE_VERSION_CHANGED' using errcode = '40001';
    end if;
    update public.forms
    set name = target_change.title,
        title = target_change.title,
        description = target_change.description,
        type = target_change.type,
        definition = target_change.definition,
        pages_json = target_change.definition,
        status = 'published'
    where id = target_form.id
    returning version into new_published_version;
    update public.form_change_requests
    set status = 'published', published_by = actor_id, published_at = now(),
        published_version = new_published_version
    where id = target_change.id;
    update public.form_versions
    set status = 'published'
    where form_id = target_form.id and version = new_published_version;
    action_name := 'published';
  elsif p_target_status = 'withdrawn' then
    if previous_status not in ('draft','in_review','changes_requested','approved') then
      raise exception 'FORM_TRANSITION_INVALID' using errcode = '22023';
    end if;
    update public.form_change_requests set status = 'withdrawn'
    where id = target_change.id;
    action_name := 'withdrawn';
  else
    raise exception 'FORM_TRANSITION_INVALID' using errcode = '22023';
  end if;

  insert into public.form_editorial_events (
    form_id, change_request_id, entity_id, actor_id, action,
    from_status, to_status, comment, metadata
  ) values (
    target_change.form_id, target_change.id, target_change.entity_id, actor_id, action_name,
    previous_status, p_target_status, nullif(btrim(coalesce(p_comment, '')), ''),
    jsonb_build_object('revision', target_change.revision, 'published_version', new_published_version)
  );

  if p_target_status = 'published' then
    insert into public.audit_log (entity_id, user_id, action, table_name, record_id, metadata)
    values (
      target_change.entity_id, actor_id, 'form_published', 'forms', target_change.form_id,
      jsonb_build_object(
        'change_id', target_change.id,
        'base_version', target_change.base_version,
        'published_version', new_published_version,
        'definition_sha256', target_change.definition_sha256
      )
    );
  end if;

  return jsonb_build_object(
    'form_id', target_change.form_id,
    'change_id', target_change.id,
    'status', p_target_status,
    'revision', target_change.revision,
    'published_version', new_published_version
  );
end;
$$;

create or replace function public.retire_form(
  p_form_id text,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := public.is_control_g_admin();
  actor_role text := public.current_profile_role();
  actor_entity text := public.current_entity_id();
  target_form public.forms%rowtype;
  assignments_retired integer := 0;
begin
  if actor_id is null then
    raise exception 'FORM_AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into target_form from public.forms where id = p_form_id for update;
  if not found then
    raise exception 'FORM_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not actor_is_admin
     and not (actor_role = 'coordinator' and actor_entity = target_form.entity_id) then
    raise exception 'FORM_EDITOR_FORBIDDEN' using errcode = '42501';
  end if;
  if target_form.status <> 'published' then
    raise exception 'FORM_RETIRE_INVALID' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_comment, ''))) < 5 then
    raise exception 'FORM_RETIRE_COMMENT_REQUIRED' using errcode = '22023';
  end if;

  update public.forms set status = 'retired' where id = target_form.id;
  update public.form_assignments
  set status = 'inactive'
  where form_id = target_form.id and status = 'active';
  get diagnostics assignments_retired = row_count;
  update public.form_versions
  set status = 'archived'
  where form_id = target_form.id and version = target_form.version;

  insert into public.form_editorial_events (
    form_id, entity_id, actor_id, action, from_status, to_status, comment, metadata
  ) values (
    target_form.id, target_form.entity_id, actor_id, 'retired', 'published', 'retired',
    btrim(p_comment), jsonb_build_object('version', target_form.version, 'assignments_retired', assignments_retired)
  );
  insert into public.audit_log (entity_id, user_id, action, table_name, record_id, metadata)
  values (
    target_form.entity_id, actor_id, 'form_retired', 'forms', target_form.id,
    jsonb_build_object('version', target_form.version, 'assignments_retired', assignments_retired)
  );

  return jsonb_build_object(
    'form_id', target_form.id,
    'status', 'retired',
    'version', target_form.version,
    'assignments_retired', assignments_retired
  );
end;
$$;

alter table public.form_change_requests enable row level security;
alter table public.form_editorial_events enable row level security;

drop policy if exists form_change_requests_read on public.form_change_requests;
create policy form_change_requests_read on public.form_change_requests
  for select to authenticated
  using (
    public.is_control_g_admin()
    or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
  );

drop policy if exists form_editorial_events_read on public.form_editorial_events;
create policy form_editorial_events_read on public.form_editorial_events
  for select to authenticated
  using (
    public.is_control_g_admin()
    or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
  );

revoke all on public.form_change_requests from anon, authenticated;
revoke all on public.form_editorial_events from anon, authenticated;
grant select on public.form_change_requests to authenticated;
grant select on public.form_editorial_events to authenticated;

revoke insert, update, delete on public.forms from public, anon, authenticated;
grant select on public.forms to authenticated;

revoke all on function public.save_form_change(text,text,text,text,text,text,text,integer)
  from public, anon, authenticated;
revoke all on function public.transition_form_change(text,text,text)
  from public, anon, authenticated;
revoke all on function public.retire_form(text,text)
  from public, anon, authenticated;
grant execute on function public.save_form_change(text,text,text,text,text,text,text,integer)
  to authenticated;
grant execute on function public.transition_form_change(text,text,text)
  to authenticated;
grant execute on function public.retire_form(text,text)
  to authenticated;

revoke all on function public.prepare_form_version() from public, anon, authenticated;
revoke all on function public.snapshot_published_form_version() from public, anon, authenticated;
