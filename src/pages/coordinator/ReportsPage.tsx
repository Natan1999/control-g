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
// @ts-ignore — jsPDF default export
import { jsPDF } from 'jspdf'

type ActivityTypeOption = 'ex_ante' | 'encounter_1' | 'encounter_2' | 'encounter_3' | 'ex_post'

const ACTIVITY_LABELS: Record<ActivityTypeOption, string> = {
  ex_ante: 'Ex-Antes',
  encounter_1: 'Momento 1',
  encounter_2: 'Momento 2',
  encounter_3: 'Momento 3',
  ex_post: 'Ex-Post',
}

const ACTIVITY_KEYS: Record<ActivityTypeOption, string> = {
  ex_ante: 'ex_ante_status',
  encounter_1: 'encounter_1_status',
  encounter_2: 'encounter_2_status',
  encounter_3: 'encounter_3_status',
  ex_post: 'ex_post_status',
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

// ─── PDF helpers ─────────────────────────────────────────────────────────────

const PRIMARY = '#1B3A4B'
const ACCENT  = '#27AE60'
const LIGHT   = '#F3F4F6'

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function pdfHeader(doc: jsPDF, entityName: string, reportTitle: string) {
  const [r, g, b] = hexToRgb(PRIMARY)
  doc.setFillColor(r, g, b)
  doc.rect(0, 0, 216, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTROL G', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(reportTitle, 14, 20)
  doc.setFontSize(8)
  doc.text(entityName, 216 - 14, 20, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

function pdfFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const y = 280
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, 202, y)
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Control G — ${new Date().toLocaleString('es-CO', { dateStyle: 'long' })}`, 14, y + 5)
  doc.text(`Página ${pageNum} de ${totalPages}`, 202, y + 5, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

function pdfSectionTitle(doc: jsPDF, text: string, y: number): number {
  const [r, g, b] = hexToRgb(LIGHT)
  doc.setFillColor(r, g, b)
  doc.roundedRect(14, y, 188, 8, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const [pr, pg, pb] = hexToRgb(PRIMARY)
  doc.setTextColor(pr, pg, pb)
  doc.text(text.toUpperCase(), 18, y + 5.5)
  doc.setTextColor(0, 0, 0)
  return y + 12
}

function pdfKpiRow(doc: jsPDF, label: string, value: string | number, y: number, highlight = false) {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(label, 18, y)
  doc.setFont('helvetica', 'bold')
  if (highlight) {
    const [r, g, b] = hexToRgb(ACCENT)
    doc.setTextColor(r, g, b)
  } else {
    doc.setTextColor(0, 0, 0)
  }
  doc.text(String(value), 130, y, { align: 'left' })
  doc.setTextColor(0, 0, 0)
  return y + 6
}

function statusBadge(s: string): string {
  if (s === 'completed') return '✓ Completado'
  if (s === 'in_progress') return '◷ En curso'
  return '○ Pendiente'
}

// ─── Report generators ────────────────────────────────────────────────────────

async function generateByProfessionalPDF(
  entityName: string,
  families: any[],
  professionals: any[],
  municipalities: any[],
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'letter')
  const totalFamilies = families.length
  const completedFamilies = families.filter(f => f.overall_status === 'completed').length
  const pct = totalFamilies > 0 ? Math.round((completedFamilies / totalFamilies) * 100) : 0

  // ── Page 1: Summary ──────────────────────────────────────────────────────
  pdfHeader(doc, entityName, 'INFORME POR PROFESIONAL')

  let y = 38
  y = pdfSectionTitle(doc, 'Resumen Ejecutivo', y)
  y = pdfKpiRow(doc, 'Total familias', totalFamilies, y)
  y = pdfKpiRow(doc, 'Familias completadas', completedFamilies, y, true)
  y = pdfKpiRow(doc, 'Familias en progreso', families.filter(f => f.overall_status === 'in_progress').length, y)
  y = pdfKpiRow(doc, 'Familias pendientes', families.filter(f => f.overall_status === 'pending' || !f.overall_status).length, y)
  y = pdfKpiRow(doc, 'Porcentaje de avance', `${pct}%`, y, pct >= 80)
  y = pdfKpiRow(doc, 'Profesionales activos', professionals.length, y)
  y = pdfKpiRow(doc, 'Municipios cubiertos', municipalities.length, y)
  y += 6

  // Activity breakdown
  y = pdfSectionTitle(doc, 'Avance por Momento de Actividad', y)
  const actTypes: ActivityTypeOption[] = ['ex_ante', 'encounter_1', 'encounter_2', 'encounter_3', 'ex_post']
  for (const at of actTypes) {
    const done = families.filter(f => (f as any)[ACTIVITY_KEYS[at]] === 'completed').length
    const pctAct = totalFamilies > 0 ? Math.round((done / totalFamilies) * 100) : 0
    y = pdfKpiRow(doc, ACTIVITY_LABELS[at], `${done} / ${totalFamilies}  (${pctAct}%)`, y)
  }
  y += 6

  // Professional summary table
  y = pdfSectionTitle(doc, 'Resumen por Profesional', y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('PROFESIONAL', 18, y)
  doc.text('FAMILIAS', 100, y)
  doc.text('COMPLETADAS', 130, y)
  doc.text('% AVANCE', 170, y)
  y += 2
  doc.setDrawColor(220, 220, 220)
  doc.line(14, y, 202, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  for (const prof of professionals) {
    const pFams = families.filter(f => f.professional_id === prof.user_id || f.professional_id === prof.$id)
    const pComp = pFams.filter(f => f.overall_status === 'completed').length
    const pPct = pFams.length > 0 ? Math.round((pComp / pFams.length) * 100) : 0
    doc.setFontSize(8)
    doc.text(prof.full_name ?? 'Sin nombre', 18, y, { maxWidth: 78 })
    doc.text(String(pFams.length), 100, y)
    doc.text(String(pComp), 130, y)
    if (pPct >= 80) {
      const [r, g, b] = hexToRgb(ACCENT)
      doc.setTextColor(r, g, b)
    }
    doc.text(`${pPct}%`, 170, y)
    doc.setTextColor(0, 0, 0)
    y += 6
    if (y > 265) {
      doc.addPage()
      pdfHeader(doc, entityName, 'INFORME POR PROFESIONAL (cont.)')
      y = 38
    }
  }

  pdfFooter(doc, 1, doc.getNumberOfPages())

  // ── Per-professional detail pages ────────────────────────────────────────
  for (const prof of professionals) {
    doc.addPage()
    pdfHeader(doc, entityName, `PROFESIONAL: ${prof.full_name ?? 'Sin nombre'}`)
    y = 38

    const pFams = families.filter(f => f.professional_id === prof.user_id || f.professional_id === prof.$id)
    const mun = municipalities.find(m => m.$id === prof.municipality_id)

    y = pdfSectionTitle(doc, 'Información del Profesional', y)
    y = pdfKpiRow(doc, 'Nombre', prof.full_name ?? '-', y)
    y = pdfKpiRow(doc, 'Email', prof.email ?? '-', y)
    if (mun) y = pdfKpiRow(doc, 'Municipio', mun.municipality_name ?? '-', y)
    y = pdfKpiRow(doc, 'Total familias asignadas', pFams.length, y)
    y += 6

    y = pdfSectionTitle(doc, 'Familias', y)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('#', 16, y)
    doc.text('NOMBRE', 24, y)
    doc.text('DOCUMENTO', 90, y)
    doc.text('EX-ANTES', 130, y)
    doc.text('MOMENTOS', 155, y)
    doc.text('EX-POST', 185, y)
    y += 2
    doc.line(14, y, 202, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    pFams.forEach((fam, idx) => {
      const name = fam.full_name || `${fam.first_name ?? ''} ${fam.first_lastname ?? ''}`.trim() || 'Sin nombre'
      const doc_num = `${fam.id_document_type ?? ''} ${fam.id_number ?? ''}`.trim()
      const exAnte = fam.ex_ante_status === 'completed' ? '✓' : '○'
      const moments = [fam.encounter_1_status, fam.encounter_2_status, fam.encounter_3_status]
        .filter(s => s === 'completed').length
      const exPost = fam.ex_post_status === 'completed' ? '✓' : '○'

      doc.setFontSize(7.5)
      doc.text(String(idx + 1), 16, y)
      doc.text(name, 24, y, { maxWidth: 62 })
      doc.text(doc_num, 90, y, { maxWidth: 36 })
      if (fam.ex_ante_status === 'completed') {
        const [r, g, b] = hexToRgb(ACCENT)
        doc.setTextColor(r, g, b)
      }
      doc.text(exAnte, 133, y)
      doc.setTextColor(0, 0, 0)
      doc.text(`${moments}/3`, 158, y)
      if (fam.ex_post_status === 'completed') {
        const [r, g, b] = hexToRgb(ACCENT)
        doc.setTextColor(r, g, b)
      }
      doc.text(exPost, 188, y)
      doc.setTextColor(0, 0, 0)
      y += 6

      if (y > 265) {
        pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
        doc.addPage()
        pdfHeader(doc, entityName, `PROFESIONAL: ${prof.full_name ?? ''} (cont.)`)
        y = 38
      }
    })

    if (pFams.length === 0) {
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('Sin familias asignadas.', 18, y)
      doc.setTextColor(0, 0, 0)
    }

    pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
  }

  // Patch total pages in footer of page 1
  doc.save(`Informe-Profesionales-${Date.now()}.pdf`)
}

async function generateByMunicipalityPDF(
  entityName: string,
  families: any[],
  municipalities: any[],
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'letter')

  pdfHeader(doc, entityName, 'INFORME POR MUNICIPIO')
  let y = 38

  y = pdfSectionTitle(doc, 'Resumen General', y)
  y = pdfKpiRow(doc, 'Total municipios', municipalities.length, y)
  y = pdfKpiRow(doc, 'Total familias', families.length, y)
  y = pdfKpiRow(doc, 'Familias completadas', families.filter(f => f.overall_status === 'completed').length, y, true)
  y += 8

  for (const mun of municipalities) {
    const mFams = families.filter(f => f.municipality_id === mun.$id)
    const mComp = mFams.filter(f => f.overall_status === 'completed').length
    const mPct = mun.families_target > 0 ? Math.round((mComp / mun.families_target) * 100) : 0

    if (y > 240) {
      pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
      doc.addPage()
      pdfHeader(doc, entityName, 'INFORME POR MUNICIPIO (cont.)')
      y = 38
    }

    y = pdfSectionTitle(doc, `${mun.municipality_name} — ${mun.department}`, y)
    y = pdfKpiRow(doc, 'Meta familias', mun.families_target ?? 'N/D', y)
    y = pdfKpiRow(doc, 'Familias registradas', mFams.length, y)
    y = pdfKpiRow(doc, 'Familias completadas', mComp, y, true)
    y = pdfKpiRow(doc, '% Avance sobre meta', `${mPct}%`, y, mPct >= 80)
    y += 4

    // Mini-list
    mFams.slice(0, 10).forEach((fam, i) => {
      const name = fam.full_name || `${fam.first_name ?? ''} ${fam.first_lastname ?? ''}`.trim()
      doc.setFontSize(7.5)
      doc.setTextColor(80, 80, 80)
      doc.text(`  ${i + 1}. ${name} — ${statusBadge(fam.overall_status ?? 'pending')}`, 18, y)
      doc.setTextColor(0, 0, 0)
      y += 5
    })
    if (mFams.length > 10) {
      doc.setFontSize(7.5)
      doc.setTextColor(150, 150, 150)
      doc.text(`  ... y ${mFams.length - 10} más`, 18, y)
      doc.setTextColor(0, 0, 0)
      y += 5
    }
    y += 4
  }

  pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
  doc.save(`Informe-Municipios-${Date.now()}.pdf`)
}

async function generateByActivityPDF(
  entityName: string,
  families: any[],
  actType: ActivityTypeOption,
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'letter')
  const label = ACTIVITY_LABELS[actType]
  const key = ACTIVITY_KEYS[actType]

  pdfHeader(doc, entityName, `INFORME POR ACTIVIDAD — ${label.toUpperCase()}`)
  let y = 38

  const done = families.filter(f => (f as any)[key] === 'completed')
  const pending = families.filter(f => (f as any)[key] !== 'completed')
  const pct = families.length > 0 ? Math.round((done.length / families.length) * 100) : 0

  y = pdfSectionTitle(doc, 'Estadísticas', y)
  y = pdfKpiRow(doc, 'Total familias', families.length, y)
  y = pdfKpiRow(doc, `${label} completado`, done.length, y, true)
  y = pdfKpiRow(doc, `${label} pendiente`, pending.length, y)
  y = pdfKpiRow(doc, 'Porcentaje completado', `${pct}%`, y, pct >= 80)
  y += 8

  const renderList = (title: string, list: any[]) => {
    if (list.length === 0) return
    y = pdfSectionTitle(doc, title, y)
    list.forEach((fam, i) => {
      const name = fam.full_name || `${fam.first_name ?? ''} ${fam.first_lastname ?? ''}`.trim()
      const doc_num = `${fam.id_document_type ?? ''} ${fam.id_number ?? ''}`.trim()
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      doc.text(`${i + 1}. ${name}`, 18, y)
      doc.setTextColor(120, 120, 120)
      doc.text(doc_num, 130, y)
      doc.setTextColor(0, 0, 0)
      y += 6
      if (y > 265) {
        pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
        doc.addPage()
        pdfHeader(doc, entityName, `INFORME — ${label.toUpperCase()} (cont.)`)
        y = 38
      }
    })
    y += 4
  }

  renderList('Familias con actividad completada', done)
  renderList('Familias pendientes', pending)

  pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
  doc.save(`Informe-Actividad-${actType}-${Date.now()}.pdf`)
}

async function generateConsolidatedPDF(
  entityName: string,
  families: any[],
  professionals: any[],
  municipalities: any[],
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'letter')

  pdfHeader(doc, entityName, 'INFORME CONSOLIDADO')
  let y = 38

  const total = families.length
  const completed = families.filter(f => f.overall_status === 'completed').length
  const inProgress = families.filter(f => f.overall_status === 'in_progress').length
  const pending = families.filter(f => !f.overall_status || f.overall_status === 'pending').length

  y = pdfSectionTitle(doc, 'Resumen Operativo', y)
  y = pdfKpiRow(doc, 'Total municipios', municipalities.length, y)
  y = pdfKpiRow(doc, 'Total profesionales', professionals.length, y)
  y = pdfKpiRow(doc, 'Total familias registradas', total, y)
  y = pdfKpiRow(doc, 'Familias completadas', completed, y, true)
  y = pdfKpiRow(doc, 'Familias en progreso', inProgress, y)
  y = pdfKpiRow(doc, 'Familias pendientes', pending, y)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  y = pdfKpiRow(doc, 'Porcentaje de avance general', `${pct}%`, y, pct >= 80)
  y += 8

  y = pdfSectionTitle(doc, 'Desglose por Municipio', y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('MUNICIPIO', 18, y)
  doc.text('META', 110, y)
  doc.text('REGISTRADAS', 130, y)
  doc.text('COMPLETADAS', 162, y)
  doc.text('%', 195, y)
  y += 2
  doc.line(14, y, 202, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  for (const mun of municipalities) {
    const mFams = families.filter(f => f.municipality_id === mun.$id)
    const mComp = mFams.filter(f => f.overall_status === 'completed').length
    const mPct = mun.families_target > 0 ? Math.round((mComp / mun.families_target) * 100) : 0
    doc.setFontSize(8)
    doc.text(mun.municipality_name ?? '-', 18, y, { maxWidth: 88 })
    doc.text(String(mun.families_target ?? 'N/D'), 110, y)
    doc.text(String(mFams.length), 132, y)
    doc.text(String(mComp), 163, y)
    if (mPct >= 80) {
      const [r, g, b] = hexToRgb(ACCENT)
      doc.setTextColor(r, g, b)
    }
    doc.text(`${mPct}%`, 195, y)
    doc.setTextColor(0, 0, 0)
    y += 6
    if (y > 265) {
      pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
      doc.addPage()
      pdfHeader(doc, entityName, 'INFORME CONSOLIDADO (cont.)')
      y = 38
    }
  }
  y += 6

  y = pdfSectionTitle(doc, 'Desglose por Profesional', y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('PROFESIONAL', 18, y)
  doc.text('FAMILIAS', 120, y)
  doc.text('COMPLETADAS', 150, y)
  doc.text('%', 195, y)
  y += 2
  doc.line(14, y, 202, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  for (const prof of professionals) {
    const pFams = families.filter(f => f.professional_id === prof.user_id || f.professional_id === prof.$id)
    const pComp = pFams.filter(f => f.overall_status === 'completed').length
    const pPct = pFams.length > 0 ? Math.round((pComp / pFams.length) * 100) : 0
    doc.setFontSize(8)
    doc.text(prof.full_name ?? '-', 18, y, { maxWidth: 98 })
    doc.text(String(pFams.length), 120, y)
    doc.text(String(pComp), 152, y)
    if (pPct >= 80) {
      const [r, g, b] = hexToRgb(ACCENT)
      doc.setTextColor(r, g, b)
    }
    doc.text(`${pPct}%`, 195, y)
    doc.setTextColor(0, 0, 0)
    y += 6
    if (y > 265) {
      pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
      doc.addPage()
      pdfHeader(doc, entityName, 'INFORME CONSOLIDADO (cont.)')
      y = 38
    }
  }

  pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
  doc.save(`Informe-Consolidado-${Date.now()}.pdf`)
}

async function generatePopulationImpactPDF(
  entityName: string,
  families: any[],
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'letter')

  pdfHeader(doc, entityName, 'INFORME DE IMPACTO POBLACIONAL')
  let y = 38

  const counter = (arr: any[], key: string): Record<string, number> => {
    const map: Record<string, number> = {}
    arr.forEach(f => {
      const v = (f[key] ?? 'No especificado') as string
      map[v] = (map[v] || 0) + 1
    })
    return map
  }

  y = pdfSectionTitle(doc, 'Resumen General', y)
  y = pdfKpiRow(doc, 'Total familias atendidas', families.length, y, true)
  y = pdfKpiRow(doc, 'Con consentimiento dado', families.filter(f => f.consent_given === true).length, y)
  y = pdfKpiRow(doc, 'Con condición de discapacidad', families.filter(f => f.disability && f.disability !== 'ninguna').length, y)
  y += 8

  const renderDistribution = (title: string, map: Record<string, number>) => {
    y = pdfSectionTitle(doc, title, y)
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    const total = entries.reduce((s, [, v]) => s + v, 0)
    entries.forEach(([label, count]) => {
      const pctStr = total > 0 ? ` (${Math.round((count / total) * 100)}%)` : ''
      y = pdfKpiRow(doc, label, `${count}${pctStr}`, y)
      if (y > 265) {
        pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
        doc.addPage()
        pdfHeader(doc, entityName, 'IMPACTO POBLACIONAL (cont.)')
        y = 38
      }
    })
    y += 6
  }

  renderDistribution('Distribución por Género', counter(families, 'gender'))
  renderDistribution('Grupo Étnico', counter(families, 'ethnic_group'))
  renderDistribution('Condición de Discapacidad', counter(families, 'disability'))
  renderDistribution('Factor Diferencial', counter(families, 'differential_factor'))

  pdfFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
  doc.save(`Informe-Impacto-Poblacional-${Date.now()}.pdf`)
}

// ─── Page component ───────────────────────────────────────────────────────────

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
    } catch { return 'Entidad' }
  }

  async function loadAll() {
    if (!user?.entityId) return { entityName: '', families: [], professionals: [], municipalities: [] }
    const [entityName, famRes, profRes, munRes] = await Promise.all([
      loadEntityName(),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        Query.equal('entity_id', user.entityId), Query.limit(500),
      ]).then(r => r.documents).catch(() => []),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
        Query.equal('entity_id', user.entityId),
        Query.equal('role', 'professional'),
        Query.limit(100),
      ]).then(r => r.documents).catch(() => []),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
        Query.equal('entity_id', user.entityId), Query.limit(100),
      ]).then(r => r.documents).catch(() => []),
    ])
    return { entityName, families: famRes, professionals: profRes, municipalities: munRes }
  }

  async function generateReport(reportId: string) {
    setGenerating(reportId)
    try {
      const { entityName, families, professionals, municipalities } = await loadAll()

      switch (reportId) {
        case 'by_professional':
          await generateByProfessionalPDF(entityName, families, professionals, municipalities)
          break
        case 'by_municipality':
          await generateByMunicipalityPDF(entityName, families, municipalities)
          break
        case 'by_activity':
          await generateByActivityPDF(entityName, families, activityType)
          break
        case 'consolidated':
          await generateConsolidatedPDF(entityName, families, professionals, municipalities)
          break
        case 'population_impact':
          await generatePopulationImpactPDF(entityName, families)
          break
      }
    } catch (err) {
      console.error('Error generando informe PDF:', err)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <PageWrapper>
      <TopBar
        title="Informes"
        subtitle="Generación y descarga de informes PDF"
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
                      Generando PDF...
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
