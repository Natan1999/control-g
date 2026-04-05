import React from 'react'
import { Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { FormField } from '@/types'
import DynamicField from './DynamicField'

interface RepeatGroupProps {
  field: FormField;
  value: any[]; // Array of Record<string, any>
  onChange: (value: any[]) => void;
  disabled?: boolean;
}

export default function RepeatGroup({ field, value = [], onChange, disabled }: RepeatGroupProps) {
  const addEntry = () => {
    const newEntry = {}
    onChange([...value, newEntry])
  }

  const removeEntry = (index: number) => {
    const newValue = value.filter((_, i) => i !== index)
    onChange(newValue)
  }

  const updateEntryField = (index: number, subFieldId: string, subValue: any) => {
    const newValue = [...value]
    newValue[index] = { ...newValue[index], [subFieldId]: subValue }
    onChange(newValue)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <Users size={16} className="text-blue-500" /> {field.label}
        </h4>
        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
          {value.length} registros
        </span>
      </div>

      <div className="space-y-8 pl-4 border-l-2 border-slate-100">
        {value.map((entry, index) => (
          <div key={index} className="relative bg-white/40 p-6 rounded-[32px] border border-slate-100 shadow-sm animate-in slide-in-from-left-4">
            <div className="absolute -left-[27px] top-8 w-6 h-6 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
              {index + 1}
            </div>
            
            <div className="flex justify-between items-center mb-6">
               <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                 Registro #{index + 1}
               </h5>
               {!disabled && (
                 <button 
                  onClick={() => removeEntry(index)}
                  className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all active:scale-90"
                 >
                   <Trash2 size={16} />
                 </button>
               )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {field.subFields?.map((subField) => (
                <DynamicField
                  key={subField.id}
                  field={subField}
                  value={entry[subField.id]}
                  onChange={(val) => updateEntryField(index, subField.id, val)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        ))}

        {!disabled && (
          <button
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-dashed border-slate-200 rounded-[28px] text-xs font-black text-slate-400 uppercase tracking-widest hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all group scale-95 hover:scale-100"
          >
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center transition-all group-hover:bg-blue-500 group-hover:text-white group-hover:scale-110">
              <Plus size={16} />
            </div>
            Añadir registro a {field.label}
          </button>
        )}
      </div>
    </div>
  )
}
