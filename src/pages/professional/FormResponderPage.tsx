import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FormRenderer from '@/components/forms/FormRenderer'
import { FormDefinition } from '@/types'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { localDB } from '@/lib/dexie-db'

const FormResponderPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [formDef, setFormDef] = useState<FormDefinition | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadForm = async () => {
      if (!formId) return
      setLoading(true)

      try {
        let doc: any

        try {
          // 1. Try to load from Appwrite
          doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_IDS.FORMS,
            formId
          )
        } catch (apiError) {
          console.warn('Network error loading form, trying local cache...', apiError)
          // 2. Try to load from local cache
          const cachedRaw = localStorage.getItem(`cg_forms_${user?.entityId}`)
          const cachedForms = cachedRaw ? JSON.parse(cachedRaw) : []
          doc = cachedForms.find((f: any) => f.$id === formId)
          
          if (!doc) throw apiError // If still not found, fail
        }

        setFormDef({
          id: doc.$id,
          entityId: doc.entity_id || '',
          title: doc.name || doc.title || '',
          description: doc.description || '',
          type: doc.type || 'ex_ante',
          pages: JSON.parse(doc.pages_json || doc.definition || '[]'),
          status: doc.status || 'published',
          version: doc.v || 1,
          createdAt: doc.$createdAt,
          updatedAt: doc.$updatedAt
        } as FormDefinition)
      } catch (error) {
        console.error('Error loading form:', error)
      } finally {
        setLoading(false)
      }
    }

    loadForm()
  }, [formId, user?.entityId])

  const handleSubmit = async (answers: Record<string, any>) => {
    if (!formDef || !user) return

    try {
      // Create a local response object for Dexie
      // This is the CRITICAL part for offline-first
      await localDB.formResponses.add({
        localId: crypto.randomUUID(),
        formId: formDef.id,
        entityId: formDef.entityId,
        professionalId: user.id,
        familyId: '', // Would be linked if we had a family context
        answers: answers,
        status: 'completed', // Ready to be synced
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      // We trigger a sync attempt silently
      // In a real app, the sync-engine would pick this up via Dexie hooks or periodic checks
      navigate('/field/capture')
    } catch (err) {
      console.error('Failed to save response:', err)
      alert('Error al guardar la información localmente.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
        <Loader2 className="w-12 h-12 text-[#0038A8] animate-spin" />
        <p className="text-gray-500 font-bold tracking-tight">Cargando Formulario...</p>
      </div>
    )
  }

  if (!formDef || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-[40px] shadow-xl text-center border border-slate-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Formulario Indisponible</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            No pudimos cargar la definición técnica de este formulario. Verifica tu conexión o contacta a soporte.
          </p>
          <Button 
            className="w-full h-12 rounded-2xl bg-[#0038A8] hover:bg-[#002868] shadow-lg shadow-blue-900/20" 
            onClick={() => navigate('/field/capture')}
          >
            Regresar al Centro de Captura
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Premium Flat */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#0038A8] hover:bg-blue-50 transition-all border border-slate-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-sm font-black text-[#0038A8] truncate max-w-[200px]">
                {formDef.title}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                Recolección Técnica
              </p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-black text-slate-900">{user.fullName}</p>
              <p className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-tighter">Verificado</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-xs">
              {user.fullName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      {/* Form Content Wrapper */}
      <div className="pt-8 pb-32">
        <FormRenderer 
          definition={formDef}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

export default FormResponderPage
