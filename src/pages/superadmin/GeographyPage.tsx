import { useState, useEffect, useMemo } from 'react'
import { TopBar } from '@/components/layout/Sidebar'
import { 
  MapPin, 
  Plus, 
  Search, 
  RefreshCw, 
  Download, 
  Upload,
  Database,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { geographyService } from '@/services/geographyService'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function GeographyPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [municipalities, setMunicipalities] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [selectedMunForZone, setSelectedMunForZone] = useState<any | null>(null)
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneType, setNewZoneType] = useState('Barrio')
  
  const [loading, setLoading] = useState(true)
  const [loadingZones, setLoadingZones] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const [syncProgress, setSyncProgress] = useState(0)
  const [showSyncModal, setShowSyncModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const depts = await geographyService.listDepartments()
      setDepartments(depts)
      if (depts.length > 0) {
        const muns = await geographyService.listMunicipalities()
        setMunicipalities(muns)
      }
    } catch (error) {
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudieron obtener los datos geográficos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenZoneManager = async (mun: any) => {
    setSelectedMunForZone(mun)
    setLoadingZones(true)
    setIsZoneModalOpen(true)
    try {
      const existingZones = await geographyService.listZones(mun.$id)
      setZones(existingZones)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingZones(false)
    }
  }

  const handleCreateZone = async () => {
    if (!newZoneName || !selectedMunForZone) return
    try {
      await geographyService.createZone({
        municipalityId: selectedMunForZone.$id,
        name: newZoneName,
        type: newZoneType
      })
      toast({ title: 'Zona creada' })
      setNewZoneName('')
      handleOpenZoneManager(selectedMunForZone) // Refresh
    } catch (error) {
      toast({ title: 'Error al crear zona', variant: 'destructive' })
    }
  }

  const handleDeleteZone = async (id: string) => {
    try {
      await geographyService.deleteZone(id)
      setZones(zones.filter(z => z.$id !== id))
      toast({ title: 'Zona eliminada' })
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  const handleSyncApi = async () => {
    setIsSyncing(true)
    setSyncProgress(0)
    try {
      await geographyService.syncWithApi((msg, progress) => {
        setSyncStatus(msg)
        setSyncProgress(progress)
      })
      toast({
        title: 'Sincronización completa',
        description: 'Se han actualizado los departamentos y municipios.',
      })
      loadData()
      setTimeout(() => setShowSyncModal(false), 2000)
    } catch (error) {
      toast({
        title: 'Error en sincronización',
        description: 'Ocurrió un problema al conectar con el API.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsSyncing(true)
    setSyncProgress(0)
    setSyncStatus('Iniciando importación CSV...')
    
    try {
      await geographyService.importFromCSV(file, (msg, progress) => {
        setSyncStatus(msg)
        setSyncProgress(progress)
      })
      toast({
        title: 'Importación exitosa',
        description: 'Los datos del archivo han sido procesados.',
      })
      loadData()
      setTimeout(() => setShowSyncModal(false), 2000)
    } catch (error) {
      toast({
        title: 'Error de importación',
        description: 'El formato del archivo no es válido o hubo un error de red.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Filtered lists
  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.code.includes(searchTerm)
  )

  const filteredMunicipalities = municipalities.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.code.includes(searchTerm)
    const matchesDept = selectedDept ? m.department_id === selectedDept : true
    return matchesSearch && matchesDept
  })

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <TopBar 
        title="Geografía y DIVIPOLA" 
        subtitle="Estructura territorial del sistema Control G"
        actions={
          <div className="flex gap-2">
            <Dialog open={showSyncModal} onOpenChange={setShowSyncModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Database size={16} />
                  <span>Importar/Sincronizar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Importar Estructura DIVIPOLA</DialogTitle>
                  <DialogDescription>
                    Actualiza la base de datos de departamentos y municipios desde fuentes oficiales o archivos locales.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {isSyncing ? (
                    <div className="space-y-4 py-8">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="animate-spin text-brand-primary" size={32} />
                        <p className="text-sm font-medium">{syncStatus}</p>
                        <p className="text-xs text-muted-foreground">{syncProgress}% completo</p>
                      </div>
                      <Progress value={syncProgress} className="h-2" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleSyncApi}
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl hover:bg-neutral-50 hover:border-brand-primary transition-all group"
                      >
                        <div className="w-12 h-12 bg-blue-50 text-brand-primary rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <RefreshCw size={24} />
                        </div>
                        <span className="text-sm font-bold">API Colombia</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">Sincronización automática</span>
                      </button>

                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl hover:bg-neutral-50 hover:border-brand-primary transition-all group cursor-pointer">
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                        <div className="w-12 h-12 bg-green-50 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload size={24} />
                        </div>
                        <span className="text-sm font-bold">Archivo CSV</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">Importar desde DANE</span>
                      </label>
                    </div>
                  )}

                  {!isSyncing && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3 text-xs text-amber-800">
                      <AlertCircle className="shrink-0" size={16} />
                      <p>
                        Esta acción actualizará los nombres y códigos oficiales. Los datos de pacientes y visitas vinculados se mantendrán, pero los municipios nuevos aparecerán automáticamente.
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button className="gap-2 bg-brand-primary hover:bg-brand-secondary transition-colors">
              <Plus size={16} />
              <span className="hidden sm:inline">Nueva Zona Local</span>
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Departamentos</p>
                <p className="text-2xl font-bold">{departments.length}</p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center">
                <Database size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Municipios</p>
                <p className="text-2xl font-bold">{municipalities.length}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Plus size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zonas Personalizadas</p>
                <p className="text-2xl font-bold">{zones.length}</p>
              </div>
            </motion.div>
          </div>

          {/* Search and Content */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="Buscar por nombre o código..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  className="w-full sm:w-48 h-10 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary"
                  value={selectedDept || ''}
                  onChange={(e) => setSelectedDept(e.target.value || null)}
                >
                  <option value="">Todos los Deptos</option>
                  {departments.map(d => (
                    <option key={d.$id} value={d.$id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <Tabs defaultValue="municipalities" className="w-full">
              <TabsList className="bg-neutral-100 p-1 mb-4 h-auto">
                <TabsTrigger value="departments" className="py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Departamentos
                </TabsTrigger>
                <TabsTrigger value="municipalities" className="py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Municipios
                </TabsTrigger>
                <TabsTrigger value="custom-zones" className="py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Zonas (Barrios/Veredas)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="departments">
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden min-h-[400px]">
                  {loading ? (
                    <div className="flex items-center justify-center p-20">
                      <Loader2 className="animate-spin text-brand-primary" size={40} />
                    </div>
                  ) : filteredDepartments.length === 0 ? (
                    <EmptyState 
                      title="No se encontraron departamentos" 
                      description="La búsqueda no arrojó resultados o la base de datos está vacía." 
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                          <TableHead className="w-20">Código</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDepartments.map((dept) => (
                          <TableRow key={dept.$id} className="group hover:bg-neutral-50/50">
                            <TableCell className="font-mono text-xs font-bold text-muted-foreground">{dept.code}</TableCell>
                            <TableCell className="font-semibold">{dept.name}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="group-hover:opacity-100 opacity-0 transition-opacity">
                                <Edit2 size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="municipalities">
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden min-h-[400px]">
                  {loading ? (
                    <div className="flex items-center justify-center p-20">
                      <Loader2 className="animate-spin text-brand-primary" size={40} />
                    </div>
                  ) : filteredMunicipalities.length === 0 ? (
                    <EmptyState 
                      title="No se encontraron municipios" 
                      description="Intenta ajustando el filtro de búsqueda o el departamento seleccionado." 
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                          <TableHead className="w-20">DIVIPOLA</TableHead>
                          <TableHead>Municipio</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMunicipalities.map((mun) => {
                          const dept = departments.find(d => d.$id === mun.department_id)
                          return (
                            <TableRow key={mun.$id} className="group hover:bg-neutral-50/50">
                              <TableCell className="font-mono text-xs font-bold text-muted-foreground">{mun.code}</TableCell>
                              <TableCell className="font-semibold">{mun.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-normal">
                                  {dept?.name || 'Cargando...'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical size={14} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      className="gap-2 cursor-pointer"
                                      onClick={() => handleOpenZoneManager(mun)}
                                    >
                                      <Plus size={14} />
                                      <span>Gestionar Zonas</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2">
                                      <Edit2 size={14} />
                                      <span>Editar Municipio</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="custom-zones">
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mb-4">
                    <MapPin size={32} />
                  </div>
                  <h3 className="text-lg font-bold">Zonas Personalizadas</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-2">
                    Las zonas locales son divisiones específicas (barrios, veredas) creadas para mejorar el seguimiento de visitas y pacientes.
                  </p>
                  <Button variant="outline" className="mt-6 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white">
                    Crear mi primera zona
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Zone Manager Modal */}
      <Dialog open={isZoneModalOpen} onOpenChange={setIsZoneModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Zonas - {selectedMunForZone?.name}</DialogTitle>
            <DialogDescription>
              Crea barrios, veredas o sectores para este municipio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex gap-2">
              <div className="flex-[2]">
                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Nombre de la Zona</label>
                <Input 
                  placeholder="Ej: Barrio El Centro, Vereda La Linda..." 
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Tipo</label>
                <select 
                  className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary"
                  value={newZoneType}
                  onChange={(e) => setNewZoneType(e.target.value)}
                >
                  <option value="Barrio">Barrio</option>
                  <option value="Vereda">Vereda</option>
                  <option value="Corregimiento">Corregimiento</option>
                  <option value="Comuna">Comuna</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateZone} disabled={!newZoneName} className="bg-brand-primary">
                  Añadir
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {loadingZones ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-brand-primary" />
                </div>
              ) : zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
                  <MapPin size={32} />
                  <p className="text-sm mt-2">No hay zonas creadas aún</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.$id}>
                        <TableCell className="font-medium">{zone.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{zone.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteZone(zone.$id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-20 text-center">
      <div className="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mb-4">
        <Search size={32} />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mt-2">{description}</p>
    </div>
  )
}
