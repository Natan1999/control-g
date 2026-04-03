import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreVertical, Users, FileText, HardDrive, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { StatusBadge, PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'
import type { Models } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

interface OrganizationDocument extends Models.Document {
  name: string;
  nit: string;
  plan: string;
  contact_email: string;
  max_users: number;
  max_forms: number;
  max_storage_gb: number;
  status: string;
}

const planColors: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
  gobierno: 'bg-brand-primary/10 text-brand-primary',
}

export default function OrganizationsPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [organizations, setOrganizations] = useState<OrganizationDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // New Org Form State
  const [newOrg, setNewOrg] = useState({
    name: '',
    nit: '',
    plan: 'gobierno',
    contact_email: '',
    database_id: '',
    bucket_id: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.ORGANIZATIONS,
        [Query.orderDesc('$createdAt')]
      )
      setOrganizations(res.documents as unknown as OrganizationDocument[])
    } catch (error) {
      console.error('Error cargando organizaciones', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.ORGANIZATIONS,
        ID.unique(),
        {
          name: newOrg.name,
          nit: newOrg.nit,
          plan: newOrg.plan,
          contact_email: newOrg.contact_email,
          max_users: 100, // Default values
          max_forms: 1000,
          max_storage_gb: 5,
          database_id: newOrg.database_id || `db_${Date.now()}`,
          bucket_id: newOrg.bucket_id || `bucket_${Date.now()}`,
          status: 'active'
        }
      )
      setIsModalOpen(false)
      fetchOrganizations()
    } catch (error: any) {
      alert(`Error creando organización: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = organizations.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.contact_email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageWrapper>
      <TopBar
        title="Organizaciones"
        subtitle={loading ? 'Cargando organizaciones...' : `${organizations.length} organizaciones registradas`}
        actions={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors"
          >
            <Plus size={16} /> Nueva Organización
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, NIT o email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((org, i) => (
              <motion.div
                key={org.$id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-black text-xl">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm leading-tight">{org.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">NIT: {org.nit || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${planColors[org.plan] || planColors.starter}`}>
                        {org.plan}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={16} className="text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">{org.contact_email}</div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                      <Users size={14} className="mx-auto text-brand-primary mb-1" />
                      <div className="text-sm font-bold">{org.max_users}</div>
                      <div className="text-[10px] text-muted-foreground">User Límite</div>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                      <FileText size={14} className="mx-auto text-brand-secondary mb-1" />
                      <div className="text-sm font-bold">{org.max_forms}</div>
                      <div className="text-[10px] text-muted-foreground">Form Límite</div>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                      <HardDrive size={14} className="mx-auto text-purple-500 mb-1" />
                      <div className="text-sm font-bold">{org.max_storage_gb} GB</div>
                      <div className="text-[10px] text-muted-foreground">Storage</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                  <StatusBadge status={org.status} />
                  <button className="text-xs text-brand-primary font-medium hover:underline">Gestionar →</button>
                </div>
              </motion.div>
            ))}
            
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                No se encontraron organizaciones.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Nueva Organización */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="font-bold text-lg">Nueva Organización</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateOrg} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nombre</label>
                  <input
                    required
                    value={newOrg.name}
                    onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                    className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-brand-primary/30 outline-none"
                    placeholder="Ej. Alcaldía de Bogotá"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">NIT</label>
                    <input
                      required
                      value={newOrg.nit}
                      onChange={e => setNewOrg({...newOrg, nit: e.target.value})}
                      className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-brand-primary/30 outline-none"
                      placeholder="899.999.000-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Plan</label>
                    <select
                      value={newOrg.plan}
                      onChange={e => setNewOrg({...newOrg, plan: e.target.value})}
                      className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-brand-primary/30 outline-none"
                    >
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="gobierno">Gobierno</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Email Contacto</label>
                  <input
                    type="email"
                    required
                    value={newOrg.contact_email}
                    onChange={e => setNewOrg({...newOrg, contact_email: e.target.value})}
                    className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-brand-primary/30 outline-none"
                    placeholder="admin@alcaldia.gov.co"
                  />
                </div>
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Crear Organización
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
