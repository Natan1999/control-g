import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { runSupabaseSql, sqlJson } from './lib/supabase-sql.mjs'
import { loadDemoFixture } from './lib/demo-fixture.mjs'

const fixture = await loadDemoFixture(`test-${randomUUID().slice(0,8)}`)
const migration = await readFile('supabase/migrations/202609090001_entity_provisioning.sql','utf8')
const request = randomUUID()
const result = await runSupabaseSql(`begin;
${migration}
do $verify$
declare a uuid; result jsonb; again jsonb; eid text; user_count bigint;
begin
  select user_id into a from public.user_profiles where email='admin@drandigital.com' and role='admin' and status='active';
  if a is null then raise exception 'No se encontró el superadministrador activo.'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.provision_entity('${request}',${sqlJson(fixture.entity)},${sqlJson(fixture.accounts)},${sqlJson(fixture.bundle)});
    raise exception 'SECURITY: anonymous caller accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',a::text,true);
  result := public.provision_entity('${request}',${sqlJson(fixture.entity)},${sqlJson(fixture.accounts)},${sqlJson(fixture.bundle)});
  eid := result->>'entity_id';
  if (select count(*) from public.user_profiles where entity_id=eid) <> 5 or (select count(*) from public.form_responses where entity_id=eid) <> 240 or (select count(*) from public.map_layers where entity_id=eid) <> 3 or (select count(*) from public.form_versions where entity_id=eid) <> 2 then raise exception 'Conteos de provisión incorrectos.'; end if;
  if (select count(*) from public.form_assignments where entity_id=eid) <> 4 then raise exception 'Asignaciones incorrectas.'; end if;
  again := public.provision_entity('${request}',${sqlJson(fixture.entity)},${sqlJson(fixture.accounts)},${sqlJson(fixture.bundle)});
  if result <> again then raise exception 'Idempotencia incorrecta.'; end if;
  -- An ordinary LATAM municipality must work without a synthetic data package.
  again := public.provision_entity('${randomUUID()}',${sqlJson({...fixture.entity,is_demo:false,name:'Alcaldía de prueba México',country_code:'MX',department:'Yucatán',timezone:'America/Mexico_City',currency_code:'MXN',locale:'es-MX',contract_number:`MX-${request}`,territories:[{id:'',name:'Zona de operación'}]})},${sqlJson([{...fixture.accounts[0],email:`mx-${request}@example.invalid`}])},null);
  if not exists(select 1 from public.entities where id=again->>'entity_id' and country_code='MX' and currency_code='MXN') or exists(select 1 from public.form_responses where entity_id=again->>'entity_id') then raise exception 'Error creando entidad LATAM sin datos demo.'; end if;
  select count(*) into user_count from auth.users;
  begin
    perform public.provision_entity('${randomUUID()}',${sqlJson({...fixture.entity,contract_number:`ERROR-${request}`})},${sqlJson(fixture.accounts)},${sqlJson(fixture.bundle)});
    raise exception 'Duplicate accounts accepted';
  exception when unique_violation then null; end;
  if (select count(*) from auth.users) <> user_count or exists(select 1 from public.entities where contract_number='ERROR-${request}') then raise exception 'La transacción dejó residuos.'; end if;
  -- Real role policies: anonymous cannot read; a field user sees only own responses.
  perform set_config('request.jwt.claim.sub',(result->'accounts'->2->>'id'),true);
  begin
    perform public.provision_entity('${randomUUID()}',${sqlJson(fixture.entity)},${sqlJson(fixture.accounts)},null);
    raise exception 'SECURITY: field caller accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('control_g.test_entity',eid,true);
end;
$verify$;
set local role authenticated;
do $rls$
begin
  if (select count(*) from public.form_responses where entity_id=current_setting('control_g.test_entity')) <> 80 then raise exception 'RLS: el profesional no ve exactamente sus 80 respuestas.'; end if;
  if exists(select 1 from public.form_responses where entity_id<>current_setting('control_g.test_entity')) then raise exception 'RLS: acceso a otra entidad.'; end if;
end;
$rls$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $anon$
begin
  begin
    if exists(select 1 from public.form_responses) then raise exception 'RLS: hay respuestas públicas.'; end if;
  exception when insufficient_privilege then null; end;
end;
$anon$;
reset role;
rollback;
select 'provisioning, snapshots, assignments, idempotency, rollback and role checks passed' as verification;`)
console.log(JSON.stringify(result))
