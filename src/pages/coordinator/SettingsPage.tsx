import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Globe, Lock, Palette, Database, Webhook, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { useAuthStore } from '@/stores/authStore'

const tabs = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'security', label: 'Seguridad', icon: Lock },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'data', label: 'Datos y Backup', icon: Database },
  { id: 'integrations', label: 'Integraciones', icon: Webhook },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('general')
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    orgName: 'Gobernación de Bolívar',
    timezone: 'America/Bogota',
    language: 'es',
    autoSync: true,
    syncInterval: '15',
    offlineMode: true,
    emailAlerts: true,
    pushAlerts: true,
    whatsapp: false,
    theme: 'light',
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <PageWrapper>
      <TopBar title="Configuración" subtitle="Personaliza tu experiencia y preferencias de la plataforma"
        actions={
          <button onClick={handleSave}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            {saved ? <CheckCircle size={15} /> : <Save size={15} />}
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        }
      />
      <div className="flex gap-0 h-[calc(100vh-73px)]">
        {/* Sidebar tabs */}
        <div className="w-52 border-r border-border bg-card overflow-y-auto py-4">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-brand-primary bg-brand-primary/8 border-r-2 border-brand-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
            className="space-y-6 max-w-2xl">

            {activeTab === 'general' && (
              <>
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-foreground">Información de la organización</h3>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Nombre de la organización</label>
                    <input value={form.orgName} onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Zona horaria</label>
                    <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                      <option value="America/Bogota">Colombia (UTC-5)</option>
                      <option value="America/Lima">Perú (UTC-5)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Idioma de la interfaz</label>
                    <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-foreground">Sincronización Offline</h3>
                  {[
                    { key: 'autoSync', label: 'Sincronización automática', desc: 'Sincroniza datos al detectar conexión' },
                    { key: 'offlineMode', label: 'Modo offline agresivo', desc: 'Guarda más datos localmente para zonas con mala señal' },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                      <button onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key as keyof typeof f] }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${form[opt.key as keyof typeof form] ? 'bg-brand-primary' : 'bg-muted-foreground/30'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form[opt.key as keyof typeof form] ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  ))}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Intervalo de sync automático</label>
                    <select value={form.syncInterval} onChange={e => setForm(f => ({ ...f, syncInterval: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                      <option value="5">Cada 5 minutos</option>
                      <option value="15">Cada 15 minutos</option>
                      <option value="30">Cada 30 minutos</option>
                      <option value="60">Cada hora</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-foreground">Canales de notificación</h3>
                {[
                  { key: 'emailAlerts', label: 'Alertas por email', desc: 'Recibe resúmenes diarios y alertas críticas' },
                  { key: 'pushAlerts', label: 'Notificaciones push', desc: 'Alertas en tiempo real en el navegador' },
                  { key: 'whatsapp', label: 'WhatsApp Bot', desc: 'Recibe reportes y alertas por WhatsApp (beta)' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                    <button onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key as keyof typeof f] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form[opt.key as keyof typeof form] ? 'bg-brand-primary' : 'bg-muted-foreground/30'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form[opt.key as keyof typeof form] ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-5">
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-foreground">Cambiar contraseña</h3>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Contraseña actual</label>
                    <input type="password" placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Nueva contraseña</label>
                    <input type="password" placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                  </div>
                  <button className="bg-brand-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-secondary transition-colors">
                    Actualizar contraseña
                  </button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-amber-800">Autenticación de dos factores</div>
                    <div className="text-xs text-amber-600 mt-1">Próximamente disponible para todas las cuentas.</div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'appearance' || activeTab === 'data' || activeTab === 'integrations') && (
              <div className="bg-card rounded-2xl border border-border p-8 shadow-sm text-center">
                <div className="text-4xl mb-4">🚧</div>
                <h3 className="font-bold text-foreground text-lg mb-2">Próximamente</h3>
                <p className="text-muted-foreground text-sm">Esta sección estará disponible en la próxima versión de Control G.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  )
}
