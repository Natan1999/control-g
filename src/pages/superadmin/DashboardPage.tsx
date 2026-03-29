import { Building2, Users, MapPin, Server, TrendingUp, AlertCircle, CheckCircle, Plus, Eye, Settings } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { KPICard, StatusBadge, Avatar, PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { mockOrganizations } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'

const planData = [
  { name: 'Gobierno', value: 8, color: '#1A5276' },
  { name: 'Enterprise', value: 12, color: '#2E86C1' },
  { name: 'Professional', value: 19, color: '#5DADE2' },
  { name: 'Starter', value: 7, color: '#AED6F1' },
]

const growthData = [
  { month: 'Oct', orgs: 28, users: 342 },
  { month: 'Nov', orgs: 31, users: 398 },
  { month: 'Dic', orgs: 35, users: 449 },
  { month: 'Ene', orgs: 38, users: 512 },
  { month: 'Feb', orgs: 42, users: 623 },
  { month: 'Mar', orgs: 46, users: 748 },
]

export default function SuperDashboard() {
  return (
    <PageWrapper>
      <TopBar
        title="Panel de Control Global"
        subtitle="Vista general de todas las organizaciones"
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors">
            <Plus size={16} /> Nueva Organización
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Organizaciones activas" value={46} icon={<Building2 size={20} />} change={9.5} />
          <KPICard label="Usuarios totales" value="1,842" icon={<Users size={20} />} colorClass="bg-blue-50 text-blue-600" change={12.3} />
          <KPICard label="Formularios respondidos" value="87,429" icon={<CheckCircle size={20} />} colorClass="bg-green-50 text-green-600" change={18.7} />
          <KPICard label="Alertas activas" value={3} icon={<AlertCircle size={20} />} colorClass="bg-red-50 text-red-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Growth Chart */}
          <div className="lg:col-span-2 bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Crecimiento mensual</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orgs" stroke="#1A5276" strokeWidth={2.5} dot={{ r: 4 }} name="Orgs" />
                <Line type="monotone" dataKey="users" stroke="#2E86C1" strokeWidth={2.5} dot={{ r: 4 }} name="Usuarios" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Plan Distribution */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Distribución de planes</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={planData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {planData.map(p => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground">{p.name}</span>
                  </div>
                  <span className="font-semibold">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Uptime API', value: '99.97%', sub: 'Últimos 30 días', ok: true },
            { label: 'Latencia P95', value: '142ms', sub: 'Promedio hoy', ok: true },
            { label: 'Storage usado', value: '2.4 TB', sub: 'de 10 TB', ok: true },
            { label: 'OCR requests hoy', value: '1,284', sub: 'de 50K/mes', ok: true },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <Server size={14} className={m.ok ? 'text-green-500' : 'text-red-500'} />
              </div>
              <div className="text-xl font-bold">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Organizations Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">Organizaciones recientes</h3>
            <button className="text-sm text-brand-primary font-medium hover:underline flex items-center gap-1">
              <Eye size={14} /> Ver todas
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  {['Organización', 'Plan', 'Usuarios', 'Formularios', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockOrganizations.map(org => (
                  <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm">
                          {org.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{org.name}</div>
                          <div className="text-xs text-muted-foreground">{org.nit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-full capitalize">
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm">{Math.floor(org.maxUsers * 0.6)} / {org.maxUsers}</td>
                    <td className="px-5 py-3.5 text-sm">{Math.floor(org.maxForms * 0.7)} / {org.maxForms}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={org.status} /></td>
                    <td className="px-5 py-3.5">
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Settings size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
