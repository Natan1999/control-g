import { useState } from 'react'
import {
  FileText, Users, MapPin, BarChart2, Globe, Activity,
  Download, Loader2,
} from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

type ActivityTypeOption = 'ex_ante' | 'encounter_1' | 'encounter_2' | 'encounter_3' | 'ex_post'

const ACTIVITY_LABELS: Record<ActivityTypeOption, string> = {
  ex_ante: 'Ex-Antes',
  encounter_1: 'Momento 1',
  encounter_2: 'Momento 2',
  encounter_3: 'Momento 3',
  ex_post: 'Ex-Post',
}

interface ReportCard {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  hasActivitySelector?: boolean
}

const REPORT_CARDS: ReportCard[] = [
  {
    id: 'by_professional',
    icon: <Users size={22} className="text-[#1B3A4B]" />,
    title: 'Informe por Profesional',
    description: 'Resumen de gestión + fichas individuales por familia para cada profesional.',
  },
  {
    id: 'by_municipality',
    icon: <MapPin size={22} className="text-[#3D7B9E]" />,
    title: 'Informe por Municipio',
    description: 'Resumen de avance por municipio con listado de familias registradas.',
  },
  {
    id: 'by_activity',
    icon: <Activity size={22} className="text-[#27AE60]" />,
    title: 'Informe por Actividad',
    description: 'Detalle por tipo de actividad: Ex-Antes, Momentos 1-3 y Ex-Post.',
    hasActivitySelector: true,
  },
  {
    id: 'consolidated',
    icon: <BarChart2 size={22} className="text-orange-600" />,
    title: 'Informe Consolidado',
    description: 'Vista global de todos los municipios y profesionales de la entidad.',
  },
  {
    id: 'population_impact',
    icon: <Globe size={22} className="text-purple-600" />,
    title: 'Informe de Impacto Poblacional',
    description: 'Estadísticas de enfoque diferencial: género, etnia, discapacidad y más.',
  },
]

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [generating, setGenerating] = useState<string | null>(null)
  const [activityType, setActivityType] = useState<ActivityTypeOption>('ex_ante')

  async function loadEntityName(): Promise<string> {
    if (!user?.entityId) return 'Entidad desconocida'
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [
        Query.equal('$id', user.entityId), Query.limit(1),
      ])
      return res.documents[0]?.name ?? 'Entidad'
    } catch {
      return 'Entidad'
    }
  }

  async function loadFamilies(): Promise<any[]> {
    if (!user?.entityId) return []
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        Query.equal('entity_id', user.entityId), Query.limit(500),
      ])
      return res.documents
    } catch {
      return []
    }
  }

  async function loadProfessionals(): Promise<any[]> {
    if (!user?.entityId) return []
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
        Query.equal('entity_id', user.entityId),
        Query.equal('role', 'professional'),
        Query.limit(100),
      ])
      return res.documents
    } catch {
      return []
    }
  }

  async function loadMunicipalities(): Promise<any[]> {
    if (!user?.entityId) return []
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
        Query.equal('entity_id', user.entityId), Query.limit(100),
      ])
      return res.documents
    } catch {
      return []
    }
  }

  function downloadBlob(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function formatDate() {
    return new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
  }

  function activityStatusLine(fam: any): string {
    return [
      `Ex-Antes: ${fam.ex_ante_status ?? 'pendiente'}`,
      `M1: ${fam.encounter_1_status ?? 'pendiente'}`,
      `M2: ${fam.encounter_2_status ?? 'pendiente'}`,
      `M3: ${fam.encounter_3_status ?? 'pendiente'}`,
      `Ex-Post: ${fam.ex_post_status ?? 'pendiente'}`,
    ].join(' | ')
  }

  async function generateReport(reportId: string) {
    setGenerating(reportId)
    try {
      const [entityName, families, professionals, municipalities] = await Promise.all([
        loadEntityName(),
        loadFamilies(),
        loadProfessionals(),
        loadMunicipalities(),
      ])

      const lines: string[] = []
      const hr = '─'.repeat(60)

      switch (reportId) {
        case 'by_professional': {
          lines.push('CONTROL G — INFORME POR PROFESIONAL')
          lines.push(hr)
          lines.push(`Entidad: ${entityName}`)
          lines.push(`Fecha de generación: ${formatDate()}`)
          lines.push(`Total familias: ${families.length}`)
          lines.push('')
          professionals.forEach(prof => {
            const profFamilies = families.filter(f =>
              f.professional_id === prof.$id || f.professional_id === prof.user_id
            )
            lines.push(hr)
            lines.push(`PROFESIONAL: ${prof.full_name}`)
            lines.push(`Total familias asignadas: ${profFamilies.length}`)
            lines.push('')
            if (profFamilies.length === 0) {
              lines.push('  Sin familias asignadas.')
            } else {
              profFamilies.forEach((f, i) => {
                const name = f.full_name || `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim()
                lines.push(`  ${i + 1}. ${name} | ${f.id_document_type} ${f.id_number}`)
                lines.push(`     Estado: ${f.overall_status ?? 'pendiente'}`)
                lines.push(`     ${activityStatusLine(f)}`)
              })
            }
            lines.push('')
          })
          if (professionals.length === 0) lines.push('No hay profesionales registrados.')
          downloadBlob(lines.join('\n'), `informe-por-profesional-${Date.now()}.txt`)
          break
        }

        case 'by_municipality': {
          lines.push('CONTROL G — INFORME POR MUNICIPIO')
          lines.push(hr)
          lines.push(`Entidad: ${entityName}`)
          lines.push(`Fecha de generación: ${formatDate()}`)
          lines.push('')
          municipalities.forEach(mun => {
            const munFamilies = families.filter(f => f.municipality_id === mun.$id)
            const completed = munFamilies.filter(f => f.overall_status === 'completed').length
            lines.push(hr)
            lines.push(`MUNICIPIO: ${mun.municipality_name} — ${mun.department}`)
            lines.push(`Meta familias: ${mun.families_target ?? 'N/D'}`)
            lines.push(`Familias registradas: ${munFamilies.length}`)
            lines.push(`Familias completadas: ${completed}`)
            lines.push('')
            munFamilies.forEach((f, i) => {
              const name = f.full_name || `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim()
              lines.push(`  ${i + 1}. ${name} | ${f.id_document_type} ${f.id_number} | ${f.overall_status ?? 'pendiente'}`)
            })
            lines.push('')
          })
          if (municipalities.length === 0) lines.push('No hay municipios configurados.')
          downloadBlob(lines.join('\n'), `informe-por-municipio-${Date.now()}.txt`)
          break
        }

        case 'by_activity': {
          const actLabel = ACTIVITY_LABELS[activityType]
          const statusKey = activityType === 'ex_ante' ? 'ex_ante_status'
            : activityType === 'ex_post' ? 'ex_post_status'
            : `${activityType}_status`

          lines.push(`CONTROL G — INFORME POR ACTIVIDAD: ${actLabel.toUpperCase()}`)
          lines.push(hr)
          lines.push(`Entidad: ${entityName}`)
          lines.push(`Fecha de generación: ${formatDate()}`)
          lines.push('')
          const done = families.filter(f => (f as any)[statusKey] === 'completed')
          const pending = families.filter(f => (f as any)[statusKey] !== 'completed')
          lines.push(`Total familias: ${families.length}`)
          lines.push(`${actLabel} completado: ${done.length}`)
          lines.push(`${actLabel} pendiente: ${pending.length}`)
          lines.push('')
          lines.push('FAMILIAS CON ACTIVIDAD COMPLETADA:')
          done.forEach((f, i) => {
            const name = f.full_name || `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim()
            lines.push(`  ${i + 1}. ${name} | ${f.id_document_type} ${f.id_number}`)
          })
          lines.push('')
          lines.push('FAMILIAS PENDIENTES:')
          pending.forEach((f, i) => {
            const name = f.full_name || `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim()
            lines.push(`  ${i + 1}. ${name} | ${f.id_document_type} ${f.id_number}`)
          })
          downloadBlob(lines.join('\n'), `informe-actividad-${activityType}-${Date.now()}.txt`)
          break
        }

        case 'consolidated': {
          lines.push('CONTROL G — INFORME CONSOLIDADO')
          lines.push(hr)
          lines.push(`Entidad: ${entityName}`)
          lines.push(`Fecha de generación: ${formatDate()}`)
          lines.push('')
          lines.push(`Total municipios: ${municipalities.length}`)
          lines.push(`Total profesionales: ${professionals.length}`)
          lines.push(`Total familias: ${families.length}`)
          lines.push(`Familias pendientes: ${families.filter(f => f.overall_status === 'pending').length}`)
          lines.push(`Familias en progreso: ${families.filter(f => f.overall_status === 'in_progress').length}`)
          lines.push(`Familias completadas: ${families.filter(f => f.overall_status === 'completed').length}`)
          lines.push('')
          lines.push(hr)
          lines.push('RESUMEN POR MUNICIPIO:')
          municipalities.forEach(mun => {
            const mFam = families.filter(f => f.municipality_id === mun.$id)
            lines.push(`  ${mun.municipality_name}: ${mFam.length} familias | Meta: ${mun.families_target ?? 'N/D'}`)
          })
          lines.push('')
          lines.push(hr)
          lines.push('RESUMEN POR PROFESIONAL:')
          professionals.forEach(prof => {
            const pFam = families.filter(f => f.professional_id === prof.$id || f.professional_id === prof.user_id)
            const comp = pFam.filter(f => f.overall_status === 'completed').length
            lines.push(`  ${prof.full_name}: ${pFam.length} familias | Completadas: ${comp}`)
          })
          downloadBlob(lines.join('\n'), `informe-consolidado-${Date.now()}.txt`)
          break
        }

        case 'population_impact': {
          lines.push('CONTROL G — INFORME DE IMPACTO POBLACIONAL')
          lines.push(hr)
          lines.push(`Entidad: ${entityName}`)
          lines.push(`Fecha de generación: ${formatDate()}`)
          lines.push('')
          lines.push(`Total familias atendidas: ${families.length}`)
          lines.push('')
          // Gender
          const genderMap: Record<string, number> = {}
          families.forEach(f => {
            const g = f.gender ?? 'No especificado'
            genderMap[g] = (genderMap[g] || 0) + 1
          })
          lines.push('DISTRIBUCIÓN POR GÉNERO:')
          Object.entries(genderMap).forEach(([k, v]) => lines.push(`  ${k}: ${v}`))
          lines.push('')
          // Ethnic group
          const ethnicMap: Record<string, number> = {}
          families.forEach(f => {
            const e = f.ethnic_group ?? 'No especificado'
            ethnicMap[e] = (ethnicMap[e] || 0) + 1
          })
          lines.push('GRUPO ÉTNICO:')
          Object.entries(ethnicMap).forEach(([k, v]) => lines.push(`  ${k}: ${v}`))
          lines.push('')
          // Disability
          const withDisability = families.filter(f => f.disability && f.disability !== 'ninguna').length
          lines.push(`CONDICIÓN DE DISCAPACIDAD: ${withDisability} familias`)
          lines.push('')
          // Consent
          const withConsent = families.filter(f => f.consent_given === true).length
          lines.push(`CONSENTIMIENTO DADO: ${withConsent} / ${families.length}`)
          lines.push('')
          // Differential factor
          const diffMap: Record<string, number> = {}
          families.forEach(f => {
            const d = f.differential_factor ?? 'No aplica'
            diffMap[d] = (diffMap[d] || 0) + 1
          })
          lines.push('FACTOR DIFERENCIAL:')
          Object.entries(diffMap).forEach(([k, v]) => lines.push(`  ${k}: ${v}`))
          downloadBlob(lines.join('\n'), `informe-impacto-poblacional-${Date.now()}.txt`)
          break
        }

        default:
          break
      }
    } catch (err) {
      console.error('Error generando informe:', err)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <PageWrapper>
      <TopBar
        title="Informes"
        subtitle="Generación y descarga de informes"
      />

      <div className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => {
            const isGenerating = generating === card.id
            return (
              <div key={card.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-50 border border-border flex items-center justify-center flex-shrink-0">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground leading-snug">{card.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
                  </div>
                </div>

                {card.hasActivitySelector && (
                  <div className="relative">
                    <select
                      value={activityType}
                      onChange={e => setActivityType(e.target.value as ActivityTypeOption)}
                      className="w-full appearance-none px-3 py-2 rounded-xl border border-input text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-8 bg-background"
                    >
                      {(Object.entries(ACTIVITY_LABELS) as [ActivityTypeOption, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <FileText size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                )}

                <button
                  onClick={() => generateReport(card.id)}
                  disabled={!!generating}
                  className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-medium hover:bg-[#2a5570] transition-colors disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Generando informe...
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      Generar PDF
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </PageWrapper>
  )
}
