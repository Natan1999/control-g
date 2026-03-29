import { Download, FileText, CheckCircle, Wifi, WifiOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { mockForms } from '@/lib/mockData'
import { useState } from 'react'

export default function TemplatesPage() {
  const [downloaded, setDownloaded] = useState<string[]>([])

  const handleDownload = (formId: string) => {
    setTimeout(() => setDownloaded(prev => [...prev, formId]), 500)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Plantillas" />

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        <p className="text-xs text-muted-foreground mb-4">
          Descarga versiones imprimibles de los formularios para llenar a mano y escanear después.
        </p>

        <div className="space-y-3">
          {mockForms.map((form, i) => {
            const isDownloaded = downloaded.includes(form.id)

            return (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-border p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={22} className="text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm leading-tight">{form.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded-full">{form.totalFields} campos</span>
                      <span className="bg-muted px-2 py-0.5 rounded-full">{form.schema.pages.length} páginas</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  {isDownloaded ? (
                    <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                      <CheckCircle size={14} />
                      Disponible offline
                      <WifiOff size={12} className="ml-1" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wifi size={12} /> Requiere conexión
                    </span>
                  )}
                  <button
                    onClick={() => handleDownload(form.id)}
                    disabled={isDownloaded}
                    className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isDownloaded
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-brand-primary text-white hover:bg-brand-secondary'
                    }`}
                  >
                    {isDownloaded ? (
                      <><CheckCircle size={14} /> Descargado</>
                    ) : (
                      <><Download size={14} /> Descargar PDF</>
                    )}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Downloaded section */}
        {downloaded.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wide">
              Disponibles offline
            </h2>
            <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
              <p className="text-xs text-green-700">
                ✓ {downloaded.length} plantilla(s) guardada(s) en tu dispositivo. Puedes acceder sin internet.
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
