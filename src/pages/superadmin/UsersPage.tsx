import { useState } from 'react'
import { Plus, Search, MoreVertical, UserCheck, UserX, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { Avatar, StatusBadge, PageWrapper } from '@/components/shared'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types'

const mockUsers: User[] = [
  { id: 'u1', organizationId: 'org-001', fullName: 'María Rodríguez', email: 'maria@cartagena.gov.co', role: 'coordinator', status: 'active', createdAt: '2026-01-15T00:00:00Z' },
  { id: 'u2', organizationId: 'org-001', fullName: 'Carlos Mendoza', email: 'carlos@cartagena.gov.co', role: 'assistant', status: 'active', createdAt: '2026-01-20T00:00:00Z' },
  { id: 'u3', organizationId: 'org-001', fullName: 'Ana García', email: 'ana@tecnicos.com', role: 'technician', status: 'active', createdAt: '2026-02-01T00:00:00Z', phone: '+57 315 123 4567' },
  { id: 'u4', organizationId: 'org-002', fullName: 'Pedro Suárez', email: 'pedro@ipse.gov.co', role: 'technician', status: 'inactive', createdAt: '2026-02-10T00:00:00Z' },
  { id: 'u5', organizationId: 'org-001', fullName: 'Sofía Herrera', email: 'sofia@cartagena.gov.co', role: 'technician', status: 'active', createdAt: '2026-02-15T00:00:00Z' },
  { id: 'u6', organizationId: 'org-003', fullName: 'Luis Martínez', email: 'luis@fundacion.org', role: 'coordinator', status: 'suspended', createdAt: '2026-02-20T00:00:00Z' },
]

export default function UsersPage() {
  const [search, setSearch] = useState('')

  const filtered = mockUsers.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageWrapper>
      <TopBar
        title="Usuarios Globales"
        subtitle="Todas las cuentas del sistema"
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors">
            <Plus size={16} /> Invitar Usuario
          </button>
        }
      />

      <div className="p-6 space-y-5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar usuarios..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {['Usuario', 'Rol', 'Organización', 'Registro', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.fullName} size="sm" />
                      <div>
                        <div className="text-sm font-semibold">{user.fullName}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{user.organizationId || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={user.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Enviar email">
                        <Mail size={14} className="text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Más opciones">
                        <MoreVertical size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}
