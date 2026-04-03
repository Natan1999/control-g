import { useState, useEffect } from 'react'
import { Building2, Users, MapPin, Server, TrendingUp, AlertCircle, CheckCircle, Plus, Eye, Settings } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { KPICard, StatusBadge, Avatar, PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, Models } from 'appwrite'
import { Link } from 'react-router-dom'

interface OrganizationDocument extends Models.Document {
  name: string;
  nit: string;
  plan: string;
  max_users: number;
  max_forms: number;
  status: string;
}

const planData = [
  { name: 'Gobierno', value: 8, color: 'hsl(var(--primary))' },
  { name: 'Enterprise', value: 12, color: 'hsl(var(--secondary))' },
  { name: 'Professional', value: 19, color: 'hsl(210 60% 45%)' },
  { name: 'Starter', value: 7, color: 'hsl(210 40% 70%)' },
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
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    activeAlerts: 0,
  });
  const [recentOrgs, setRecentOrgs] = useState<OrganizationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Load counts
        const orgsData = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_IDS.ORGANIZATIONS,
          [Query.orderDesc('$createdAt'), Query.limit(5)]
        );
        const usersData = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_IDS.USER_PROFILES,
          [Query.limit(1)] // Solo para obtener el total
        );

        setStats({
          totalOrgs: orgsData.total,
          totalUsers: usersData.total,
          activeAlerts: 3 // Mocked por ahora
        });
        setRecentOrgs(orgsData.documents as unknown as OrganizationDocument[]);
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [])

  return (
    <PageWrapper>
      <TopBar
        title="Panel de Control Global"
        subtitle="Vista general de todas las organizaciones"
        actions={
          <Link to="/admin/organizations" className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors">
            <Plus size={16} /> Gestionar Organzaciones
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Organizaciones activas" value={loading ? '...' : stats.totalOrgs} icon={<Building2 size={20} />} change={9.5} />
          <KPICard label="Usuarios totales" value={loading ? '...' : stats.totalUsers} icon={<Users size={20} />} colorClass="bg-blue-50 text-blue-600" change={12.3} />
          <KPICard label="Formularios respondidos" value="87,429" icon={<CheckCircle size={20} />} colorClass="bg-green-50 text-green-600" change={18.7} />
          <KPICard label="Alertas activas" value={stats.activeAlerts} icon={<AlertCircle size={20} />} colorClass="bg-red-50 text-red-600" />
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
                <Line type="monotone" dataKey="orgs" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} name="Orgs" />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--secondary))" strokeWidth={2.5} dot={{ r: 4 }} name="Usuarios" />
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
            <Link to="/admin/organizations" className="text-sm text-brand-primary font-medium hover:underline flex items-center gap-1">
              <Eye size={14} /> Ver todas
            </Link>
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
                {recentOrgs.map(org => (
                  <tr key={org.$id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm uppercase">
                          {org.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{org.name}</div>
                          <div className="text-xs text-muted-foreground">{org.nit || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-full capitalize">
                        {org.plan || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm">{org.max_users}</td>
                    <td className="px-5 py-3.5 text-sm">{org.max_forms}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={org.status || 'active'} /></td>
                    <td className="px-5 py-3.5">
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Settings size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {recentOrgs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                      Noy hay organizaciones recientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
