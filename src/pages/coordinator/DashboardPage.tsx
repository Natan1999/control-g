import { useState, useEffect, useCallback } from 'react'
import {
  Users, CheckCircle, Clock, TrendingUp, RefreshCw, BarChart2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import type { ProfessionalProgress } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  totalFamilies: number
  completedFamilies: number
  inProgressFamilies: number
  pendingFamilies: number
}

// ─── Chart colors ─────────────────────────────────────────────────────────────

const COLORS = {
  primary:   '#1B3A4B',
  secondary: '#3D7B9E',
  green:     '#27AE60',
  orange:    '#F39C12',
  red:       '#E74C3C',
  gray:      '#BDC3C7',
}

const ACTIVITY_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  '#5DADE2',
  COLORS.orange,
  COLORS.green,
]

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Radial progress ─────────────────────────────────────────────────────────

function RadialProgress({ pct, size = 80, color = COLORS.primary }: { pct: number; size?: number; color?: string }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size < 70 ? 11 : 14} fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoordDashboard() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<Summary>({
    totalFamilies: 0, completedFamilies: 0, inProgressFamilies: 0, pendingFamilies: 0,
  })
  const [professionals, setProfessionals]   = useState<ProfessionalProgress[]>([])
  const [municipalities, setMunicipalities] = useState<any[]>([])
  const [familyDocs, setFamilyDocs]         = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [entityName, setEntityName]         = useState('')
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null)

  const load = useCallback(async () => {
    if (!user?.entityId) { setLoading(false); return }
    setLoading(true)
    try {
      // Entity name
      try {
        const entity = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId)
        setEntityName(entity.name)
      } catch { setEntityName('') }

      // Fetch all data in parallel
      const [familiesRes, usersRes, munRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('entity_id', user.entityId), Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user.entityId), Query.equal('role', 'professional'), Query.limit(50),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
          Query.equal('entity_id', user.entityId), Query.limit(100),
        ]),
      ])

      const families = familiesRes.documents
      setFamilyDocs(families)
      setMunicipalities(munRes.documents)

      const completed  = families.filter((f: any) => f.overall_status === 'completed').length
      const inProgress = families.filter((f: any) => f.overall_status === 'in_progress').length
      setSummary({
        totalFamilies: families.length,
        completedFamilies: completed,
        inProgressFamilies: inProgress,
        pendingFamilies: families.length - completed - inProgress,
      })

      // Per-professional progress
      const progressList: ProfessionalProgress[] = usersRes.documents.map((prof: any) => {
        const pf = families.filter((f: any) => f.professional_id === prof.user_id)
        const exAnte  = pf.filter((f: any) => f.ex_ante_status     === 'completed').length
        const e1      = pf.filter((f: any) => f.encounter_1_status === 'completed').length
        const e2      = pf.filter((f: any) => f.encounter_2_status === 'completed').length
        const e3      = pf.filter((f: any) => f.encounter_3_status === 'completed').length
        const exPost  = pf.filter((f: any) => f.ex_post_status     === 'completed').length
        const total   = pf.length * 5
        const done    = exAnte + e1 + e2 + e3 + exPost
        return {
          professionalId: prof.user_id,
          professionalName: prof.full_name,
          municipalities: [],
          familiesTarget: pf.length,
          exAnte, encounter1: e1, encounter2: e2, encounter3: e3, exPost,
          percentageComplete: total > 0 ? Math.round((done / total) * 100) : 0,
          lastSyncAt: prof.last_sync_at,
        }
      })
      setProfessionals(progressList)
      setLastUpdated(new Date())
    } catch { /* silent */ }
    setLoading(false)
  }, [user?.entityId])

  useEffect(() => { load() }, [load])

  // ─── Derived chart data ────────────────────────────────────────────────────

  const pct = summary.totalFamilies > 0
    ? Math.round((summary.completedFamilies / summary.totalFamilies) * 100)
    : 0

  // Pie: overall status distribution
  const pieData = [
    { name: 'Completadas',  value: summary.completedFamilies,  color: COLORS.green   },
    { name: 'En Progreso',  value: summary.inProgressFamilies, color: COLORS.orange  },
    { name: 'Pendientes',   value: summary.pendingFamilies,    color: COLORS.gray    },
  ].filter(d => d.value > 0)

  // Bar: activity completion per professional
  const profBarData = professionals.map(p => ({
    name: p.professionalName.split(' ')[0],
    fullName: p.professionalName,
    'Ex-Antes':  p.exAnte,
    'Momento 1': p.encounter1,
    'Momento 2': p.encounter2,
    'Momento 3': p.encounter3,
    'Ex-Post':   p.exPost,
  }))

  // Bar: families per municipality
  const munBarData = municipalities.map(m => {
    const count = familyDocs.filter((f: any) => f.municipality_id === m.$id).length
    const done  = familyDocs.filter((f: any) => f.municipality_id === m.$id && f.overall_status === 'completed').length
    return {
      name: m.municipality_name.length > 10 ? m.municipality_name.slice(0, 10) + '…' : m.municipality_name,
      fullName: m.municipality_name,
      Registradas: count,
      Completadas: done,
      Meta: m.families_target ?? 35,
    }
  })

  // Activity completion totals (for horizontal bar overview)
  const totalFam = summary.totalFamilies || 1
  const activityOverview = [
    { name: 'Ex-Antes',  pct: Math.round((professionals.reduce((s, p) => s + p.exAnte, 0) / totalFam) * 100) },
    { name: 'Momento 1', pct: Math.round((professionals.reduce((s, p) => s + p.encounter1, 0) / totalFam) * 100) },
    { name: 'Momento 2', pct: Math.round((professionals.reduce((s, p) => s + p.encounter2, 0) / totalFam) * 100) },
    { name: 'Momento 3', pct: Math.round((professionals.reduce((s, p) => s + p.encounter3, 0) / totalFam) * 100) },
    { name: 'Ex-Post',   pct: Math.round((professionals.reduce((s, p) => s + p.exPost, 0) / totalFam) * 100) },
  ]

  const kpis = [
    { label: 'Familias meta',   value: summary.totalFamilies,     icon: <Users size={20} />,       color: COLORS.primary   },
    { label: 'Completadas',     value: summary.completedFamilies, icon: <CheckCircle size={20} />, color: COLORS.green     },
    { label: 'En progreso',     value: summary.inProgressFamilies,icon: <Clock size={20} />,       color: COLORS.orange    },
    { label: '% Avance global', value: `${pct}%`,                 icon: <TrendingUp size={20} />,  color: COLORS.secondary },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <TopBar
        title="Dashboard Analítica"
        subtitle={entityName || 'Seguimiento en tiempo real'}
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Actualizado: {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={load} disabled={loading}
              className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50" title="Actualizar datos">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        }
      />

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white mb-3" style={{ background: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="text-2xl font-black text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Overall progress bar + radial ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Linear progress */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-[#1B3A4B]" /> Avance general de la operación
          </h3>
          <div className="space-y-3">
            {activityOverview.map((act, i) => (
              <div key={act.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground font-medium">{act.name}</span>
                  <span className="font-bold" style={{ color: ACTIVITY_COLORS[i] }}>{act.pct}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${act.pct}%`, background: ACTIVITY_COLORS[i] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radial + pie */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm flex flex-col items-center justify-center gap-3">
          <h3 className="font-bold text-sm self-start">Progreso total</h3>
          <RadialProgress pct={pct} size={100} color={pct === 100 ? COLORS.green : COLORS.primary} />
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50}
                  dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any, name: any) => [val, name]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => <span className="text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Activities per professional bar chart ───────────────────────────── */}
      {profBarData.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4">Actividades completadas por Profesional</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={profBarData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={10}
                formatter={(value) => <span className="text-xs">{value}</span>} />
              {['Ex-Antes', 'Momento 1', 'Momento 2', 'Momento 3', 'Ex-Post'].map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={ACTIVITY_COLORS[i]} radius={i === 4 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Municipality progress ────────────────────────────────────────────── */}
      {munBarData.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4">Avance por Municipio</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={munBarData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="square" iconSize={10}
                formatter={(value) => <span className="text-xs">{value}</span>} />
              <Bar dataKey="Meta" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Registradas" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completadas" fill={COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Professional detail table ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm">Avance detallado por Profesional</h3>
          <span className="text-xs text-muted-foreground">{professionals.length} profesionales</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando datos...</div>
        ) : professionals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No hay profesionales asignados. Ve a <strong>Equipo</strong> para invitarlos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Profesional', 'Familias', 'Ex-Antes', 'M1', 'M2', 'M3', 'Ex-Post', '% Avance'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professionals.map(p => {
                  const color = p.percentageComplete === 100 ? COLORS.green
                    : p.percentageComplete > 50 ? COLORS.secondary
                    : COLORS.primary
                  return (
                    <tr key={p.professionalId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{p.professionalName}</td>
                      <td className="px-4 py-3 text-center font-semibold">{p.familiesTarget}</td>
                      {[
                        { v: p.exAnte,     color: ACTIVITY_COLORS[0] },
                        { v: p.encounter1, color: ACTIVITY_COLORS[1] },
                        { v: p.encounter2, color: ACTIVITY_COLORS[2] },
                        { v: p.encounter3, color: ACTIVITY_COLORS[3] },
                        { v: p.exPost,     color: ACTIVITY_COLORS[4] },
                      ].map((cell, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          <span className="font-semibold" style={{ color: cell.v === p.familiesTarget && p.familiesTarget > 0 ? COLORS.green : 'inherit' }}>
                            {cell.v}
                          </span>
                          <span className="text-muted-foreground text-xs">/{p.familiesTarget}</span>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${p.percentageComplete}%`, background: color }} />
                          </div>
                          <span className="text-xs font-bold w-9 text-right" style={{ color }}>{p.percentageComplete}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              {professionals.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-bold">
                    <td className="px-4 py-3 text-sm">TOTAL</td>
                    <td className="px-4 py-3 text-center">{summary.totalFamilies}</td>
                    {[
                      professionals.reduce((s, p) => s + p.exAnte, 0),
                      professionals.reduce((s, p) => s + p.encounter1, 0),
                      professionals.reduce((s, p) => s + p.encounter2, 0),
                      professionals.reduce((s, p) => s + p.encounter3, 0),
                      professionals.reduce((s, p) => s + p.exPost, 0),
                    ].map((total, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        <span style={{ color: ACTIVITY_COLORS[i] }}>{total}</span>
                        <span className="text-muted-foreground text-xs">/{summary.totalFamilies}</span>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className="text-sm font-black" style={{ color: pct === 100 ? COLORS.green : COLORS.primary }}>{pct}%</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white border border-border rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[#1B3A4B] border-t-transparent rounded-full" />
            <span className="text-sm font-medium text-foreground">Actualizando datos...</span>
          </div>
        </div>
      )}
    </div>
  )
}
