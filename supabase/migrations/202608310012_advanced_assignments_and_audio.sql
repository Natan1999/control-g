-- Control G LATAM + GIS — advanced field assignments and private audio.
-- Additive/idempotent: existing professional assignments and responses remain valid.

alter table public.form_assignments
  add column if not exists priority smallint not null default 3,
  add column if not exists quota integer,
  add column if not exists completed_count integer not null default 0,
  add column if not exists territory_id text references public.entity_municipalities(id) on delete set null,
  add column if not exists group_code text,
  add column if not exists instructions text;

alter table public.form_assignments drop constraint if exists form_assignments_priority_check;
alter table public.form_assignments add constraint form_assignments_priority_check
  check (priority between 1 and 5);
alter table public.form_assignments drop constraint if exists form_assignments_quota_check;
alter table public.form_assignments add constraint form_assignments_quota_check
  check (quota is null or quota > 0);
alter table public.form_assignments drop constraint if exists form_assignments_completed_count_check;
alter table public.form_assignments add constraint form_assignments_completed_count_check
  check (completed_count >= 0);
alter table public.form_assignments drop constraint if exists form_assignments_dates_check;
alter table public.form_assignments add constraint form_assignments_dates_check
  check (starts_at is null or ends_at is null or starts_at < ends_at);
alter table public.form_assignments drop constraint if exists form_assignments_group_code_check;
alter table public.form_assignments add constraint form_assignments_group_code_check
  check (group_code is null or (char_length(btrim(group_code)) between 2 and 80));

create index if not exists form_assignments_active_priority_idx
  on public.form_assignments(professional_id, status, priority, ends_at);
create index if not exists form_assignments_territory_idx
  on public.form_assignments(entity_id, territory_id, status);
create index if not exists form_assignments_group_idx
  on public.form_assignments(entity_id, group_code) where group_code is not null;

-- Recompute instead of incrementing blindly so rerunning this migration is safe.
update public.form_assignments assignment
set completed_count = (
  select count(*)::integer
  from public.form_responses response
  where response.entity_id = assignment.entity_id
    and response.form_id = assignment.form_id
    and response.professional_id = assignment.professional_id
);

create or replace function public.validate_form_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.forms
    where id = new.form_id
      and entity_id = new.entity_id
  ) then
    raise exception 'El formulario no pertenece a la entidad indicada.' using errcode = '23514';
  end if;
  if new.status = 'active' and not exists (
    select 1 from public.forms
    where id = new.form_id
      and entity_id = new.entity_id
      and status = 'published'
  ) then
    raise exception 'Solo se pueden activar asignaciones de formularios publicados.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.user_profiles
    where user_id = new.professional_id
      and entity_id = new.entity_id
      and role = 'professional'
      and status = 'active'
  ) then
    raise exception 'El usuario no es un profesional activo de esta entidad.' using errcode = '23514';
  end if;
  if new.status = 'active' and new.territory_id is not null and not exists (
    select 1
    from public.entity_municipalities municipality
    join public.professional_assignments professional_assignment
      on professional_assignment.municipality_id = municipality.id
     and professional_assignment.professional_id = new.professional_id
     and professional_assignment.entity_id = new.entity_id
    where municipality.id = new.territory_id
      and municipality.entity_id = new.entity_id
  ) then
    raise exception 'El profesional no está habilitado para el territorio de esta asignación.' using errcode = '23514';
  end if;
  new.group_code := nullif(btrim(new.group_code), '');
  new.instructions := nullif(btrim(new.instructions), '');
  return new;
end;
$$;

create or replace function public.increment_form_assignment_completed_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.form_assignments
  set completed_count = completed_count + 1
  where entity_id = new.entity_id
    and form_id = new.form_id
    and professional_id = new.professional_id;
  return new;
end;
$$;

drop trigger if exists increment_form_assignment_completed_count on public.form_responses;
create trigger increment_form_assignment_completed_count
after insert on public.form_responses
for each row execute function public.increment_form_assignment_completed_count();

-- Accept delayed offline synchronization when the capture happened inside the
-- assignment window. Quotas are operational targets rather than a reason to
-- discard field data already collected without connectivity.
-- Superadministrators keep their existing import/administrative exception.
drop policy if exists responses_insert on public.form_responses;
create policy responses_insert on public.form_responses for insert to authenticated
with check (
  public.is_control_g_admin()
  or (
    entity_id = public.current_entity_id()
    and professional_id = auth.uid()
    and exists (
      select 1
      from public.form_assignments assignment
      where assignment.entity_id = form_responses.entity_id
        and assignment.form_id = form_responses.form_id
        and assignment.professional_id = auth.uid()
        and (assignment.starts_at is null or assignment.starts_at <= form_responses.captured_at)
        and (assignment.ends_at is null or assignment.ends_at >= form_responses.captured_at)
    )
    and form_responses.captured_at <= now() + interval '5 minutes'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'field-audio',
  'field-audio',
  false,
  26214400,
  array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists control_g_storage_select on storage.objects;
create policy control_g_storage_select on storage.objects for select to authenticated using (
  bucket_id in ('field-photos','signatures','avatars','exports','field-audio') and
  (public.is_control_g_admin() or (storage.foldername(name))[1] = public.current_entity_id())
);
drop policy if exists control_g_storage_insert on storage.objects;
create policy control_g_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('field-photos','signatures','avatars','exports','field-audio') and
  (storage.foldername(name))[1] = coalesce(public.current_entity_id(), 'global') and
  (storage.foldername(name))[2] = auth.uid()::text
);

grant select, insert, update, delete on public.form_assignments to authenticated;
