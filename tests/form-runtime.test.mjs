import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function importTypeScriptModule(path) {
  const source = await readFile(path, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

const runtime = await importTypeScriptModule('src/lib/form-runtime.ts')

const field = (id, type = 'text', extra = {}) => ({ id, type, label: id, required: false, ...extra })

test('el motor offline conserva cero y falso como respuestas válidas', () => {
  assert.equal(runtime.isEmptyFormValue(0), false)
  assert.equal(runtime.isEmptyFormValue(false), false)
  assert.equal(runtime.isEmptyFormValue('  '), true)
  assert.equal(runtime.validateFieldValue(field('cantidad', 'number', { required: true }), 0), null)
})

test('las reglas condicionales cubren listas, texto, números y vacíos', () => {
  const answers = { tags: ['rural', 'priorizado'], note: 'zona rural dispersa', score: 12, empty: '' }
  assert.equal(runtime.isFieldVisible(field('a', 'text', { visibilityLogic: { fieldId: 'tags', operator: 'contains', value: 'rural' } }), answers), true)
  assert.equal(runtime.isFieldVisible(field('b', 'text', { visibilityLogic: { fieldId: 'note', operator: 'not_contains', value: 'urbana' } }), answers), true)
  assert.equal(runtime.isFieldVisible(field('c', 'text', { visibilityLogic: { fieldId: 'score', operator: '>=', value: '10' } }), answers), true)
  assert.equal(runtime.isFieldVisible(field('d', 'text', { visibilityLogic: { fieldId: 'empty', operator: 'is_empty' } }), answers), true)
})

test('las validaciones avanzadas funcionan sin depender de la red', () => {
  const age = field('edad', 'number', { validationRules: { min: 18, max: 90 } })
  const document = field('documento', 'text', { validationRules: { pattern: '^[0-9]{6,10}$', message: 'Documento inválido' } })
  assert.equal(runtime.validateFieldValue(age, 17), 'El valor mínimo es 18')
  assert.equal(runtime.validateFieldValue(age, 45), null)
  assert.equal(runtime.validateFieldValue(document, 'ABC'), 'Documento inválido')
  assert.equal(runtime.validateFieldValue(document, '12345678'), null)
})

test('los cálculos usan precedencia segura y no ejecutan código', () => {
  const total = field('total', 'calculation', { calculation: '({{ingreso}} + {{bono}}) * 0.2' })
  assert.equal(runtime.calculateFieldValue(total, { ingreso: 1000, bono: 500 }), 300)
  assert.equal(runtime.calculateFieldValue(total, { ingreso: 1000 }), null)
  assert.equal(runtime.calculateFieldValue(field('bad', 'calculation', { calculation: 'window.alert(1)' }), {}), null)
})

test('al enviar se eliminan respuestas obsoletas de campos ocultos', () => {
  const pages = [{
    id: 'p1',
    title: 'Página 1',
    fields: [
      field('aplica', 'radio', { options: [{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }] }),
      field('detalle', 'text', { visibilityLogic: { fieldId: 'aplica', operator: '==', value: 'si' } }),
    ],
  }]
  assert.deepEqual(runtime.sanitizeVisibleAnswers(pages, { aplica: 'no', detalle: 'respuesta anterior', _metadata: { offline: true } }), {
    aplica: 'no',
    _metadata: { offline: true },
  })
})

test('la visibilidad se resuelve en cascada y una rama oculta no activa dependientes', () => {
  const pages = [{
    id: 'p1', title: 'P1', fields: [
      field('aplica', 'radio'),
      field('detalle', 'radio', { visibilityLogic: { fieldId: 'aplica', operator: '==', value: 'si' } }),
      field('ampliacion', 'text', { visibilityLogic: { fieldId: 'detalle', operator: '==', value: 'si' } }),
      field('total', 'calculation', { calculation: '{{valor_oculto}} * 2' }),
      field('valor_oculto', 'number', { visibilityLogic: { fieldId: 'aplica', operator: '==', value: 'si' } }),
    ],
  }]
  const state = runtime.resolveFormRuntimeState(pages, { aplica: 'no', detalle: 'si', ampliacion: 'no debe salir', valor_oculto: 10 })
  assert.equal(state.visibleFieldIds.has('detalle'), false)
  assert.equal(state.visibleFieldIds.has('ampliacion'), false)
  assert.equal(state.answers.ampliacion, undefined)
})

test('la estimación offline aumenta con evidencia y clasifica el riesgo', () => {
  const light = runtime.estimateFormOfflineFootprint([{ id: 'p1', title: 'P1', fields: [field('nombre')] }])
  const media = runtime.estimateFormOfflineFootprint([{ id: 'p1', title: 'P1', fields: [field('foto', 'photo'), field('pdf', 'file', { maxFileSizeMb: 20 })] }])
  assert.ok(media.estimatedSubmissionBytes > light.estimatedSubmissionBytes)
  assert.equal(media.mediaFields, 2)
  assert.equal(media.risk, 'high')
})

test('las matrices exigen todas sus filas y la moneda conserva cero', () => {
  const matrix = field('condiciones', 'matrix', {
    required: true,
    matrixRows: [{ label: 'Agua', value: 'agua' }, { label: 'Energía', value: 'energia' }],
    options: [{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }],
  })
  assert.equal(runtime.validateFieldValue(matrix, {}), 'Esta matriz es obligatoria')
  assert.equal(runtime.validateFieldValue(matrix, { agua: 'si' }), 'Responde todas las filas de la matriz (1/2)')
  assert.equal(runtime.validateFieldValue(matrix, { agua: 'si', energia: 'no' }), null)
  assert.equal(runtime.validateFieldValue(field('ingreso', 'currency', { required: true }), 0), null)
})

test('el audio se contabiliza como evidencia offline', () => {
  const estimate = runtime.estimateFormOfflineFootprint([{ id: 'p1', title: 'P1', fields: [field('voz', 'audio', { maxFileSizeMb: 8 })] }])
  assert.equal(estimate.mediaFields, 1)
  assert.ok(estimate.estimatedSubmissionBytes >= 8_000_000)
})

test('el constructor y el capturador comparten el mismo renderizador real', async () => {
  const [builder, renderer, responder, sync, inbox] = await Promise.all([
    readFile('src/pages/coordinator/FormBuilderPage.tsx', 'utf8'),
    readFile('src/components/forms/FormRenderer.tsx', 'utf8'),
    readFile('src/pages/professional/FormResponderPage.tsx', 'utf8'),
    readFile('src/lib/sync-engine.ts', 'utf8'),
    readFile('src/pages/shared/FormResponsesPage.tsx', 'utf8'),
  ])
  assert.match(builder, /<FormRenderer/)
  assert.match(builder, /mode="simulation"/)
  assert.match(builder, /buildFormPrivacyChecklist/)
  assert.match(builder, /estimateFormOfflineFootprint/)
  assert.match(renderer, /sanitizeVisibleAnswers/)
  assert.match(renderer, /mode === 'simulation'/)
  assert.match(responder, /isDocument \? BUCKET_IDS\.EXPORTS/)
  assert.match(responder, /isAudio \? BUCKET_IDS\.FIELD_AUDIO/)
  assert.match(sync, /media\.bucketId === BUCKET_IDS\.EXPORTS/)
  assert.match(sync, /media\.bucketId === BUCKET_IDS\.FIELD_AUDIO/)
  assert.match(sync, /'document'/)
  assert.match(inbox, /field\.type === 'file' \? BUCKET_IDS\.EXPORTS/)
  assert.match(inbox, /field\.type === 'audio' \? BUCKET_IDS\.FIELD_AUDIO/)
})
