-- Control G 2.0 - Supabase schema, tenancy, offline idempotency and Bolívar seed.
-- Safe to execute more than once.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.entities (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  nit text,
  contract_number text not null unique,
  contract_object text not null default '',
  operator_name text not null default '',
  department text not null,
  period_start date not null,
  period_end date not null,
  families_per_municipality integer not null default 0 check (families_per_municipality >= 0),
  status text not null default 'active' check (status in ('active','suspended','completed')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id text primary key default gen_random_uuid()::text,
  user_id uuid unique,
  entity_id text references public.entities(id) on delete set null,
  full_name text not null,
  email citext,
  phone text,
  role text not null check (role in ('admin','coordinator','support','professional')),
  avatar_url text,
  signature_url text,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  must_change_password boolean not null default true,
  last_seen_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists user_profiles_email_unique on public.user_profiles(email) where email is not null;

create table if not exists public.entity_municipalities (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  municipality_name text not null,
  department text not null,
  families_target integer not null default 0 check (families_target >= 0),
  dane_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id, municipality_name)
);

create table if not exists public.professional_assignments (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  professional_id uuid not null,
  municipality_id text not null references public.entity_municipalities(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(professional_id, municipality_id)
);

create table if not exists public.families (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  municipality_id text references public.entity_municipalities(id) on delete set null,
  professional_id uuid,
  first_name text not null,
  second_name text,
  first_lastname text not null,
  second_lastname text,
  full_name text,
  id_document_type text not null default 'CC',
  id_number text not null,
  birth_date date,
  age integer,
  phone text,
  zone text,
  address text,
  directions text,
  latitude double precision,
  longitude double precision,
  gender text,
  ethnic_group text,
  disability text,
  differential_factor text,
  dependents integer not null default 0,
  companion_required boolean not null default false,
  companion_name text,
  companion_document text,
  companion_relationship text,
  ex_ante_status text not null default 'pending' check (ex_ante_status in ('pending','completed')),
  ex_ante_date date,
  ex_ante_activity_id text,
  encounter_1_status text not null default 'pending' check (encounter_1_status in ('pending','completed')),
  encounter_1_date date,
  encounter_1_topic text,
  encounter_1_activity_id text,
  encounter_2_status text not null default 'pending' check (encounter_2_status in ('pending','completed')),
  encounter_2_date date,
  encounter_2_topic text,
  encounter_2_activity_id text,
  encounter_3_status text not null default 'pending' check (encounter_3_status in ('pending','completed')),
  encounter_3_date date,
  encounter_3_topic text,
  encounter_3_activity_id text,
  ex_post_status text not null default 'pending' check (ex_post_status in ('pending','completed')),
  ex_post_date date,
  ex_post_positive_impact boolean,
  ex_post_activity_id text,
  overall_status text not null default 'pending' check (overall_status in ('pending','in_progress','completed')),
  consent_given boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id, id_number)
);
create index if not exists families_entity_idx on public.families(entity_id);
create index if not exists families_professional_idx on public.families(professional_id);

create table if not exists public.activities (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  family_id text not null references public.families(id) on delete cascade,
  professional_id uuid not null,
  municipality_id text references public.entity_municipalities(id) on delete set null,
  activity_type text not null check (activity_type in ('ex_ante','encounter_1','encounter_2','encounter_3','ex_post')),
  activity_date date not null,
  topic text,
  description text,
  positive_impact boolean,
  program_evaluation text,
  professional_evaluation text,
  photo_url text,
  beneficiary_signature_url text,
  latitude double precision,
  longitude double precision,
  local_id text not null unique,
  synced_at timestamptz default now(),
  status text not null default 'synced' check (status in ('synced','reviewed','approved','rejected')),
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists activities_entity_idx on public.activities(entity_id);
create index if not exists activities_family_idx on public.activities(family_id);

create table if not exists public.observations (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  from_user_id uuid not null,
  to_user_id uuid not null,
  family_id text references public.families(id) on delete cascade,
  activity_id text references public.activities(id) on delete cascade,
  content text not null,
  type text not null default 'observation' check (type in ('observation','correction','approval')),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forms (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  name text,
  title text not null,
  description text,
  type text not null check (type in ('ex_ante','encounter_1','encounter_2','encounter_3','ex_post')),
  definition text not null default '[]',
  pages_json text,
  status text not null default 'draft' check (status in ('draft','published')),
  version integer not null default 1,
  v integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists forms_entity_status_idx on public.forms(entity_id, status);

create table if not exists public.form_responses (
  id text primary key default gen_random_uuid()::text,
  form_id text not null references public.forms(id) on delete restrict,
  entity_id text not null references public.entities(id) on delete cascade,
  family_id text references public.families(id) on delete set null,
  professional_id uuid not null,
  municipality_id text references public.entity_municipalities(id) on delete set null,
  local_id text not null unique,
  answers jsonb not null default '{}'::jsonb,
  answers_json text not null default '{}',
  latitude double precision,
  longitude double precision,
  status text not null default 'synced' check (status in ('synced','reviewed','approved','rejected')),
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  captured_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id text primary key default gen_random_uuid()::text,
  entity_id text references public.entities(id) on delete cascade,
  user_id uuid,
  action text not null,
  table_name text,
  record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_log (
  id text primary key default gen_random_uuid()::text,
  entity_id text references public.entities(id) on delete cascade,
  user_id uuid,
  device_id text,
  pushed_count integer not null default 0,
  failed_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'entities','user_profiles','entity_municipalities','professional_assignments',
    'families','activities','observations','forms','form_responses'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.current_profile_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.user_profiles where user_id = auth.uid() limit 1
$$;
create or replace function public.current_entity_id()
returns text language sql stable security definer set search_path = public as $$
  select entity_id from public.user_profiles where user_id = auth.uid() limit 1
$$;
create or replace function public.is_control_g_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

alter table public.entities enable row level security;
alter table public.user_profiles enable row level security;
alter table public.entity_municipalities enable row level security;
alter table public.professional_assignments enable row level security;
alter table public.families enable row level security;
alter table public.activities enable row level security;
alter table public.observations enable row level security;
alter table public.forms enable row level security;
alter table public.form_responses enable row level security;
alter table public.audit_log enable row level security;
alter table public.sync_log enable row level security;

drop policy if exists entities_select on public.entities;
create policy entities_select on public.entities for select to authenticated
using (public.is_control_g_admin() or id = public.current_entity_id());
drop policy if exists entities_admin_write on public.entities;
create policy entities_admin_write on public.entities for all to authenticated
using (public.is_control_g_admin()) with check (public.is_control_g_admin());

drop policy if exists profiles_select on public.user_profiles;
create policy profiles_select on public.user_profiles for select to authenticated
using (public.is_control_g_admin() or user_id = auth.uid() or entity_id = public.current_entity_id());
drop policy if exists profiles_update on public.user_profiles;
create policy profiles_update on public.user_profiles for update to authenticated
using (public.is_control_g_admin() or user_id = auth.uid() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()))
with check (public.is_control_g_admin() or user_id = auth.uid() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()));

drop policy if exists municipalities_select on public.entity_municipalities;
create policy municipalities_select on public.entity_municipalities for select to authenticated
using (public.is_control_g_admin() or entity_id = public.current_entity_id());
drop policy if exists municipalities_write on public.entity_municipalities;
create policy municipalities_write on public.entity_municipalities for all to authenticated
using (public.is_control_g_admin() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()))
with check (public.is_control_g_admin() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()));

drop policy if exists assignments_select on public.professional_assignments;
create policy assignments_select on public.professional_assignments for select to authenticated
using (public.is_control_g_admin() or entity_id = public.current_entity_id());
drop policy if exists assignments_write on public.professional_assignments;
create policy assignments_write on public.professional_assignments for all to authenticated
using (public.is_control_g_admin() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()))
with check (public.is_control_g_admin() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()));

drop policy if exists families_select on public.families;
create policy families_select on public.families for select to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and (
    public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid()
  ))
);
drop policy if exists families_insert on public.families;
create policy families_insert on public.families for insert to authenticated
with check (public.is_control_g_admin() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()));
drop policy if exists families_update on public.families;
create policy families_update on public.families for update to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())))
with check (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())));

drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())));
drop policy if exists activities_insert on public.activities;
create policy activities_insert on public.activities for insert to authenticated
with check (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())));
drop policy if exists activities_update on public.activities;
create policy activities_update on public.activities for update to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())))
with check (public.is_control_g_admin() or entity_id = public.current_entity_id());

drop policy if exists observations_access on public.observations;
create policy observations_access on public.observations for select to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or from_user_id = auth.uid() or to_user_id = auth.uid())));
drop policy if exists observations_insert on public.observations;
create policy observations_insert on public.observations for insert to authenticated
with check (public.is_control_g_admin() or (entity_id = public.current_entity_id() and from_user_id = auth.uid()));
drop policy if exists observations_update on public.observations;
create policy observations_update on public.observations for update to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (to_user_id = auth.uid() or public.current_profile_role() in ('coordinator','support'))));

drop policy if exists forms_select on public.forms;
create policy forms_select on public.forms for select to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (status = 'published' or public.current_profile_role() = 'coordinator')));
drop policy if exists forms_write on public.forms;
create policy forms_write on public.forms for all to authenticated
using (public.is_control_g_admin() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()))
with check (public.is_control_g_admin() or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id()));

drop policy if exists responses_select on public.form_responses;
create policy responses_select on public.form_responses for select to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())));
drop policy if exists responses_insert on public.form_responses;
create policy responses_insert on public.form_responses for insert to authenticated
with check (public.is_control_g_admin() or (entity_id = public.current_entity_id() and professional_id = auth.uid()));
drop policy if exists responses_update on public.form_responses;
create policy responses_update on public.form_responses for update to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())));

drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
using (public.is_control_g_admin() or (public.current_profile_role() in ('coordinator','support') and entity_id = public.current_entity_id()));
drop policy if exists sync_log_access on public.sync_log;
create policy sync_log_access on public.sync_log for all to authenticated
using (public.is_control_g_admin() or (entity_id = public.current_entity_id() and user_id = auth.uid()))
with check (public.is_control_g_admin() or (entity_id = public.current_entity_id() and user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('field-photos','field-photos',false,10485760,array['image/jpeg','image/png','image/webp']),
  ('signatures','signatures',false,2097152,array['image/png','image/jpeg']),
  ('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
  ('exports','exports',false,52428800,array['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists control_g_storage_select on storage.objects;
create policy control_g_storage_select on storage.objects for select to authenticated using (
  bucket_id in ('field-photos','signatures','avatars','exports') and
  (public.is_control_g_admin() or (storage.foldername(name))[1] = public.current_entity_id())
);
drop policy if exists control_g_storage_insert on storage.objects;
create policy control_g_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('field-photos','signatures','avatars','exports') and
  (storage.foldername(name))[1] = coalesce(public.current_entity_id(), 'global') and
  (storage.foldername(name))[2] = auth.uid()::text
);
drop policy if exists control_g_storage_update on storage.objects;
create policy control_g_storage_update on storage.objects for update to authenticated using (
  (storage.foldername(name))[2] = auth.uid()::text or public.is_control_g_admin()
);
drop policy if exists control_g_storage_delete on storage.objects;
create policy control_g_storage_delete on storage.objects for delete to authenticated using (
  (storage.foldername(name))[2] = auth.uid()::text or public.is_control_g_admin()
);

-- First tenant: Gobernación de Bolívar. Forms remain entity-scoped so another
-- organization can receive its own versions without exposing data across tenants.
insert into public.entities (
  id,name,nit,contract_number,contract_object,operator_name,department,
  period_start,period_end,families_per_municipality,status,created_by
) values (
  'gov-bolivar-2026','Gobernación de Bolívar','806.007.001','CONTROL-G-BOLIVAR-2026',
  'Caracterización y acompañamiento psicosocial a familias mediante cinco momentos de atención',
  'DRAN Digital','Bolívar','2026-01-01','2026-12-31',35,'active','seed@controlg.local'
) on conflict (id) do update set
  name=excluded.name, contract_object=excluded.contract_object, operator_name=excluded.operator_name,
  department=excluded.department, updated_at=now();

insert into public.entity_municipalities (id,entity_id,municipality_name,department,families_target,dane_code) values
  ('bolivar-altos-del-rosario','gov-bolivar-2026','Altos del Rosario','Bolívar',35,'13030'),
  ('bolivar-mahates','gov-bolivar-2026','Mahates','Bolívar',35,'13433'),
  ('bolivar-san-jacinto','gov-bolivar-2026','San Jacinto','Bolívar',35,'13654'),
  ('bolivar-arjona','gov-bolivar-2026','Arjona','Bolívar',35,'13052'),
  ('bolivar-turbaco','gov-bolivar-2026','Turbaco','Bolívar',35,'13836')
on conflict (id) do update set families_target=excluded.families_target, dane_code=excluded.dane_code, updated_at=now();

insert into public.forms (id,entity_id,name,title,description,type,definition,pages_json,status,version,v) values
(
  'form_ex_antes_bolivar','gov-bolivar-2026','Caracterización socioeconómica Ex-Antes','Caracterización socioeconómica Ex-Antes',
  'Línea base familiar previa a los tres momentos de acompañamiento.','ex_ante',
  $json$[
    {"id":"ubicacion","title":"Ubicación y hogar","fields":[
      {"id":"fecha","type":"date","label":"Fecha de caracterización","required":true},
      {"id":"municipio","type":"municipality","label":"Municipio","required":true},
      {"id":"direccion","type":"text","label":"Dirección o indicaciones del hogar","required":true},
      {"id":"documento","type":"text","label":"Documento de la persona cabeza de hogar","required":true,"validation":"^[0-9]{4,15}$"},
      {"id":"nombre_cabeza","type":"text","label":"Nombre completo de la persona cabeza de hogar","required":true},
      {"id":"telefono","type":"phone","label":"Teléfono de contacto","required":false}
    ]},
    {"id":"caracterizacion","title":"Caracterización","fields":[
      {"id":"integrantes","type":"number","label":"Número de integrantes del hogar","required":true},
      {"id":"grupos_diferenciales","type":"checkbox","label":"Enfoques diferenciales presentes","required":false,"options":[
        {"label":"Niñas, niños o adolescentes","value":"nna"},{"label":"Persona mayor","value":"mayor"},{"label":"Discapacidad","value":"discapacidad"},{"label":"Grupo étnico","value":"etnico"},{"label":"Víctima del conflicto","value":"victima"},{"label":"Ninguno","value":"ninguno"}
      ]},
      {"id":"necesidades_prioritarias","type":"longtext","label":"Necesidades o riesgos prioritarios identificados","required":true},
      {"id":"consentimiento","type":"radio","label":"Autoriza el tratamiento de datos personales","required":true,"options":[{"label":"Sí","value":"si"},{"label":"No","value":"no"}]},
      {"id":"firma","type":"signature","label":"Firma de consentimiento","required":true},
      {"id":"gps","type":"gps","label":"Ubicación GPS del hogar","required":true}
    ]}
  ]$json$,$json$[]$json$,'published',1,1
),
(
  'form_enc_1_bolivar','gov-bolivar-2026','Primer momento: buen trato y hábitos saludables','Primer momento: buen trato y hábitos saludables',
  'Registro del taller Construyendo el buen trato en familia y Cuido mi cuerpo día a día.','encounter_1',
  $json$[
    {"id":"sesion","title":"Datos de la sesión","fields":[
      {"id":"fecha","type":"date","label":"Fecha del taller","required":true},
      {"id":"municipio","type":"municipality","label":"Municipio","required":true},
      {"id":"documento_familia","type":"text","label":"Documento de la persona participante","required":true},
      {"id":"participantes","type":"number","label":"Número de participantes del hogar","required":true},
      {"id":"nota_objetivo","type":"note","label":"Objetivo: promover relaciones basadas en el respeto, el diálogo y la autonomía, y fomentar rutinas que protejan la salud física y emocional.","required":false}
    ]},
    {"id":"buen_trato","title":"Buen trato, autonomía y cuidado personal","fields":[
      {"id":"palabra_buen_trato","type":"text","label":"Palabra que la familia asocia con buen trato","required":true},
      {"id":"raices_buen_trato","type":"checkbox","label":"Valores identificados como raíces del buen trato","required":true,"options":[{"label":"Respeto","value":"respeto"},{"label":"Paciencia","value":"paciencia"},{"label":"Escucha","value":"escucha"},{"label":"Diálogo","value":"dialogo"},{"label":"Autonomía","value":"autonomia"}]},
      {"id":"comportamientos","type":"longtext","label":"Comportamientos concretos que la familia se compromete a fortalecer","required":true},
      {"id":"tarea_autonomia","type":"longtext","label":"Tarea que niñas, niños o adolescentes pueden realizar con autonomía y acompañamiento seguro","required":false},
      {"id":"compromiso_48h","type":"longtext","label":"Compromiso de cambio para aplicar en las próximas 48 horas","required":true}
    ]},
    {"id":"habitos","title":"Hábitos saludables","fields":[
      {"id":"habito_favorito","type":"text","label":"Hábito saludable favorito de la familia","required":true},
      {"id":"aspectos_trabajados","type":"checkbox","label":"Aspectos trabajados","required":true,"options":[{"label":"Alimentación saludable","value":"alimentacion"},{"label":"Sueño y descanso","value":"sueno"},{"label":"Hidratación","value":"hidratacion"},{"label":"Actividad física segura","value":"actividad_fisica"},{"label":"Cuidado emocional","value":"emocional"}]},
      {"id":"semaforo_rojo","type":"longtext","label":"Semáforo rojo: prácticas que se deben evitar","required":true},
      {"id":"semaforo_amarillo","type":"longtext","label":"Semáforo amarillo: prácticas que se deben controlar","required":true},
      {"id":"semaforo_verde","type":"longtext","label":"Semáforo verde: hábitos que se promoverán","required":true},
      {"id":"habito_semana","type":"longtext","label":"Un hábito nuevo para esta semana","required":true}
    ]},
    {"id":"evidencia","title":"Evidencia y cierre","fields":[
      {"id":"foto","type":"photo","label":"Evidencia fotográfica del taller","required":true},
      {"id":"firma","type":"signature","label":"Firma de la persona participante","required":true},
      {"id":"gps","type":"gps","label":"Ubicación GPS del taller","required":true}
    ]}
  ]$json$,$json$[]$json$,'published',1,1
),
(
  'form_enc_2_bolivar','gov-bolivar-2026','Segundo momento: ambiente seguro y familia responsable','Segundo momento: ambiente seguro y familia responsable',
  'Registro de El árbol de la seguridad y La mochila de la responsabilidad familiar.','encounter_2',
  $json$[
    {"id":"sesion","title":"Datos de la sesión","fields":[
      {"id":"fecha","type":"date","label":"Fecha del taller","required":true},
      {"id":"municipio","type":"municipality","label":"Municipio","required":true},
      {"id":"documento_familia","type":"text","label":"Documento de la persona participante","required":true},
      {"id":"participantes","type":"number","label":"Número de participantes del hogar","required":true}
    ]},
    {"id":"seguridad","title":"El árbol de la seguridad","fields":[
      {"id":"ambitos_seguridad","type":"checkbox","label":"Ámbitos de seguridad analizados","required":true,"options":[{"label":"Física","value":"fisica"},{"label":"Emocional","value":"emocional"},{"label":"Digital","value":"digital"},{"label":"Comunitaria","value":"comunitaria"}]},
      {"id":"riesgos_identificados","type":"longtext","label":"Riesgos o factores que afectan la seguridad familiar o comunitaria","required":true},
      {"id":"accion_seguridad","type":"longtext","label":"Acción de seguridad que la familia empezará a aplicar hoy","required":true}
    ]},
    {"id":"responsabilidad","title":"La mochila de la responsabilidad familiar","fields":[
      {"id":"responsabilidades","type":"checkbox","label":"Responsabilidades revisadas en familia","required":true,"options":[{"label":"Cuidar a niñas y niños","value":"cuidado"},{"label":"Administrar recursos","value":"recursos"},{"label":"Respetar normas","value":"normas"},{"label":"Comunicar necesidades","value":"comunicacion"},{"label":"Acompañar estudios","value":"estudios"},{"label":"Apoyar emocionalmente","value":"apoyo"},{"label":"Participar en decisiones","value":"decisiones"}]},
      {"id":"responsabilidad_fortalecer","type":"longtext","label":"Responsabilidad que asumirá o fortalecerá para mejorar la convivencia","required":true},
      {"id":"rol_faltante","type":"longtext","label":"¿Qué pasaría si alguien no cumple su responsabilidad? Acuerdo alcanzado","required":true}
    ]},
    {"id":"evidencia","title":"Evidencia y cierre","fields":[
      {"id":"foto","type":"photo","label":"Evidencia fotográfica del taller","required":true},
      {"id":"firma","type":"signature","label":"Firma de la persona participante","required":true},
      {"id":"gps","type":"gps","label":"Ubicación GPS del taller","required":true}
    ]}
  ]$json$,$json$[]$json$,'published',1,1
),
(
  'form_enc_3_bolivar','gov-bolivar-2026','Tercer momento: derechos y prevención del bullying','Tercer momento: derechos y prevención del bullying',
  'Registro del mural de los derechos y la actividad Stop al bullying.','encounter_3',
  $json$[
    {"id":"sesion","title":"Datos de la sesión","fields":[
      {"id":"fecha","type":"date","label":"Fecha del taller","required":true},
      {"id":"municipio","type":"municipality","label":"Municipio","required":true},
      {"id":"documento_familia","type":"text","label":"Documento de la persona participante","required":true},
      {"id":"participantes","type":"number","label":"Número de participantes del hogar","required":true}
    ]},
    {"id":"derechos","title":"Infancia, adolescencia y derechos","fields":[
      {"id":"derechos_revisados","type":"checkbox","label":"Derechos identificados","required":true,"options":[{"label":"Educación","value":"educacion"},{"label":"Identidad","value":"identidad"},{"label":"Protección","value":"proteccion"},{"label":"Recreación","value":"recreacion"},{"label":"Opinión y participación","value":"opinion"},{"label":"Salud","value":"salud"}]},
      {"id":"situacion_vulneracion","type":"longtext","label":"Situación que puede vulnerar estos derechos","required":true},
      {"id":"accion_proteccion","type":"longtext","label":"Acción familiar o comunitaria para protegerlos","required":true},
      {"id":"derecho_prioritario","type":"longtext","label":"Derecho que considera más importante proteger desde su rol y por qué","required":true}
    ]},
    {"id":"bullying","title":"Stop al bullying y ciberacoso","fields":[
      {"id":"conductas_bullying","type":"checkbox","label":"Conductas reconocidas como acoso o ciberacoso","required":true,"options":[{"label":"Burlas reiteradas","value":"burlas"},{"label":"Exclusión intencional","value":"exclusion"},{"label":"Amenazas o golpes","value":"amenazas"},{"label":"Memes o mensajes ofensivos en redes","value":"ciberacoso"},{"label":"Difusión de información privada","value":"privacidad"}]},
      {"id":"ruta_ayuda","type":"longtext","label":"Ruta de protección o persona a quien pedir ayuda","required":true},
      {"id":"compromiso_comunidad","type":"longtext","label":"Acción para que la comunidad sea un espacio libre de acoso","required":true}
    ]},
    {"id":"evidencia","title":"Evidencia y cierre","fields":[
      {"id":"foto","type":"photo","label":"Evidencia fotográfica del taller","required":true},
      {"id":"firma","type":"signature","label":"Firma de la persona participante","required":true},
      {"id":"gps","type":"gps","label":"Ubicación GPS del taller","required":true}
    ]}
  ]$json$,$json$[]$json$,'published',1,1
),
(
  'form_ex_post_bolivar','gov-bolivar-2026','Evaluación de impacto Ex-Post','Evaluación de impacto Ex-Post',
  'Medición final de cambios percibidos después de los tres momentos.','ex_post',
  $json$[
    {"id":"evaluacion","title":"Cambios percibidos","fields":[
      {"id":"fecha","type":"date","label":"Fecha de evaluación","required":true},
      {"id":"municipio","type":"municipality","label":"Municipio","required":true},
      {"id":"documento_familia","type":"text","label":"Documento de la persona participante","required":true},
      {"id":"impacto_positivo","type":"radio","label":"¿El proceso produjo un impacto positivo en la familia?","required":true,"options":[{"label":"Sí","value":"si"},{"label":"Parcialmente","value":"parcial"},{"label":"No","value":"no"}]},
      {"id":"cambios_observados","type":"longtext","label":"Cambios observados en buen trato, hábitos, seguridad, responsabilidades y protección de derechos","required":true},
      {"id":"practicas_sostenibles","type":"longtext","label":"Prácticas que la familia mantendrá","required":true},
      {"id":"recomendaciones","type":"longtext","label":"Recomendaciones o necesidades de seguimiento","required":false}
    ]},
    {"id":"cierre","title":"Cierre","fields":[
      {"id":"firma","type":"signature","label":"Firma de la persona participante","required":true},
      {"id":"gps","type":"gps","label":"Ubicación GPS","required":true}
    ]}
  ]$json$,$json$[]$json$,'published',1,1
)
on conflict (id) do update set
  entity_id=excluded.entity_id,name=excluded.name,title=excluded.title,description=excluded.description,
  type=excluded.type,definition=excluded.definition,status=excluded.status,version=excluded.version,
  v=excluded.v,updated_at=now();
