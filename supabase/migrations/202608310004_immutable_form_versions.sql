-- Control G · Plan Maestro LATAM + GIS
-- Immutable published form versions. Editing a published definition creates a
-- new version while historic responses retain their original form_version.

create table if not exists public.form_versions (
  id text primary key default gen_random_uuid()::text,
  form_id text not null references public.forms(id) on delete cascade,
  entity_id text not null references public.entities(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null,
  description text,
  type text not null,
  definition text not null,
  definition_sha256 text,
  status text not null default 'published' check (status in ('published','archived')),
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(form_id, version)
);

create index if not exists form_versions_entity_form_idx
  on public.form_versions(entity_id, form_id, version desc);

create or replace function public.prepare_form_version()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.definition is distinct from old.definition then
    new.version := greatest(coalesce(new.version, 1), old.version + 1);
    new.v := new.version;
  elsif tg_op = 'INSERT' then
    new.version := greatest(coalesce(new.version, 1), 1);
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
  before insert or update of definition, status, version on public.forms
  for each row execute function public.prepare_form_version();

drop trigger if exists snapshot_published_form_version_trigger on public.forms;
create trigger snapshot_published_form_version_trigger
  after insert or update of definition, status, version on public.forms
  for each row execute function public.snapshot_published_form_version();

insert into public.form_versions (
  form_id, entity_id, version, title, description, type, definition,
  definition_sha256, status, published_at
)
select
  form.id, form.entity_id, form.version, form.title, form.description, form.type, form.definition,
  encode(extensions.digest(convert_to(form.definition, 'UTF8'), 'sha256'), 'hex'),
  'published', coalesce(form.updated_at, form.created_at, now())
from public.forms form
where form.status = 'published'
on conflict (form_id, version) do nothing;

alter table public.form_versions enable row level security;

drop policy if exists form_versions_read on public.form_versions;
create policy form_versions_read on public.form_versions
  for select to authenticated
  using (
    public.is_control_g_admin()
    or (
      entity_id = public.current_entity_id()
      and public.current_profile_role() in ('coordinator', 'support')
    )
  );

revoke all on public.form_versions from authenticated;
grant select on public.form_versions to authenticated;
revoke all on function public.prepare_form_version() from public, anon, authenticated;
revoke all on function public.snapshot_published_form_version() from public, anon, authenticated;
