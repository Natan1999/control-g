import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FormRenderer from '@/components/forms/FormRenderer'
import { FormDefinition } from '@/types'
import { databases, DATABASE_ID, COLLECTION_IDS, Query } from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { localDB } from '@/lib/dexie-db'
import { BUCKET_IDS } from '@/lib/backend'
import {
  getCachedFormAssignments,
  getCachedForms,
  isOnline,
  processSyncQueue,
  refreshPendingCount,
} from '@/lib/sync-engine'
import { captureGeoMetadata, sha256Blob } from '@/lib/capture-integrity'

const FormResponderPage: React.FC = () => {
  const { formId, familyId } = useParams<{ formId: string; familyId?: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [formDef, setFormDef] = useState<FormDefinition | null>(null)
  const [initialAnswers, setInitialAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const draftLocalId = useRef<string>(crypto.randomUUID())

  useEffect(() => {
    const loadForm = async () => {
      if (!formId) return
      setLoading(true)
      setLoadError('')

      try {
        const cachedAssignments = getCachedFormAssignments(user?.entityId, user?.id)
        let assigned = cachedAssignments.some((assignment: any) => assignment.form_id === formId)
        const connected = await isOnline()

        if (connected && user?.id) {
          try {
            const assignmentResult = await databases.listDocuments(
              DATABASE_ID,
              COLLECTION_IDS.FORM_ASSIGNMENTS,
              [
                Query.equal('form_id', formId),
                Query.equal('professional_id', user.id),
                Query.equal('status', 'active'),
                Query.limit(1),
              ],
            )
            assigned = assignmentResult.documents.length > 0
          } catch (assignmentError) {
            if (!assigned) throw assignmentError
          }
        }

        if (!assigned) {
          throw new Error('Este formulario no está asignado a tu perfil. Solicita la asignación a coordinación.')
        }

        let doc: any = getCachedForms(user?.entityId).find((form: any) => form.$id === formId)

        if (connected) {
          try {
            doc = await databases.getDocument(
              DATABASE_ID,
              COLLECTION_IDS.FORMS,
              formId
            )
          } catch (apiError) {
            console.warn('No fue posible actualizar el formulario; se usará la copia local.', apiError)
            if (!doc) throw apiError
          }
        }

        if (!doc) throw new Error('El formulario no está disponible en la copia local.')

        if (user?.id) {
          const drafts = await localDB.formResponses
            .where('formId')
            .equals(formId)
            .filter(response => response.status === 'draft'
              && response.professionalId === user.id
              && response.familyId === (familyId || null))
            .toArray()
          const draft = drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0]
          if (draft) {
            draftLocalId.current = draft.localId
            setInitialAnswers(draft.answers)
          }
        }

        setFormDef({
          id: doc.$id,
          entityId: doc.entity_id || '',
          title: doc.name || doc.title || '',
          description: doc.description || '',
          type: doc.type || 'ex_ante',
          pages: JSON.parse(doc.definition || doc.pages_json || '[]'),
          status: doc.status || 'published',
          version: doc.v || 1,
          createdAt: doc.$createdAt,
          updatedAt: doc.$updatedAt
        } as FormDefinition)
      } catch (error) {
        console.error('Error loading form:', error)
        setLoadError(error instanceof Error ? error.message : 'No fue posible cargar el formulario.')
      } finally {
        setLoading(false)
      }
    }

    loadForm()
  }, [familyId, formId, user?.entityId, user?.id])

  const handleSaveDraft = async (answers: Record<string, any>) => {
    if (!formDef || !user) return
    const now = Date.now()
    const existing = await localDB.formResponses.get(draftLocalId.current)
    await localDB.formResponses.put({
      localId: draftLocalId.current,
      formId: formDef.id,
      entityId: user.entityId || formDef.entityId,
      professionalId: user.id,
      familyId: familyId || null,
      answers,
      status: 'draft',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    })
  }

  const handleSubmit = async (answers: Record<string, any>) => {
    if (!formDef || !user) return

    try {
      // GNSS works without data service. Preserve the original coordinate,
      // precision and quality instead of silently replacing low-quality values.
      const geo = await captureGeoMetadata(50)

      const localId = draftLocalId.current
      const storedAnswers: Record<string, any> = { ...answers }
      const fieldTypes = new Map(formDef.pages.flatMap(page => page.fields).map(field => [field.id, field.type]))

      for (const [fieldId, value] of Object.entries(answers)) {
        const isSignature = fieldTypes.get(fieldId) === 'signature' && typeof value === 'string' && value.startsWith('data:image/')
        if (value instanceof Blob || isSignature) {
          const mediaBlob = value instanceof Blob ? value : await (await fetch(value)).blob()
          const mediaId = crypto.randomUUID()
          const sha256 = await sha256Blob(mediaBlob)
          await localDB.mediaQueue.add({
            id: mediaId,
            activityLocalId: localId,
            answerFieldId: fieldId,
            file: mediaBlob,
            name: value instanceof File ? value.name : `${fieldId}.${isSignature ? 'png' : 'jpg'}`,
            mimeType: mediaBlob.type || (isSignature ? 'image/png' : 'image/jpeg'),
            bucketId: isSignature ? BUCKET_IDS.SIGNATURES : BUCKET_IDS.FIELD_PHOTOS,
            status: 'pending',
            entityId: user.entityId || formDef.entityId,
            professionalId: user.id,
            parentType: 'form_response',
            capturedAt: new Date().toISOString(),
            sha256,
          })
          storedAnswers[fieldId] = { pendingMediaId: mediaId }
        }
      }

      const existingDraft = await localDB.formResponses.get(localId)
      await localDB.formResponses.put({
        localId,
        formId: formDef.id,
        entityId: user.entityId || formDef.entityId,
        professionalId: user.id,
        familyId: familyId || null,
        formVersion: formDef.version,
        geo,
        answers: {
          ...storedAnswers,
          _metadata: {
            lat: geo.latitude,
            lng: geo.longitude,
            accuracyM: geo.accuracyM,
            altitudeM: geo.altitudeM,
            provider: geo.provider,
            mockedSignal: geo.mockedSignal,
            geoQualityStatus: geo.qualityStatus,
            geoQualityNotes: geo.qualityNotes,
            deviceTimestamp: geo.deviceTimestamp,
            capturedAt: Date.now(),
          }
        },
        status: 'completed', // Ready to be synced
        createdAt: existingDraft?.createdAt || Date.now(),
        updatedAt: Date.now()
      })

      await refreshPendingCount()
      let savedState = 'pending'
      if (await isOnline()) {
        await processSyncQueue()
        const savedResponse = await localDB.formResponses.get(localId)
        if (savedResponse?.status === 'synced') savedState = 'synced'
      }
      navigate(`/field/capture?saved=${savedState}`)
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
            {loadError || 'No pudimos cargar la definición técnica de este formulario. Verifica tu conexión o contacta a soporte.'}
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
          initialData={initialAnswers}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
        />
      </div>
    </div>
  )
}

export default FormResponderPage
