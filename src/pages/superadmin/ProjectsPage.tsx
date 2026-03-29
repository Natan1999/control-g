import { TopBar } from '@/components/layout/Sidebar'
import { FolderOpen, Plus, Search } from 'lucide-react'

export default function SuperProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar 
        title="Proyectos Globales" 
        subtitle="Visualiza y gestiona todos los proyectos de las organizaciones"
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Proyecto</span>
          </button>
        }
      />

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text"
                placeholder="Buscar por organización o nombre..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 text-brand-primary rounded-full flex items-center justify-center mb-4">
                <FolderOpen size={32} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sin Proyectos</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                Aún no existen proyectos activos en la plataforma. Solo los coordinadores pueden inicializar proyectos específicos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
