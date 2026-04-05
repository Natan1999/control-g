import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, CheckCircle, Plus, TrendingUp } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'

interface Stats {
  totalEntities: number
  activeEntities: number
  totalFamilies: number
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ totalEntities: 0, activeEntities: 0, totalFamilies: 0 })
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [Query.limit(20), Query.orderDesc('$createdAt')])
        const active = res.documents.filter((e: any) => e.status === 'active')
        setEntities(res.documents)
        setStats({ totalEntities: res.total, activeEntities: active.length, totalFamilies: 0 })
      } catch {
        setEntities([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kpis = [
    { label: 'Total Entidades', value: stats.totalEntities, icon: <Building2 size={20} />, color: '#1B3A4B' },
    { label: 'Contratos Activos', value: stats.activeEntities, icon: <CheckCircle size={20} />, color: '#27AE60' },
    { label: 'Usuarios del Sistema', value: '—', icon: <Users size={20} />, color: '#3D7B9E' },
    { label: 'Crecimiento', value: '+12%', icon: <TrendingUp size={20} />, color: '#F39C12' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <TopBar
        title="Dashboard Administrador"
        subtitle="Gestión global de entidades — DRAN Digital S.A.S."
        actions={
          <button
            onClick={() => navigate('/admin/entities')}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold"
            style={{ background: '#1B3A4B' }}
          >
            <Plus size={16} /> Nueva Entidad
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                   style={{ background: kpi.color }}>
                {kpi.icon}
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Entities list */}
      <div className="bg-white rounded-2xl border border-border shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Entidades registradas</h2>
          <button
            onClick={() => navigate('/admin/entities')}
            className="text-sm font-semibold"
            style={{ color: '#1B3A4B' }}
          >
            Ver todas →
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : entities.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay entidades registradas aún.</p>
            <button
              onClick={() => navigate('/admin/entities')}
              className="mt-3 px-4 py-2 text-white rounded-xl text-sm font-semibold"
              style={{ background: '#1B3A4B' }}
            >
              Crear primera entidad
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entities.slice(0, 5).map((entity: any) => (
              <div key={entity.$id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">{entity.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Contrato: {entity.contract_number} · {entity.operator_name}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  entity.status === 'active' ? 'bg-green-100 text-green-700' :
                  entity.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {entity.status === 'active' ? 'Activo' : entity.status === 'suspended' ? 'Suspendido' : 'Completado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
