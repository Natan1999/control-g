import { ClipboardList, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { KPICard, ResponseRow, TeamMemberRow, PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { mockDailyData, mockZoneData, mockResponses, mockTeamMembers } from '@/lib/mockData'
import { useAuthStore } from '@/stores/authStore'

export default function CoordDashboard() {
  const { user } = useAuthStore()
  
  return (
    <PageWrapper>
      <TopBar
        title={`Buenos días, ${user?.fullName?.split(' ')[0]} 👋`}
        subtitle="Resumen del proyecto activo — Caracterización Socioeconómica Cartagena"
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard label="Formularios diseñados" value={8} icon={<ClipboardList size={18} />} />
          <KPICard label="Formularios diligenciados" value="1,842" icon={<CheckCircle size={18} />} colorClass="bg-green-50 text-green-600" change={14.2} />
          <KPICard label="Técnicos activos" value={18} icon={<Users size={18} />} colorClass="bg-blue-50 text-blue-600" />
          <KPICard label="Asistentes" value={3} icon={<Users size={18} />} colorClass="bg-purple-50 text-purple-600" />
          <KPICard label="Avance general" value={36.8} icon={<TrendingUp size={18} />} colorClass="bg-orange-50 text-orange-600" suffix="%" />
          <KPICard label="Pendientes validación" value={47} icon={<Clock size={18} />} colorClass="bg-yellow-50 text-yellow-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Recolección diaria — últimos 25 días</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockDailyData}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E86C1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2E86C1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2E86C1" strokeWidth={2.5} fill="url(#grad1)" name="Formularios" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Zone progress */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Avance por zona</h3>
            <div className="space-y-3">
              {mockZoneData.map(zone => {
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
                        style={{ backgroundColor: pct >= 80 ? '#27AE60' : pct >= 50 ? '#F39C12' : '#2E86C1' }}
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
              <button className="text-xs text-brand-primary hover:underline">Ver todos →</button>
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
                  {mockResponses.map(r => <ResponseRow key={r.id} response={r} />)}
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
                3 en línea
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
                  {mockTeamMembers.map(m => <TeamMemberRow key={m.id} member={m} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
