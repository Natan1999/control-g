import { useFieldArray, Control, UseFormRegister } from 'react-hook-form'
import { Plus, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/types/forms'

interface RepeatingGroupProps {
  field: FormField
  control: Control<any>
  register: UseFormRegister<any>
  renderField: (field: FormField, path: string) => React.ReactNode
}

export function RepeatingGroup({ field, control, register, renderField }: RepeatingGroupProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: field.id,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <UserPlus size={16} className="text-brand-primary" /> {field.label}
        </h4>
        <span className="text-[10px] font-black text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full uppercase">
            {fields.length} Registrados
        </span>
      </div>

      <div className="space-y-8">
        {fields.map((item, index) => (
          <div key={item.id} className="relative p-5 rounded-2xl bg-white border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="absolute -top-3 -right-3">
               <button 
                type="button"
                onClick={() => remove(index)}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm"
               >
                 <Trash2 size={14} />
               </button>
            </div>
            
            <div className="space-y-4">
               <div className="text-[10px] font-black text-brand-primary mb-2 uppercase tracking-tight">Persona #{index + 1}</div>
               {field.fields?.map((innerField) => (
                 <div key={innerField.id}>
                    {renderField(innerField, `${field.id}.${index}.${innerField.id}`)}
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => append({})}
        className="w-full h-14 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all group"
      >
        <Plus size={18} className="mr-2 text-brand-primary group-hover:scale-110 transition-transform" /> 
        <span className="font-bold text-sm text-brand-dark">{field.add_button_text || '+ Agregar Registro'}</span>
      </Button>
    </div>
  )
}
