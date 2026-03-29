import { TopBar } from '@/components/layout/Sidebar'
import { Settings, Save } from 'lucide-react'

export default function SuperSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar 
        title="Configuración Global" 
        subtitle="Ajustes de la plataforma y seguridad"
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors">
            <Save size={16} />
            <span className="hidden sm:inline">Guardar Cambios</span>
          </button>
        }
      />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-brand-primary rounded-xl flex items-center justify-center">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Ajustes Base</h3>
                <p className="text-sm text-muted-foreground">Opciones generales para la instancia principal.</p>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <div>
                    <div className="font-semibold text-sm">Modo Mantenimiento</div>
                    <div className="text-xs text-muted-foreground">Suspende el acceso temporalmente.</div>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 left-0 top-0 transition-all checked:right-0 checked:border-brand-primary"/>
                    <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"></label>
                  </div>
                </div>
                
                <hr className="border-border"/>
                
                <div className="flex justify-between items-center py-2">
                  <div>
                    <div className="font-semibold text-sm">Registro Público (Sign Up)</div>
                    <div className="text-xs text-muted-foreground">Permitir a nuevas organizaciones registrarse.</div>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-brand-primary border-4 appearance-none cursor-pointer border-brand-primary right-0 top-0 transition-all"/>
                    <label className="toggle-label block overflow-hidden h-5 rounded-full bg-brand-primary cursor-pointer"></label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
