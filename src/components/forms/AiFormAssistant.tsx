import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Sparkles, Wifi } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LATAM_COUNTRIES } from '@/config/countries'
import type { FormDefinition } from '@/types'
import { generateFormDraft, loadAiProviders, questionnaireContext, type AiFormMode, type AiFormResult, type AiProvider } from '@/lib/form-ai'
import FormRenderer from './FormRenderer'
import type { AiFormDraft } from '../../../shared/ai-form.mjs'

interface Props {
  entityId: string
  countryCode: string
  currentForm: Partial<FormDefinition>
  onClose: () => void
  onApply: (draft: AiFormDraft, strategy: 'replace' | 'append') => void
}
const PROVIDERS = { openai: 'OpenAI · GPT', gemini: 'Google · Gemini' }
const CONTROL = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#087E8B] disabled:opacity-50'
const EXAMPLES = [
  ['Caracterización en Bolívar', 'Diseña una caracterización de hogares de un barrio de Cartagena, Bolívar, Colombia, para conocer acceso a agua, saneamiento, educación y necesidades comunitarias. No solicites nombres, documentos, teléfonos ni datos de salud. Organiza preguntas breves y neutrales por secciones.'],
  ['Satisfacción de clientes', 'Prepara una encuesta anónima de satisfacción para clientes de una empresa de servicios en Colombia. Incluye frecuencia de uso, experiencia, tiempos de atención, relación calidad-precio, recomendación y sugerencias, con escalas equilibradas.'],
  ['Programa de una ONG', 'Diseña una encuesta de línea base para una ONG que acompaña formación laboral de jóvenes adultos en Latinoamérica. Incluye educación, habilidades, acceso a internet, disponibilidad e intereses de formación. No solicites datos identificativos ni supongas que el programa ya generó impacto.'],
] as const

export default function AiFormAssistant({ entityId, countryCode, currentForm, onClose, onApply }: Props) {
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [provider, setProvider] = useState<AiProvider>('openai')
  const [mode, setMode] = useState<AiFormMode>('create')
  const [country, setCountry] = useState(countryCode)
  const [language, setLanguage] = useState<'es' | 'pt' | 'en'>('es')
  const [count, setCount] = useState(12)
  const [prompt, setPrompt] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AiFormResult | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [strategy, setStrategy] = useState<'replace' | 'append'>('append')
  const [reviewed, setReviewed] = useState(false)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadAiProviders(controller.signal).then(available => {
      setProviders(available)
      if (available.length) setProvider(available[0])
    }).catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'No fue posible cargar los proveedores.') })
      .finally(() => { if (!controller.signal.aborted) setLoadingProviders(false) })
    return () => { controller.abort(); requestRef.current?.abort() }
  }, [])

  const generate = async () => {
    if (busy || !privacy || prompt.trim().length < 20 || !entityId) return
    const controller = new AbortController()
    requestRef.current = controller
    setBusy(true); setError(''); setReviewed(false)
    try {
      const context = mode === 'revise' ? questionnaireContext(result?.draft || currentForm) : undefined
      const next = await generateFormDraft({ entityId, provider, mode, prompt: prompt.trim(), countryCode: country, language, questionCount: count, currentDraft: context, privacyConfirmed: true }, controller.signal)
      setResult(next); setSimulating(false)
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'No fue posible generar el borrador.')
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }

  const preview: FormDefinition | null = result ? {
    ...result.draft, id: 'ai-preview', entityId, type: currentForm.type || 'ex_ante', status: 'draft', version: 1, createdAt: '', updatedAt: '',
  } : null

  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="max-h-[94dvh] w-[calc(100%-1rem)] max-w-6xl gap-0 overflow-y-auto rounded-2xl bg-[#F4F8FA] p-0 text-[#132B36]">
      <DialogHeader className="border-b border-[#C8DCE5] bg-white px-5 py-6 text-left sm:px-7">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#087E8B]"><Sparkles size={16} aria-hidden="true" /> Asistente de instrumentos</p>
        <DialogTitle className="mt-2 text-2xl font-black">De una idea a un formulario revisable.</DialogTitle>
        <DialogDescription className="mt-2 max-w-3xl text-sm leading-6">Crea desde un objetivo, convierte un cuestionario pegado o pide cambios. La IA entrega un borrador: tú decides qué incorporar y cuándo enviarlo a revisión.</DialogDescription>
      </DialogHeader>
      <div className="grid min-w-0 gap-6 p-4 sm:p-7 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <section aria-label="Instrucciones para la IA" className="min-w-0 space-y-4">
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-600"><Wifi size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Generar requiere internet. Diligenciar formularios publicados, asignados y descargados sigue funcionando offline.</p>
          {!entityId ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Selecciona primero la entidad del formulario.</p> : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">Proveedor<select className={CONTROL} value={provider} disabled={busy || loadingProviders || !providers.length} onChange={event => setProvider(event.target.value as AiProvider)}>{providers.map(value => <option key={value} value={value}>{PROVIDERS[value]}</option>)}</select></label>
            <label className="text-sm font-bold">Qué necesitas<select className={CONTROL} value={mode} disabled={busy} onChange={event => setMode(event.target.value as AiFormMode)}><option value="create">Crear desde una idea</option><option value="import">Convertir texto pegado</option><option value="revise">Mejorar o traducir el borrador</option></select></label>
            <label className="text-sm font-bold">País<select className={CONTROL} value={country} disabled={busy} onChange={event => setCountry(event.target.value)}>{LATAM_COUNTRIES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            <label className="text-sm font-bold">Idioma<select className={CONTROL} value={language} disabled={busy} onChange={event => setLanguage(event.target.value as 'es' | 'pt' | 'en')}><option value="es">Español</option><option value="pt">Português</option><option value="en">English</option></select></label>
          </div>
          <label className="block text-sm font-bold">Preguntas aproximadas<input className={CONTROL} type="number" min={3} max={40} value={count} disabled={busy} onChange={event => setCount(Number(event.target.value))} /></label>
          <label className="block text-sm font-bold">{mode === 'import' ? 'Pega las preguntas del cuestionario' : mode === 'revise' ? 'Explica qué deseas mejorar o traducir' : 'Describe objetivo, población y temas'}<textarea className={`${CONTROL} min-h-44 resize-y leading-6`} maxLength={8000} value={prompt} disabled={busy} onChange={event => setPrompt(event.target.value)} placeholder="Ejemplo: caracterizar el acceso a servicios públicos de hogares de Cartagena, con preguntas anónimas, opciones claras y una sección de observaciones…" /><span className="mt-1 block text-right text-xs font-normal text-slate-500">{prompt.length}/8.000 caracteres</span></label>
          <div className="flex flex-wrap gap-2">{EXAMPLES.map(([title, value]) => <button key={title} type="button" disabled={busy} onClick={() => { setPrompt(value); setMode('create') }} className="min-h-10 rounded-full border border-[#C8DCE5] bg-white px-3 text-xs font-semibold text-[#123B50]">{title}</button>)}</div>
          <label className="flex items-start gap-3 rounded-xl border border-[#C8DCE5] bg-white p-4 text-xs leading-5"><input type="checkbox" checked={privacy} disabled={busy} onChange={event => setPrivacy(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>Confirmo que no incluí respuestas, datos personales reales ni información confidencial. Autorizo enviar este texto y, al mejorar, la definición del borrador al proveedor seleccionado.</span></label>
          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p> : null}
          {!loadingProviders && !providers.length && !error ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ningún proveedor está conectado. El administrador debe configurar la conexión segura en el servidor.</p> : null}
          <button type="button" onClick={() => void generate()} disabled={busy || loadingProviders || !providers.length || !entityId || !privacy || prompt.trim().length < 20 || count < 3 || count > 40} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123B50] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy || loadingProviders ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}{busy ? 'Preparando el instrumento…' : loadingProviders ? 'Comprobando conexión…' : result ? 'Generar nueva propuesta' : 'Generar borrador con IA'}</button>
          <p aria-live="polite" className="text-xs leading-5 text-slate-500">{busy ? 'Tu formulario original permanece intacto. La generación puede tardar hasta 45 segundos.' : 'El uso consume la cuota del proveedor. No hay publicaciones ni reintentos automáticos.'}</p>
        </section>
        <section aria-label="Vista previa del borrador de IA" className="min-w-0 rounded-2xl border border-[#C8DCE5] bg-white p-4 sm:p-5">
          {!result ? <div className="flex min-h-80 flex-col justify-center p-4"><span className="text-xs font-bold uppercase tracking-widest text-[#087E8B]">Vista previa</span><h3 className="mt-3 text-2xl font-black">Primero el método. Después, el campo.</h3><p className="mt-3 text-sm leading-7 text-slate-600">Aquí verás secciones, preguntas y opciones. Podrás probar el formulario, pedir cambios y llevarlo al constructor visual para editar cada detalle. La captura offline no depende de la IA.</p></div> : <>
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-[#087E8B]">Borrador · {PROVIDERS[result.provider]}</p><h3 className="mt-2 break-words text-xl font-black">{result.draft.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{result.draft.description}</p></div><button type="button" onClick={() => setSimulating(value => !value)} className="min-h-11 rounded-xl border border-[#C8DCE5] px-3 text-xs font-bold">{simulating ? 'Ver estructura' : 'Probar formulario'}</button></div>
            <div className="my-5 max-h-[55dvh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
              {simulating && preview ? <FormRenderer key={result.draft.pages[0].id} definition={preview} mode="simulation" embedded onSubmit={() => setSimulating(false)} /> : <div className="space-y-5">{result.draft.pages.map(page => <section key={page.id}><h4 className="font-bold text-[#123B50]">{page.title}</h4><ol className="mt-3 space-y-4">{page.fields.map((field, index) => <li key={field.id} className="rounded-xl bg-white p-3 text-sm"><p className="font-semibold">{index + 1}. {field.label}</p><p className="mt-1 text-xs text-slate-500">{field.type}{field.required ? ' · Obligatoria' : ' · Opcional'}{field.sensitive ? ' · Revisar privacidad' : ''}</p>{field.description ? <p className="mt-2 text-xs leading-5">{field.description}</p> : null}{field.options?.length ? <ul className="mt-2 list-inside list-disc text-xs leading-6 text-slate-600">{field.options.map(option => <li key={option.value}>{option.label}</li>)}</ul> : null}{field.subFields?.length ? <p className="mt-2 text-xs leading-6">Grupo: {field.subFields.map(item => item.label).join(' · ')}</p> : null}</li>)}</ol></section>)}</div>}
            </div>
            <ul className="space-y-2 text-xs leading-5 text-amber-900">{result.draft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            <label className="mt-5 block text-sm font-bold">Al incorporar<select className={CONTROL} value={strategy} disabled={busy} onChange={event => setStrategy(event.target.value as 'replace' | 'append')}><option value="append">Agregar secciones al formulario actual</option><option value="replace">Reemplazar el instrumento del editor</option></select></label>
            <label className="mt-4 flex items-start gap-3 text-xs leading-5"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>Revisé la propuesta. Entiendo que debo guardar el borrador y completar la aprobación antes de publicarlo y asignarlo.</span></label>
            <button type="button" disabled={!reviewed || busy} onClick={() => onApply(result.draft, strategy)} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#146B46] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Check size={18} aria-hidden="true" /> Incorporar al constructor</button>
          </>}
        </section>
      </div>
    </DialogContent>
  </Dialog>
}
