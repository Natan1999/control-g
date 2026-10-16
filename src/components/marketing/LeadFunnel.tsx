import { useMemo, useState } from 'react'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { trackMarketingEvent, whatsappUrl } from '@/lib/marketing'
import countries from '@/config/country-landing-profiles.json'

const ENTITY_TYPES = [
  'Alcaldía',
  'Gobernación',
  'Entidad nacional',
  'Operador o contratista',
  'ONG o fundación',
  'Empresa',
  'Corporación o asociación',
  'Universidad o centro de investigación',
]

const PROJECT_TYPES = [
  'Caracterización social',
  'Encuestas o censos',
  'Visitas técnicas',
  'Seguimiento de beneficiarios',
  'Inventario territorial',
  'Otro levantamiento de información',
]

export function LeadFunnel({ source = 'seo' }: { source?: string }) {
  const [entity, setEntity] = useState(ENTITY_TYPES[0])
  const [project, setProject] = useState(PROJECT_TYPES[0])
  const [team, setTeam] = useState('1 a 10 profesionales')
  const [country, setCountry] = useState('Colombia')
  const [volume, setVolume] = useState('Hasta 1.000 encuestas')

  const message = useMemo(
    () => [
      'Hola, quiero solicitar una demostración de Control G.',
      '',
      `Tipo de organización: ${entity}`,
      `Necesidad: ${project}`,
      `Equipo estimado: ${team}`,
      `País del operativo: ${country}`,
      `Volumen estimado: ${volume}`,
    ].join('\n'),
    [entity, project, team, country, volume],
  )

  return (
    <div id="solicitar-demo" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
          <MessageCircle size={22} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 sm:text-2xl">Solicite una demostración enfocada en su proyecto</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">Cuéntenos el alcance del operativo y abra una conversación con el equipo. Sin enviar datos de las personas encuestadas.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-bold text-slate-700">
          Tipo de organización
          <select
            value={entity}
            onChange={event => setEntity(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/20"
          >
            {ENTITY_TYPES.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          País del operativo
          <select value={country} onChange={event => setCountry(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/20">
            {[...countries].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(item => <option key={item.code}>{item.name}</option>)}
            <option>Otro país</option>
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Encuestas estimadas
          <select value={volume} onChange={event => setVolume(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/20">
            {['Hasta 1.000 encuestas', '1.001 a 10.000 encuestas', 'Más de 10.000 encuestas', 'Necesito definir el alcance'].map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Tipo de proyecto
          <select
            value={project}
            onChange={event => setProject(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/20"
          >
            {PROJECT_TYPES.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Tamaño del equipo
          <select
            value={team}
            onChange={event => setTeam(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-[#1B3A4B] focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/20"
          >
            {['1 a 10 profesionales', '11 a 50 profesionales', '51 a 200 profesionales', 'Más de 200 profesionales'].map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <a
        href={whatsappUrl(message, `embudo-${source}`)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackMarketingEvent('whatsapp_funnel_complete', { source, entity, project, team, country, volume })}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#146B46] px-6 text-center font-black text-white shadow-lg shadow-green-600/20 transition hover:bg-[#0e5536] focus:outline-none focus:ring-4 focus:ring-green-200"
      >
        Recibir demostración por WhatsApp
        <ArrowRight size={18} aria-hidden="true" />
      </a>
      <p className="mt-3 text-center text-xs leading-5 text-slate-500">Se abrirá WhatsApp con este resumen y la página de origen; usted decide si envía el mensaje. Atención comercial: +57 300 901 0300.</p>
    </div>
  )
}
