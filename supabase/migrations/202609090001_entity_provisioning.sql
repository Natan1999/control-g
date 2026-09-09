-- Atomic tenant onboarding. No service credential is exposed to the frontend.
create table if not exists public.entity_provisioning_requests (
  request_id uuid primary key,
  actor_id uuid not null references auth.users(id),
  entity_id text not null references public.entities(id),
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.entity_provisioning_requests enable row level security;
revoke all on public.entity_provisioning_requests from public, anon, authenticated;

create or replace function public.provision_entity(
  p_request_id uuid, p_entity jsonb, p_accounts jsonb, p_demo jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  entity_key text := gen_random_uuid()::text;
  item jsonb; record jsonb; form jsonb; account_result jsonb;
  people jsonb := '{}'::jsonb; territories jsonb := '{}'::jsonb; forms_map jsonb := '{}'::jsonb;
  account_list jsonb := '[]'::jsonb; result_value jsonb;
  user_key uuid; territory_key text; form_key text; family_key text;
  profile public.country_profiles%rowtype;
  is_demo boolean := coalesce((p_entity->>'is_demo')::boolean, false);
  lat double precision; lng double precision; captured timestamptz;
  answers jsonb; response_status text; index_value integer := 0;
begin
  if actor is null or not exists (select 1 from public.user_profiles where user_id = actor and role = 'admin' and status = 'active') then
    raise exception 'Solo el superadministrador puede crear entidades.' using errcode = '42501';
  end if;
  if p_request_id is null then raise exception 'Falta el identificador de solicitud.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select result into result_value from public.entity_provisioning_requests where request_id = p_request_id and actor_id = actor;
  if found then return result_value; end if;
  if exists (select 1 from public.entity_provisioning_requests where request_id = p_request_id) then raise exception 'Solicitud no disponible.'; end if;
  if jsonb_typeof(p_entity) is distinct from 'object' or nullif(trim(p_entity->>'name'), '') is null
    or nullif(trim(p_entity->>'department'), '') is null or nullif(trim(p_entity->>'contract_number'), '') is null then
    raise exception 'Entidad, región y contrato son obligatorios.';
  end if;
  select * into profile from public.country_profiles where country_code = p_entity->>'country_code' and status = 'active' order by version desc limit 1;
  if not found then raise exception 'Activa el perfil del país desde el catálogo de países.'; end if;
  if (p_entity->>'period_start')::date is null or (p_entity->>'period_end')::date < (p_entity->>'period_start')::date then raise exception 'Periodo de operación inválido.'; end if;
  if not exists (select 1 from pg_timezone_names where name = coalesce(p_entity->>'timezone', profile.timezone)) then raise exception 'Zona horaria inválida.'; end if;
  if jsonb_typeof(p_accounts) is distinct from 'array' or jsonb_array_length(p_accounts) not between 1 and 25 then raise exception 'Se requiere un equipo de 1 a 25 usuarios.'; end if;
  if not exists (select 1 from jsonb_array_elements(p_accounts) a where a->>'role' = 'coordinator') then raise exception 'Se requiere un coordinador.'; end if;
  if exists (select 1 from jsonb_array_elements(p_accounts) a where coalesce(a->>'role','') not in ('coordinator','support','professional') or nullif(a->>'key','') is null) then raise exception 'Rol o identificador de equipo inválido.'; end if;
  if exists (select 1 from jsonb_array_elements(p_accounts) a where coalesce(a->>'email','') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or coalesce(length(a->>'password'),0) < 12 or nullif(trim(a->>'full_name'),'') is null) then raise exception 'Nombre, correo y contraseña segura son obligatorios.'; end if;
  if (select count(distinct a->>'key') from jsonb_array_elements(p_accounts) a) <> jsonb_array_length(p_accounts) then raise exception 'Identificadores del equipo duplicados.'; end if;
  if jsonb_typeof(p_entity->'territories') is distinct from 'array' or jsonb_array_length(p_entity->'territories') not between 1 and 500 then raise exception 'Agrega al menos un territorio de operación.'; end if;
  if p_demo is not null and not is_demo then raise exception 'Los datos ficticios solo se admiten en entidades marcadas como demo.'; end if;
  if is_demo and (p_demo is null or jsonb_typeof(p_demo->'records') is distinct from 'array' or jsonb_array_length(p_demo->'records') > 1000 or jsonb_typeof(p_demo->'forms') is distinct from 'array' or jsonb_array_length(p_demo->'forms') not between 1 and 20 or jsonb_typeof(p_demo->'layers') is distinct from 'array' or jsonb_array_length(p_demo->'layers') > 20) then raise exception 'Paquete de demostración inválido.'; end if;
  if pg_column_size(p_demo) > 6000000 then raise exception 'Paquete demasiado grande.'; end if;

  insert into public.entities (id, name, nit, contract_number, contract_object, operator_name, department,
    country_code, country_profile_id, locale, timezone, currency_code, default_map_center,
    map_privacy_mode, map_minimum_group_size, map_coverage_target, require_mfa_for_privileged,
    regional_settings, period_start, period_end, families_per_municipality, status, created_by)
  values (entity_key, trim(p_entity->>'name'), p_entity->>'nit', trim(p_entity->>'contract_number'), coalesce(p_entity->>'contract_object',''), coalesce(p_entity->>'operator_name',''), trim(p_entity->>'department'),
    profile.country_code, profile.id, coalesce(p_entity->>'locale', profile.locale), coalesce(p_entity->>'timezone', profile.timezone), coalesce(p_entity->>'currency_code', profile.currency_code), coalesce(p_entity->'default_map_center','{"latitude":0,"longitude":0}'::jsonb),
    coalesce(p_entity->>'map_privacy_mode','exact'), coalesce((p_entity->>'map_minimum_group_size')::integer,5), coalesce((p_entity->>'map_coverage_target')::integer,35), coalesce((p_entity->>'require_mfa_for_privileged')::boolean,true),
    coalesce(p_entity->'regional_settings','{}'::jsonb) || jsonb_build_object('is_demo',is_demo,'entity_kind',coalesce(p_entity->>'entity_kind','municipality'),'synthetic_data',is_demo),
    (p_entity->>'period_start')::date, (p_entity->>'period_end')::date, coalesce((p_entity->>'families_per_municipality')::integer,35), 'active', actor::text);

  for item in select value from jsonb_array_elements(p_entity->'territories') loop
    territory_key := gen_random_uuid()::text;
    if nullif(trim(item->>'name'),'') is null or territories ? (item->>'name') then raise exception 'Territorio vacío o duplicado.'; end if;
    insert into public.entity_municipalities(id,entity_id,municipality_name,department,country_code,families_target,dane_code,admin_level_2_code)
      values(territory_key,entity_key,trim(item->>'name'),p_entity->>'department',profile.country_code,coalesce((p_entity->>'families_per_municipality')::integer,35),nullif(item->>'id',''),nullif(item->>'id',''));
    territories := territories || jsonb_build_object(item->>'name',territory_key);
  end loop;
  for item in select value from jsonb_array_elements(p_accounts) loop
    account_result := public.admin_create_user(item->>'email',item->>'password',item->>'full_name',item->>'role',entity_key);
    user_key := (account_result->'user'->>'id')::uuid;
    people := people || jsonb_build_object(item->>'key',user_key);
    account_list := account_list || jsonb_build_array(jsonb_build_object('id',user_key,'key',item->>'key','email',lower(trim(item->>'email')),'role',item->>'role'));
    if item->>'role' = 'professional' then
      insert into public.professional_assignments(entity_id,professional_id,municipality_id)
        select entity_key,user_key,value from jsonb_each_text(territories);
    end if;
  end loop;

  if is_demo then
    for form in select value from jsonb_array_elements(p_demo->'forms') loop
      form_key := gen_random_uuid()::text;
      if jsonb_typeof(form->'pages') is distinct from 'array' or nullif(form->>'id','') is null or forms_map ? (form->>'id') then raise exception 'Formulario demo inválido.'; end if;
      insert into public.forms(id,entity_id,title,name,description,type,definition,pages_json,status)
        values(form_key,entity_key,form->>'title',form->>'title',form->>'description',form->>'type',(form->'pages')::text,(form->'pages')::text,'published');
      forms_map := forms_map || jsonb_build_object(form->>'id',form_key);
      for item in select value from jsonb_array_elements(form->'professional_keys') loop
        user_key := (people->>(item#>>'{}'))::uuid;
        if user_key is null then raise exception 'Profesional demo no encontrado.'; end if;
        insert into public.form_assignments(entity_id,form_id,professional_id,assigned_by,status)
          values(entity_key,form_key,user_key,actor,'active');
      end loop;
    end loop;
    for item in select value from jsonb_array_elements(p_demo->'layers') loop
      insert into public.map_layers(entity_id,name,description,layer_type,geojson,color,opacity,visible_default,status,source,created_by)
        values(entity_key,item->>'name',item->>'description',item->>'layerType',item->'geojson',item->>'color',(item->>'opacity')::numeric,true,'active','Demostración ficticia, no cartografía oficial',actor);
    end loop;
    for record in select value from jsonb_array_elements(p_demo->'records') loop
      index_value := index_value + 1;
      user_key := (people->>(record->>'professionalId'))::uuid;
      form_key := forms_map->>(record->>'formId');
      territory_key := territories->>(record->>'territory');
      if user_key is null or form_key is null or territory_key is null or not exists(select 1 from public.form_assignments where entity_id=entity_key and form_id=form_key and professional_id=user_key and status='active') then raise exception 'Respuesta demo fuera de asignación o territorio.'; end if;
      lat := (record->>'latitude')::double precision; lng := (record->>'longitude')::double precision;
      if lat is null or lng is null or not (lat between -90 and 90 and lng between -180 and 180) then raise exception 'Coordenadas demo inválidas.'; end if;
      captured := (record->>'capturedAt')::timestamptz;
      response_status := case when index_value % 7 = 0 then 'synced' else 'approved' end;
      answers := (record->'answers') || jsonb_build_object('_metadata',jsonb_build_object('synthetic',true,'lat',lat,'lng',lng,'capturedAt',captured));
      family_key := gen_random_uuid()::text;
      insert into public.families(id,entity_id,municipality_id,professional_id,first_name,first_lastname,full_name,id_number,age,zone,address,latitude,longitude,consent_given,overall_status,ex_ante_status,ex_ante_date)
        values(family_key,entity_key,territory_key,user_key,'Participante','Ficticio '||index_value,'Participante ficticio '||index_value,'DEMO-'||index_value,18+(index_value%11),record->>'territory','Ubicación ficticia de demostración',lat,lng,true,'in_progress','completed',captured::date);
      insert into public.form_responses(form_id,entity_id,family_id,professional_id,municipality_id,local_id,answers,answers_json,latitude,longitude,status,review_notes,reviewed_by,reviewed_at,captured_at,synced_at,form_version,geo_quality_status)
        values(form_key,entity_key,family_key,user_key,territory_key,entity_key||':demo:'||index_value,answers,answers::text,lat,lng,response_status,case when response_status='approved' then 'Revisión ficticia de demostración' end,case when response_status='approved' then actor end,case when response_status='approved' then now() end,captured,now(),1,'unknown');
    end loop;
  end if;
  result_value := jsonb_build_object('entity_id',entity_key,'is_demo',is_demo,'accounts',account_list,'responses',index_value);
  insert into public.entity_provisioning_requests(request_id,actor_id,entity_id,result) values(p_request_id,actor,entity_key,result_value);
  insert into public.audit_log(entity_id,user_id,action,table_name,record_id,metadata)
    values(entity_key,actor,'provision_entity','entities',entity_key,jsonb_build_object('is_demo',is_demo,'users',jsonb_array_length(account_list),'responses',index_value));
  return result_value;
end;
$$;
revoke all on function public.provision_entity(uuid,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.provision_entity(uuid,jsonb,jsonb,jsonb) to authenticated;
notify pgrst, 'reload schema';
