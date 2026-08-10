-- Explicit form-to-professional assignments for field capture.
-- Safe to execute more than once after 202608070001_initial_control_g.sql.

create table if not exists public.form_assignments (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  form_id text not null references public.forms(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(form_id, professional_id)
);

create index if not exists form_assignments_professional_idx
  on public.form_assignments(professional_id, status);
create index if not exists form_assignments_entity_form_idx
  on public.form_assignments(entity_id, form_id);

drop trigger if exists set_form_assignments_updated_at on public.form_assignments;
create trigger set_form_assignments_updated_at
before update on public.form_assignments
for each row execute function public.set_updated_at();

create or replace function public.validate_form_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.forms
    where id = new.form_id and entity_id = new.entity_id
  ) then
    raise exception 'El formulario no pertenece a la entidad indicada.' using errcode = '23514';
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
  return new;
end;
$$;

drop trigger if exists validate_form_assignment_row on public.form_assignments;
create trigger validate_form_assignment_row
before insert or update on public.form_assignments
for each row execute function public.validate_form_assignment();

alter table public.form_assignments enable row level security;

drop policy if exists form_assignments_select on public.form_assignments;
create policy form_assignments_select on public.form_assignments for select to authenticated
using (
  public.is_control_g_admin()
  or (
    entity_id = public.current_entity_id()
    and (
      public.current_profile_role() in ('coordinator','support')
      or professional_id = auth.uid()
    )
  )
);

drop policy if exists form_assignments_write on public.form_assignments;
create policy form_assignments_write on public.form_assignments for all to authenticated
using (
  public.is_control_g_admin()
  or (
    public.current_profile_role() = 'coordinator'
    and entity_id = public.current_entity_id()
  )
)
with check (
  public.is_control_g_admin()
  or (
    public.current_profile_role() = 'coordinator'
    and entity_id = public.current_entity_id()
  )
);

-- Professionals may only download published forms explicitly assigned to them.
-- Coordinators/support retain entity-wide visibility for design and review.
drop policy if exists forms_select on public.forms;
create policy forms_select on public.forms for select to authenticated
using (
  public.is_control_g_admin()
  or (
    entity_id = public.current_entity_id()
    and (
      public.current_profile_role() in ('coordinator','support')
      or (
        public.current_profile_role() = 'professional'
        and status = 'published'
        and exists (
          select 1
          from public.form_assignments assignment
          where assignment.form_id = forms.id
            and assignment.entity_id = forms.entity_id
            and assignment.professional_id = auth.uid()
            and assignment.status = 'active'
            and (assignment.starts_at is null or assignment.starts_at <= now())
            and (assignment.ends_at is null or assignment.ends_at >= now())
        )
      )
    )
  )
);

grant select, insert, update, delete on public.form_assignments to authenticated;
