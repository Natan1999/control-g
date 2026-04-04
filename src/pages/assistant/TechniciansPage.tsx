import { useEffect, useState } from 'react'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, StatusBadge, PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { Search, UserCheck, MapPin, ClipboardList, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatRelativeTime } from '@/lib/utils'

interface ProjectMember {
  $id: string
  user_id: string
  organization_id: string
  supervisor_id?: string
  assigned_zone_id?: string
  last_seen_at?: string
  last_sync_at?: string
  offline_forms_count?: number
}

interface UserProfile {
  $id: string
  user_id: string
  full_name: string
  organization_id: string
  last_seen_at?: string
  last_sync_at?: string
  avatar_url?: string
}

interface TechnicianRow {
  memberId: string
  userId: string
  fullName: string
  assignedZoneId?: string
  lastSyncAt?: string
  lastSeenAt?: string
  offlineForms: number
  status: 'online' | 'pending' | 'offline'
}

function deriveStatus(member: ProjectMember, profile: UserProfile | undefined): 'online' | 'pending' | 'offline' {
  const lastSeen = profile?.last_seen_at ?? member.last_seen_at
  if (lastSeen) {
    const diff = Date.now() - new Date(lastSeen).getTime()
    if (diff < 30 * 60 * 1000) return 'online'
  }
  if ((member.offline_forms_count ?? 0) > 0) return 'pending'
  return 'offline'
}

export default function TechniciansPage() {
  const { user } = useAuthStore()
  const [allTechnicians, setAllTechnicians] = useState<TechnicianRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.organizationId) return

    async function load() {
      setLoading(true)
      try {
        const [membersRes, profilesRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROJECT_MEMBERS, [
            Query.equal('organization_id', user!.organizationId!),
            Query.limit(100),
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
            Query.equal('organization_id', user!.organizationId!),
            Query.limit(200),
          ]),
        ])

        const profiles = profilesRes.documents as unknown as UserProfile[]

        const rows: TechnicianRow[] = (membersRes.documents as unknown as ProjectMember[]).map(member => {
          const profile = profiles.find(p => p.user_id === member.user_id)
          return {
            memberId: member.$id,
            userId: member.user_id,
            fullName: profile?.full_name ?? `Técnico ${member.user_id.slice(0, 6).toUpperCase()}`,
            assignedZoneId: member.assigned_zone_id,
            lastSyncAt: profile?.last_sync_at ?? member.last_sync_at,
            lastSeenAt: profile?.last_seen_at ?? member.last_seen_at,
            offlineForms: member.offline_forms_count ?? 0,
            status: deriveStatus(member, profile),
          }
        })

        setAllTechnicians(rows)
      } catch (err) {
        console.error('Error loading technicians:', err)
        setAllTechnicians([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.organizationId])

  const filtered = allTechnicians.filter(t =>
    t.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (t.assignedZoneId ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const statusConfig = {
    online:  { label: 'En campo',       cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
    pending: { label: 'Con pendientes', cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    offline: { label: 'Offline',        cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  }

  return (
    <PageWrapper>
      <TopBar
        title="Mis Técnicos"
        subtitle="Monitoreo y asignación de equipo en campo"
      />

      <div className="p-6 space-y-5">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar técnico por nombre o zona..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {loading ? '...' : `${filtered.length} técnico${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                {['Técnico', 'Zona asignada', 'Última sync', 'Estado'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-5 py-4">
                      <div className="h-8 bg-muted/40 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-12 h-12 bg-blue-50 text-brand-primary rounded-full flex items-center justify-center">
                        <UserCheck size={24} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">
                          {search ? 'Sin resultados' : 'Sin técnicos'}
                        </div>
                        <div className="text-xs mt-1">
                          {search ? `No se encontró "${search}"` : 'No hay técnicos registrados en tu organización'}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((t, i) => {
                const sc = statusConfig[t.status]
                return (
                  <motion.tr
                    key={t.memberId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={t.fullName} size="sm" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${sc.dot}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{t.fullName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{t.userId.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin size={13} />
                        {t.assignedZoneId ? t.assignedZoneId.slice(-8) : 'Sin zona'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock size={13} />
                        {t.lastSyncAt ? formatRelativeTime(t.lastSyncAt) : '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}
