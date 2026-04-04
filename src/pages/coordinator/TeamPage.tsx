import { useState, useEffect } from 'react'
import { UserPlus, Mail, Check } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { Avatar, PageWrapper } from '@/components/shared'
import { listProjects, getProjectMembers } from '@/lib/appwrite-db'
import { register } from '@/lib/appwrite-auth'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false)
  const { user } = useAuthStore()
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'technician', zone: '' })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => {
    async function loadTeam() {
      if (!user?.organizationId) return

      try {
        setLoading(true)
        const projects = await listProjects({ organizationId: user.organizationId, coordinatorId: user.id })

        let allMembers: any[] = []
        if (projects.documents.length > 0) {
          const mainProject = projects.documents[0]
          const members = await getProjectMembers(mainProject.$id)

          allMembers = members.map(m => ({
            id: m.$id,
            user: {
              fullName: m.user_id,
              email: 'usuario@email.com',
              lastSyncAt: m.$updatedAt
            },
            assignedZoneId: m.assigned_zone_id,
            formsToday: 0,
            isOnline: true,
            isPending: false
          }))
        }
        setTeamMembers(allMembers)
      } catch (err) {
        console.error('Error fetching team members:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTeam()
  }, [user])

  const handleInvite = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      setInviteError('Nombre y email son requeridos')
      return
    }
    setInviting(true)
    setInviteError('')
    try {
      const tempPassword = 'ControlG2026!'
      await register(
        inviteForm.email,
        tempPassword,
        inviteForm.name,
        inviteForm.role as 'technician' | 'assistant' | 'coordinator' | 'superadmin',
        user?.organizationId || null
      )
      setInviteSuccess(true)
      setTimeout(() => {
        setShowInvite(false)
        setInviteSuccess(false)
        setInviteForm({ name: '', email: '', role: 'technician', zone: '' })
      }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta. El email puede ya estar registrado.'
      setInviteError(msg)
    } finally {
      setInviting(false)
    }
  }

  const online = teamMembers.filter(m => m.isOnline).length
  const offline = teamMembers.filter(m => !m.isOnline).length

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
            { label: 'Total equipo', count: teamMembers.length, color: 'bg-brand-primary/10 text-brand-primary' },
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
              {teamMembers.map((m, i) => (
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
                    {m.user.lastSyncAt ? new Date(m.user.lastSyncAt).toLocaleTimeString() : 'N/A'}
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
              {loading && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Cargando equipo...</td></tr>
              )}
              {!loading && teamMembers.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No se ha encontrado a ningún miembro del equipo activo.</td></tr>
              )}
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

            {inviteSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={28} className="text-green-600" />
                </div>
                <p className="text-base font-semibold text-green-700">¡Cuenta creada exitosamente!</p>
                <p className="text-sm text-muted-foreground text-center">
                  {inviteForm.name} puede ingresar con la contraseña temporal <span className="font-mono font-bold">ControlG2026!</span>
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Nombre completo</label>
                    <input
                      value={inviteForm.name}
                      onChange={e => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Juan Carlos Pérez"
                      className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Correo electrónico</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="correo@org.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Rol</label>
                    <select
                      value={inviteForm.role}
                      onChange={e => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      <option value="technician">Técnico de Campo</option>
                      <option value="assistant">Asistente de Coordinador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Zona asignada</label>
                    <select
                      value={inviteForm.zone}
                      onChange={e => setInviteForm(prev => ({ ...prev, zone: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      <option value="">Sin zona asignada</option>
                      <option value="el_pozon">El Pozón</option>
                      <option value="la_boquilla">La Boquilla</option>
                      <option value="bayunca">Bayunca</option>
                      <option value="pasacaballo">Pasacaballo</option>
                    </select>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-red-500 font-medium">{inviteError}</p>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setShowInvite(false); setInviteError(''); setInviteForm({ name: '', email: '', role: 'technician', zone: '' }) }}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={inviting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-colors disabled:opacity-60"
                  >
                    {inviting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Creando cuenta...
                      </>
                    ) : (
                      <><Mail size={16} /> Enviar invitación</>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </PageWrapper>
  )
}
