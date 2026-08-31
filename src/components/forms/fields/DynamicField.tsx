import React from 'react'
import { 
  Type, AlignLeft, Hash, Calendar, Clock, ChevronDown, List, 
  Radio as RadioIcon, CheckSquare, Camera, PenTool, MapPin, 
  Layers, Calculator, Info, FileText, Phone, Mail, Globe,
  AlertCircle
} from 'lucide-react'
import { FormField } from '@/types'
import SignatureField from './SignatureField'
import MunicipalityPicker from './MunicipalityPicker'
import GPSField from './GPSField'
import RepeatGroup from './RepeatGroup'
import PhotoField from './PhotoField'
import GeometryCaptureField from './GeometryCaptureField'
import AudioField from './AudioField'

interface DynamicFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export default function DynamicField({ field, value, onChange, error, disabled }: DynamicFieldProps) {
  const containerClass = `space-y-2 p-4 rounded-3xl transition-all ${
    error ? 'bg-rose-50 border border-rose-100 shadow-sm' : 'bg-white/50 border border-slate-100'
  }`

  const labelClass = `text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
    error ? 'text-rose-600' : 'text-slate-400'
  }`

  // Render Label & Information
  const renderHeader = () => (
    <div className="mb-2 px-1">
      <div className="flex items-start justify-between gap-3">
        <label className={labelClass}>
          {field.label} {field.required && <span className="font-bold text-rose-500">*</span>}
        </label>
        {field.sensitive && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-800">Dato protegido</span>}
      </div>
      {field.description && (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
          <Info size={13} className="mt-0.5 shrink-0 text-blue-500" /> {field.description}
        </p>
      )}
    </div>
  )

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type === 'text' ? 'text' : field.type}
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
            placeholder={field.placeholder || 'Escribe aquí...'}
          />
        )

      case 'longtext':
        return (
          <textarea
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
            placeholder={field.placeholder || 'Escribe una respuesta detallada...'}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            min={field.validationRules?.min}
            max={field.validationRules?.max}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        )

      case 'currency': {
        const numericValue = value === '' || value === null || value === undefined ? null : Number(value)
        const configuredCurrency = (field.currencyCode || 'COP').toUpperCase()
        const currencyCode = /^[A-Z]{3}$/.test(configuredCurrency) ? configuredCurrency : 'COP'
        const formatted = numericValue !== null && Number.isFinite(numericValue)
          ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(numericValue)
          : ''
        return (
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">{currencyCode}</span>
              <input
                type="number"
                inputMode="decimal"
                value={value ?? ''}
                disabled={disabled}
                onChange={event => onChange(event.target.value === '' ? '' : Number(event.target.value))}
                min={field.validationRules?.min}
                max={field.validationRules?.max}
                step="any"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-16 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            {formatted && <p className="px-1 text-[11px] font-bold text-slate-500">{formatted}</p>}
          </div>
        )
      }

      case 'date':
      case 'time':
        return (
          <input
             type={field.type}
             value={value || ''}
             disabled={disabled}
             onChange={(e) => onChange(e.target.value)}
             className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none"
          >
            <option value="">Selecciona una opción</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="grid grid-cols-1 gap-2">
            {field.options?.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => onChange(opt.value)}
                disabled={disabled}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-sm font-medium ${
                  value === opt.value 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                   value === opt.value ? 'border-blue-500' : 'border-slate-300'
                }`}>
                  {value === opt.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        )

      case 'checkbox':
      case 'multi_select':
        return (
           <div className="grid grid-cols-1 gap-2">
            {field.options?.map((opt) => {
              const isChecked = Array.isArray(value) && value.includes(opt.value)
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    const currentValues = Array.isArray(value) ? value : []
                    if (isChecked) {
                      onChange(currentValues.filter(v => v !== opt.value))
                    } else {
                      onChange([...currentValues, opt.value])
                    }
                  }}
                  disabled={disabled}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-sm font-medium ${
                    isChecked 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
                     isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                  }`}>
                    {isChecked && <CheckSquare size={12} className="text-white" />}
                  </div>
                  {opt.label}
                </button>
              )
            })}
          </div>
        )

      case 'matrix': {
        const matrixValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
        return (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-[560px] w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 min-w-44 border-b border-r border-slate-200 bg-slate-50 p-3 text-left font-black text-slate-600">Ítem</th>
                  {field.options?.map(column => <th key={column.value} className="min-w-24 border-b border-slate-200 p-3 text-center font-black text-slate-600">{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {field.matrixRows?.map(row => (
                  <tr key={row.value} className="border-b border-slate-100 last:border-0">
                    <th className="sticky left-0 z-10 border-r border-slate-100 bg-white p-3 text-left font-bold text-slate-700">{row.label}</th>
                    {field.options?.map(column => (
                      <td key={column.value} className="p-3 text-center">
                        <input
                          type="radio"
                          name={`${field.id}-${row.value}`}
                          value={column.value}
                          checked={matrixValue[row.value] === column.value}
                          disabled={disabled}
                          onChange={() => onChange({ ...matrixValue, [row.value]: column.value })}
                          aria-label={`${row.label}: ${column.label}`}
                          className="h-5 w-5 accent-blue-700"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      case 'signature':
        return <SignatureField value={value} onChange={onChange} disabled={disabled} />

      case 'photo':
        return <PhotoField value={value || null} onChange={onChange} disabled={disabled} />

      case 'audio':
        return <AudioField value={value || null} onChange={onChange} disabled={disabled} maxDurationSeconds={field.maxDurationSeconds} />

      case 'file': {
        const selectedFile = value instanceof File ? value : null
        return (
          <div className="space-y-3">
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs font-bold text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50">
              <FileText size={24} className="mb-2 text-blue-600" />
              {selectedFile ? selectedFile.name : value instanceof Blob ? 'Archivo guardado en el dispositivo' : 'Seleccionar archivo para conservarlo offline'}
              <input
                type="file"
                className="sr-only"
                disabled={disabled}
                accept=".pdf,application/pdf"
                onChange={event => onChange(event.target.files?.[0] || null)}
              />
            </label>
            {(selectedFile || value instanceof Blob) && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                <span>{((value as Blob).size / 1_000_000).toFixed(2)} MB · se enviará al sincronizar</span>
                {!disabled && <button type="button" onClick={() => onChange(null)} className="font-black text-rose-600">Quitar</button>}
              </div>
            )}
          </div>
        )
      }

      case 'calculation':
        return (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900"><Calculator size={16} /> Resultado automático</div>
            <output className="mt-2 block text-xl font-black text-blue-950">{value ?? 'Pendiente'}</output>
          </div>
        )

      case 'gps':
        return <GPSField value={value} onChange={onChange} disabled={disabled} />

      case 'geotrace':
      case 'geoshape':
        return <GeometryCaptureField captureType={field.type} value={value || null} onChange={onChange} disabled={disabled} />

      case 'municipality':
        return <MunicipalityPicker value={value} onChange={onChange} disabled={disabled} />

      case 'repeat_group':
        return <RepeatGroup field={field} value={value} onChange={onChange} disabled={disabled} />

      case 'note':
        return (
          <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200 border-l-4 border-l-blue-500">
            <p className="text-xs text-slate-600 leading-relaxed">{field.label}</p>
          </div>
        )

      default:
        return <div className="text-[10px] text-slate-400 font-mono">Tipo "{field.type}" no implementado aún</div>
    }
  }

  return (
    <div className={containerClass}>
      {field.type !== 'note' && renderHeader()}
      {renderInput()}
      {error && (
        <div className="flex items-center gap-1 mt-1 text-rose-500 font-bold text-[10px] animate-in slide-in-from-top-1">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  )
}
