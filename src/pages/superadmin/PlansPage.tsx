import { TopBar } from '@/components/layout/Sidebar'
import { CreditCard, Plus } from 'lucide-react'

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar 
        title="Planes y Licencias" 
        subtitle="Administra los límites y facturación de organizaciones"
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Plan</span>
          </button>
        }
      />

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-border p-6 text-center">
              <div className="w-full px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold inline-block mb-4">Gratis</div>
              <h4 className="font-bold text-2xl">Básico</h4>
              <p className="text-muted-foreground text-sm my-4">Hasta 5 técnicos<br/>Formularios ilimitados<br/>Sincronización manual</p>
              <button className="w-full py-2 bg-muted text-foreground rounded-lg font-bold">Activo</button>
            </div>
            
            <div className="bg-brand-primary text-white rounded-xl shadow-lg border border-brand-primary p-6 text-center transform scale-105">
              <div className="w-full px-2 py-1 bg-white/20 text-white rounded text-xs font-bold inline-block mb-4">Popular</div>
              <h4 className="font-bold text-2xl">Pro</h4>
              <p className="text-white/80 text-sm my-4">Hasta 50 técnicos<br/>Plantillas PDF y OCR<br/>Sincronización en tiempo real</p>
              <button className="w-full py-2 bg-white text-brand-primary rounded-lg font-bold shadow-md">Mejorar Plan</button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-border p-6 text-center">
              <div className="w-full px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold inline-block mb-4">Empresa</div>
              <h4 className="font-bold text-2xl">Enterprise</h4>
              <p className="text-muted-foreground text-sm my-4">Técnicos Ilimitados<br/>Marca blanca (Control G)<br/>Integración API</p>
              <button className="w-full py-2 border-2 border-brand-primary text-brand-primary rounded-lg font-bold">Contactar Ventas</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
