import { ClipboardList, UserCheck, Clock, MapPin } from 'lucide-react'
import { KPICard, TeamMemberRow, PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { mockTeamMembers, mockResponses } from '@/lib/mockData'
import { useAuthStore } from '@/stores/authStore'

export default function AssistDashboard() {
  const { user } = useAuthStore()

  return (
    <PageWrapper>
      <TopBar
        title={`Hola, ${user?.fullName?.split(' ')[0]} 👋`}
        subtitle="Panel del Asistente — Caracterización Bolívar 2026"
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Técnicos a cargo" value={4} icon={<UserCheck size={18} />} />
          <KPICard label="Pendientes revisión" value={12} icon={<Clock size={18} />} colorClass="bg-yellow-50 text-yellow-600" />
          <KPICard label="Aprobados hoy" value={28} icon={<ClipboardList size={18} />} colorClass="bg-green-50 text-green-600" change={5.2} />
          <KPICard label="En campo ahora" value={3} icon={<MapPin size={18} />} colorClass="bg-blue-50 text-blue-600" />
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
                  {['Técnico', 'Zona', 'Hoy', 'Sync', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockTeamMembers.slice(0, 4).map(m => <TeamMemberRow key={m.id} member={m} />)}
              </tbody>
            </table>
          </div>

          {/* Pending review */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Pendientes de revisión</h3>
              <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">12</span>
            </div>
            <div className="divide-y divide-border">
              {mockResponses.filter(r => r.status === 'in_review').map(r => (
                <div key={r.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold">{r.technicianName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.formName?.slice(0, 35)}... · {r.zoneName}</div>
                    {r.ocrConfidence && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                        OCR {Math.round(r.ocrConfidence * 100)}%
                      </span>
                    )}
                  </div>
                  <button className="text-xs bg-brand-primary text-white px-3 py-1 rounded-lg hover:bg-brand-secondary transition-colors flex-shrink-0 ml-3">
                    Revisar
                  </button>
                </div>
              ))}
              <div className="px-5 py-3.5 text-center text-xs text-muted-foreground">
                + 11 más pendientes de revisión
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
