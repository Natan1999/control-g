import { useEffect, useState } from 'react'
import { ClipboardList, UserCheck, Clock, MapPin } from 'lucide-react'
import { KPICard, PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/shared'
import { useNavigate } from 'react-router-dom'

interface TechnicianMember {
  $id: string
  user_id: string
  assigned_zone_id?: string
  last_seen_at?: string
  last_sync_at?: string
}

interface PendingResponse {
  $id: string
  technician_id: string
  form_id: string
  zone_id?: string
  $createdAt: string
  ocr_confidence?: number
}

export default function AssistDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [techCount, setTechCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [approvedToday, setApprovedToday] = useState(0)
  const [members, setMembers] = useState<TechnicianMember[]>([])
  const [pendingResponses, setPendingResponses] = useState<PendingResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !user?.organizationId) return

    async function load() {
      setLoading(true)
      try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const [membersRes, pendingRes, approvedRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROJECT_MEMBERS, [
            Query.equal('supervisor_id', user!.id),
            Query.limit(100),
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
            Query.equal('organization_id', user!.organizationId!),
            Query.equal('status', 'in_review'),
            Query.orderDesc('$createdAt'),
            Query.limit(5),
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
            Query.equal('organization_id', user!.organizationId!),
            Query.equal('status', 'approved'),
            Query.greaterThanEqual('$createdAt', todayStart.toISOString()),
            Query.limit(1),
          ]),
        ])

        setTechCount(membersRes.total)
        setMembers(membersRes.documents as unknown as TechnicianMember[])
        setPendingCount(pendingRes.total)
        setPendingResponses(pendingRes.documents as unknown as PendingResponse[])
        setApprovedToday(approvedRes.total)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setTechCount(0)
        setPendingCount(0)
        setApprovedToday(0)
        setMembers([])
        setPendingResponses([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.id, user?.organizationId])

  const skeletonRow = (
    <tr>
      <td colSpan={5} className="px-4 py-3">
        <div className="h-4 bg-muted/50 rounded animate-pulse" />
      </td>
    </tr>
  )

  return (
    <PageWrapper>
      <TopBar
        title={`Hola, ${user?.fullName?.split(' ')[0]} 👋`}
        subtitle="Panel del Asistente — Caracterización Bolívar 2026"
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Técnicos a cargo"
            value={loading ? '—' : techCount}
            icon={<UserCheck size={18} />}
          />
          <KPICard
            label="Pendientes revisión"
            value={loading ? '—' : pendingCount}
            icon={<Clock size={18} />}
            colorClass="bg-yellow-50 text-yellow-600"
          />
          <KPICard
            label="Aprobados hoy"
            value={loading ? '—' : approvedToday}
            icon={<ClipboardList size={18} />}
            colorClass="bg-green-50 text-green-600"
          />
          <KPICard
            label="En campo ahora"
            value={loading ? '—' : members.filter(m => {
              if (!m.last_seen_at) return false
              const diff = Date.now() - new Date(m.last_seen_at).getTime()
              return diff < 30 * 60 * 1000
            }).length}
            icon={<MapPin size={18} />}
            colorClass="bg-blue-50 text-blue-600"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Team table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-bold">Mis Técnicos</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20">
                  {['Técnico', 'Zona', 'Sync', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <>{skeletonRow}{skeletonRow}{skeletonRow}</>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No tienes técnicos asignados
                    </td>
                  </tr>
                ) : members.slice(0, 5).map(m => {
                  const isOnline = m.last_seen_at
                    ? Date.now() - new Date(m.last_seen_at).getTime() < 30 * 60 * 1000
                    : false
                  const shortId = m.user_id.slice(0, 6).toUpperCase()
                  return (
                    <tr key={m.$id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <Avatar name={shortId} size="sm" />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </div>
                          <div className="text-sm font-semibold font-mono">{shortId}…</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {m.assigned_zone_id ? m.assigned_zone_id.slice(-6) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {m.last_sync_at ? new Date(m.last_sync_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {isOnline ? 'En campo' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pending review */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Pendientes de revisión</h3>
              {!loading && (
                <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-5 py-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : pendingResponses.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No hay formularios pendientes de revisión
                </div>
              ) : (
                <>
                  {pendingResponses.map(r => (
                    <div key={r.$id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 cursor-pointer">
                      <div>
                        <div className="text-sm font-semibold font-mono">
                          Técnico {r.technician_id.slice(0, 6).toUpperCase()}…
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Form {r.form_id.slice(0, 6)}… · {r.zone_id?.slice(-6) ?? 'N/A'}
                        </div>
                        {r.ocr_confidence != null && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                            OCR {Math.round(r.ocr_confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => navigate('/assist/review')}
                        className="text-xs bg-brand-primary text-white px-3 py-1 rounded-lg hover:bg-brand-secondary transition-colors flex-shrink-0 ml-3"
                      >
                        Revisar
                      </button>
                    </div>
                  ))}
                  {pendingCount > 5 && (
                    <div className="px-5 py-3.5 text-center text-xs text-muted-foreground">
                      + {pendingCount - 5} más pendientes de revisión
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
