// Test-only transport: no credentials, calls to providers, answers or storage.
export async function loadAiProviders() { return ['gemini', 'openai'] }
export function questionnaireContext(form) { return JSON.stringify({ title: form.title, pages: form.pages }) }
export async function generateFormDraft(request) {
  if (request.provider === 'openai') throw new Error('Prueba: cuota del proveedor agotada. El borrador permanece intacto.')
  return { provider: 'gemini', model: 'fixture-only', draft: {
    title: 'Acceso a servicios públicos · Cartagena', description: 'Propuesta sintética para revisar el flujo, no un resultado de producción.', warnings: ['Validar preguntas y realizar un piloto antes de publicar.'],
    pages: [{ id: 'qa-page', title: 'Servicios del hogar', fields: [
      { id: 'qa-water', type: 'radio', label: '¿Cuál es la principal fuente de agua del hogar?', required: true, options: [{ value: 'network', label: 'Acueducto' }, { value: 'other', label: 'Otra fuente' }] },
      { id: 'qa-frequency', type: 'number', label: '¿Cuántos días a la semana recibe agua?', required: false },
      { id: 'qa-notes', type: 'longtext', label: '¿Qué mejoras considera prioritarias?', required: false },
    ] }],
  } }
}
