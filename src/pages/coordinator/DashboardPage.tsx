import { useState, useEffect } from 'react'
import { ClipboardList, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { KPICard, ResponseRow, TeamMemberRow, PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { listProjects, getProjectMembers, listForms } from '@/lib/appwrite-db'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, Models } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { FormResponse, TeamMember } from '@/types'
import { SERVICE_MOMENTS } from '@/config/moments'

// Fallback charts until enough data is collected
const generateEmptyDailyData = () => {
  const data = []
  for (let i = 25; i > 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    data.push({ name: `${d.getDate()} ${(d.toLocaleString('default', { month: 'short' }))}`, value: 0 })
  }
  return data
}

export default function CoordDashboard() {
  const { user } = useAuthStore()
  
  const [stats, setStats] = useState({
    formsDesigned: 0,
    formsFilled: 0,
    activeTechs: 0,
    assistants: 0,
    progress: 0,
    pendingValidation: 0
  })

  const [recentResponses, setRecentResponses] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [dailyData, setDailyData] = useState(generateEmptyDailyData())
  const [zoneData, setZoneData] = useState([{ name: 'General', value: 0, total: 100 }])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        if (!user?.organizationId) return;
        setLoading(true);

        // Fetch overall forms designed
        const formsRes = await listForms({ organizationId: user.organizationId, limit: 100 })
        
        // Fetch real responses
        const responsesRes = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_IDS.FORM_RESPONSES,
          [
            Query.equal('organization_id', user.organizationId),
            Query.orderDesc('$createdAt'),
            Query.limit(50)
          ]
        )

        // Count pending
        const pendingRes = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_IDS.FORM_RESPONSES,
          [
            Query.equal('organization_id', user.organizationId),
            Query.equal('status', 'in_review'),
            Query.limit(1)
          ]
        )

        // Get team members (assuming current user is coordinator for a project)
        let totalTechs = 0;
        let activeTeam: any[] = [];
        
        const projects = await listProjects({ organizationId: user.organizationId, coordinatorId: user.id })
        if (projects.documents.length > 0) {
          const mainProject = projects.documents[0]
          const members = await getProjectMembers(mainProject.$id)
          activeTeam = members.slice(0, 5)
          totalTechs = members.length
        }

        setStats({
          formsDesigned: formsRes.total,
          formsFilled: responsesRes.total,
          activeTechs: totalTechs,
          assistants: 0, // Need to filter by role if needed
          progress: responsesRes.total > 0 ? 100 : 0, 
          pendingValidation: pendingRes.total
        })

        // Map recent responses for the UI
        const mappedResponses = responsesRes.documents.slice(0, 5).map((doc: any) => {
          const moment = SERVICE_MOMENTS.find(m => m.formId === doc.form_id);
          return {
            id: doc.$id,
            localId: doc.local_id,
            technicianName: doc.technician_name || 'Técnico ' + doc.technician_id.substring(0, 4),
            zoneName: doc.zone_name || doc.zone_id || 'N/A',
            formName: moment ? moment.name : 'Formulario ' + doc.form_id.substring(0, 4),
            createdAt: doc.$createdAt,
            status: doc.status
          };
        })
        setRecentResponses(mappedResponses)
        
        // Let's use fake team member list to not break the UI until users are seeded
        // But map actual ones if we have them
        const mappedTeam = activeTeam.map(m => ({
          id: m.$id,
          user: { fullName: m.user_id }, // We would need to fetch user profiles
          assignedZoneId: m.assigned_zone_id,
          formsToday: 0,
          isOnline: true,
          isPending: false
        }))
        setTeamMembers(mappedTeam)

      } catch (e) {
        console.error('Error loading dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [user])
  
  return (
    <PageWrapper>
      <TopBar
        title={`Buenos días, ${user?.fullName?.split(' ')[0] || 'Coordinador'} 👋`}
        subtitle="Resumen del proyecto activo"
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard label="Formularios diseñados" value={loading ? '...' : stats.formsDesigned} icon={<ClipboardList size={18} />} />
          <KPICard label="Formularios diligenciados" value={loading ? '...' : stats.formsFilled} icon={<CheckCircle size={18} />} colorClass="bg-green-50 text-green-600" />
          <KPICard label="Técnicos activos" value={loading ? '...' : stats.activeTechs} icon={<Users size={18} />} colorClass="bg-blue-50 text-blue-600" />
          <KPICard label="Asistentes" value={loading ? '...' : stats.assistants} icon={<Users size={18} />} colorClass="bg-indigo-50 text-indigo-600" />
          <KPICard label="Avance general" value={loading ? '...' : stats.progress} icon={<TrendingUp size={18} />} colorClass="bg-orange-50 text-orange-600" suffix="%" />
          <KPICard label="Pendientes validación" value={loading ? '...' : stats.pendingValidation} icon={<Clock size={18} />} colorClass="bg-yellow-50 text-yellow-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Recolección diaria — últimos 25 días</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#003366" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#003366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#grad1)" name="Formularios" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Zone progress */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Avance por zona</h3>
            <div className="space-y-3">
              {zoneData.map(zone => {
                const total = typeof zone.total === 'number' ? zone.total : 1
                const pct = Math.round((zone.value / total) * 100)
                return (
                  <div key={zone.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{zone.name}</span>
                      <span className="text-muted-foreground ml-2">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: pct >= 80 ? '#27AE60' : pct >= 50 ? '#F39C12' : 'hsl(var(--primary))' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent responses */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">Últimos formularios recibidos</h3>
              <button 
                onClick={() => window.location.href = '/coord/data'}
                className="text-xs text-brand-primary hover:underline"
                aria-label="Ver todos los formularios recibidos"
              >
                Ver todos →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/20">
                    {['ID', 'Técnico', 'Zona', 'Formulario', 'Fecha', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentResponses.map(r => <ResponseRow key={r.id} response={r} />)}
                  {recentResponses.length === 0 && !loading && (
                    <tr><td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">No hay respuestas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active team */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">Equipo en campo</h3>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {teamMembers.length} en línea
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/20">
                    {['Técnico', 'Zona', 'Hoy', 'Último sync', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teamMembers.map((m: any) => <TeamMemberRow key={m.id} member={m} />)}
                  {teamMembers.length === 0 && !loading && (
                    <tr><td colSpan={5} className="p-4 text-center text-sm text-muted-foreground">No hay equipo activo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
