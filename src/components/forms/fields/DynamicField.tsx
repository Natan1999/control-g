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
    <div className="flex justify-between items-start mb-2 px-1">
      <label className={labelClass}>
        {field.label} {field.required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      {field.description && (
        <div className="group relative">
          <Info size={14} className="text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
          <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
            {field.description}
          </div>
        </div>
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
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        )

      case 'date':
        return (
          <input
             type="date"
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
        return (
           <div className="grid grid-cols-1 gap-2">
            {field.options?.map((opt) => {
              const isChecked = Array.isArray(value) && value.includes(opt.value)
              return (
                <button
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

      case 'signature':
        return <SignatureField value={value} onChange={onChange} disabled={disabled} />

      case 'gps':
        return <GPSField value={value} onChange={onChange} disabled={disabled} />

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
