import { useState } from 'react'
import { Plus, UserPlus, Mail, Check, X } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { Avatar, TeamMemberRow, PageWrapper } from '@/components/shared'
import { mockTeamMembers } from '@/lib/mockData'
import { motion } from 'framer-motion'

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false)

  const online = mockTeamMembers.filter(m => m.isOnline).length
  const offline = mockTeamMembers.filter(m => !m.isOnline).length

  return (
    <PageWrapper>
      <TopBar
        title="Equipo del Proyecto"
        subtitle="Técnicos y asistentes bajo tu coordinación"
        actions={
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors"
          >
            <UserPlus size={16} /> Invitar miembro
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Summary pills */}
        <div className="flex items-center gap-3">
          {[
            { label: 'En línea', count: online, color: 'bg-green-100 text-green-700' },
            { label: 'Offline', count: offline, color: 'bg-gray-100 text-gray-600' },
            { label: 'Total equipo', count: mockTeamMembers.length, color: 'bg-brand-primary/10 text-brand-primary' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${s.color}`}>
              <span className="font-bold">{s.count}</span>
              <span className="opacity-80">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> En línea (sincronizado)</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Online con datos pendientes</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Offline</div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {['Miembro', 'Zona asignada', 'Hoy', 'Última sync', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockTeamMembers.map((m, i) => (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={m.user.fullName} size="sm" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.isOnline ? 'bg-green-500' : m.isPending ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{m.user.fullName}</div>
                        <div className="text-xs text-muted-foreground">{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">Zona {m.assignedZoneId?.slice(-3)}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-bold text-foreground">{m.formsToday ?? 0}</span>
                    <span className="text-xs text-muted-foreground ml-1">formularios</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {m.user.lastSyncAt ? 'Hace 30 min' : 'Hace 4h'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.isOnline ? 'bg-green-100 text-green-700' : m.isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.isOnline ? 'bg-green-500' : m.isPending ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                      {m.isOnline ? 'En campo' : m.isPending ? 'Con pendientes' : 'Offline'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-5">Invitar miembro al equipo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Nombre completo</label>
                <input placeholder="Ej: Juan Carlos Pérez" className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Correo electrónico</label>
                <input type="email" placeholder="correo@org.com" className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Rol</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                  <option value="technician">Técnico de Campo</option>
                  <option value="assistant">Asistente de Coordinador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Zona asignada</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                  <option>El Pozón</option>
                  <option>La Boquilla</option>
                  <option>Bayunca</option>
                  <option>Pasacaballo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary">
                <Mail size={16} /> Enviar invitación
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </PageWrapper>
  )
}
