import { TopBar } from '@/components/layout/Sidebar'
import { AlertCircle, Filter, Search } from 'lucide-react'

export default function IncidentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar 
        title="Novedades (Incidencias)" 
        subtitle="Visualiza problemas reportados por los técnicos"
      />

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text"
                placeholder="Buscar novedad o incidencia..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <button className="flex items-center gap-2 bg-white border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              <Filter size={16} />
              <span>Filtrar</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sin Novedades</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                No hay incidencias reportadas por tu equipo de técnicos en el momento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
