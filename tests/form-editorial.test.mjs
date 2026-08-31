import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = 'supabase/migrations/202608310011_form_editorial_workflow.sql'

test('el flujo editorial mantiene un único candidato activo separado del formulario vigente', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  assert.match(sql, /create table if not exists public\.form_change_requests/i)
  assert.match(sql, /create unique index if not exists form_change_requests_one_active_idx[^;]+where status in \('draft','in_review','changes_requested','approved'\)/is)
  assert.match(sql, /case when target_form\.status = 'published' then target_form\.version else 0 end/i)
  assert.match(sql, /if target_form\.status = 'draft' then\s+update public\.forms/is)
})

test('publicar exige aprobación y detecta cambios concurrentes de la versión base', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  assert.match(sql, /p_target_status = 'published'[\s\S]+previous_status <> 'approved'/i)
  assert.match(sql, /target_form\.version <> target_change\.base_version/i)
  assert.match(sql, /raise exception 'FORM_BASE_VERSION_CHANGED'/i)
  assert.match(sql, /set status = 'published', published_by = actor_id, published_at = now\(\)/i)
})

test('la revisión aplica segregación de funciones y exige concepto para devolver cambios', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  assert.match(sql, /target_change\.submitted_by = actor_id[\s\S]+FORM_REVIEWER_MUST_DIFFER/i)
  assert.match(sql, /p_target_status = 'changes_requested'[\s\S]+char_length\(btrim\(coalesce\(p_comment, ''\)\)\) < 5/i)
  assert.match(sql, /reviewed_by = actor_id,[\s\S]+review_notes =/i)
  assert.match(sql, /insert into public\.form_editorial_events/i)
})

test('el acceso directo no puede mutar formularios y el archivado conserva el historial', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  assert.match(sql, /revoke insert, update, delete on public\.forms from public, anon, authenticated/i)
  assert.match(sql, /create or replace function public\.retire_form/i)
  assert.match(sql, /update public\.form_assignments\s+set status = 'inactive'/i)
  assert.match(sql, /update public\.form_versions\s+set status = 'archived'/i)
  assert.doesNotMatch(sql, /delete from public\.(forms|form_versions|form_responses)/i)
})

test('la interfaz guarda por RPC, no borra formularios y solo asigna versiones publicadas', async () => {
  const [builder, list, backend] = await Promise.all([
    readFile('src/pages/coordinator/FormBuilderPage.tsx', 'utf8'),
    readFile('src/pages/shared/FormsListPage.tsx', 'utf8'),
    readFile('src/lib/backend.ts', 'utf8'),
  ])

  assert.match(builder, /formEditorialOperations\.saveDraft/)
  assert.match(builder, /handleEditorialTransition\('published'\)/)
  assert.match(builder, /FORM_REVIEWER_MUST_DIFFER/)
  assert.doesNotMatch(builder, /createDocument\([^)]*COLLECTION_IDS\.FORMS/s)
  assert.doesNotMatch(list, /deleteDocument\([^)]*COLLECTION_IDS\.FORMS/s)
  assert.match(list, /disabled=\{form\.status !== 'published'\}/)
  assert.match(list, /formEditorialOperations\.retire/)
  assert.match(backend, /supabase\.rpc\('transition_form_change'/)
})
