import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { runSupabaseSql, sqlJson } from './lib/supabase-sql.mjs'
import { loadDemoFixture } from './lib/demo-fixture.mjs'

// Credentials stay in an ignored, owner-readable file. Reuse the same request on retry.
const path = 'tmp/villa-esperanza-demo-access.json'
await mkdir('tmp', { recursive: true, mode: 0o700 })
let access
try { access = JSON.parse(await readFile(path, 'utf8')) }
catch (error) {
  if (error.code !== 'ENOENT') throw error
  const fixture = await loadDemoFixture('villa-esperanza')
  access = { requestId: randomUUID(), entity: fixture.entity, accounts: fixture.accounts }
  await writeFile(path, JSON.stringify(access, null, 2), { mode: 0o600, flag: 'wx' })
}
if (!/^[a-f0-9-]{36}$/.test(access.requestId)) throw new Error('Invalid request ID')
const { bundle } = await loadDemoFixture('villa-esperanza')
await runSupabaseSql(`begin;
do $provision$
declare actor uuid;
begin
  select user_id into actor from public.user_profiles where email='admin@drandigital.com' and role='admin' and status='active';
  if actor is null then raise exception 'No active superadmin'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform public.provision_entity('${access.requestId}',${sqlJson(access.entity)},${sqlJson(access.accounts)},${sqlJson(bundle)});
end;
$provision$;
commit;`)
const result = await runSupabaseSql(`select result from public.entity_provisioning_requests where request_id='${access.requestId}'`,true)
if (!result[0]?.result?.entity_id) throw new Error('Creation could not be confirmed; keep credentials and retry safely.')
access.result = result[0].result
await writeFile(path, JSON.stringify(access,null,2), { mode: 0o600 })
console.log(JSON.stringify({entityId: access.result.entity_id, responses: access.result.responses, credentialsFile: path, accounts:access.accounts.map(({email,role})=>({email,role}))},null,2))
