import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { Shield, Clock, User, AlertTriangle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { motion } from 'framer-motion'

const auditLogs = [
  { id: 'log-001', user: 'Natan Chiquillo', action: 'Creó organización', detail: 'Alcaldía de Cartagena', level: 'info', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'log-002', user: 'María Rodríguez', action: 'Publicó formulario', detail: 'Ficha de Caracterización Socioeconómica v3', level: 'info', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'log-003', user: 'Sistema', action: 'Intento de acceso fallido', detail: 'email: hacker@evil.com — IP: 190.x.x.x', level: 'warning', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'log-004', user: 'Carlos Mendoza', action: 'Aprobó formulario', detail: 'Resp. ID: loc-001 — Ana García', level: 'info', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'log-005', user: 'Natan Chiquillo', action: 'Suspendió usuario', detail: 'luis@fundacion.org — Motivo: Inactividad prolongada', level: 'warning', timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 'log-006', user: 'Sistema', action: 'Backup completado', detail: 'Base de datos — 2.4 GB — OK', level: 'success', timestamp: new Date(Date.now() - 86400000).toISOString() },
]

const levelConfig = {
  info: { color: 'bg-blue-100 text-blue-700', icon: <Shield size={14} /> },
  warning: { color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle size={14} /> },
  success: { color: 'bg-green-100 text-green-700', icon: <Shield size={14} /> },
  error: { color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} /> },
}

export default function AuditPage() {
  return (
    <PageWrapper>
      <TopBar title="Auditoría del Sistema" subtitle="Registro de acciones y eventos de seguridad" />

      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Eventos hoy', value: '247', icon: <Clock size={18} />, color: 'bg-blue-50 text-blue-600' },
            { label: 'Alertas de seguridad', value: '3', icon: <AlertTriangle size={18} />, color: 'bg-yellow-50 text-yellow-600' },
            { label: 'Acciones de admin', value: '18', icon: <User size={18} />, color: 'bg-brand-primary/10 text-brand-primary' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Logs */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border font-bold text-foreground">
            Registro de Auditoría
          </div>
          <div className="divide-y divide-border">
            {auditLogs.map((log, i) => {
              const cfg = levelConfig[log.level as keyof typeof levelConfig] || levelConfig.info
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-5 py-3.5 flex items-start gap-4 hover:bg-muted/30"
                >
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 flex-shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{log.action}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{log.detail}</div>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    <div>{log.user}</div>
                    <div className="mt-0.5">{formatRelativeTime(log.timestamp)}</div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
