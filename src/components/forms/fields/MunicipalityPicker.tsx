import React, { useState, useEffect } from 'react'
import { getDepartments, getMunicipalities, Department, Municipality } from '@/services/geographyService'
import { MapPin, Search, ChevronRight } from 'lucide-react'

interface MunicipalityPickerProps {
  value: string | null; // MPIO_CCDGO
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export default function MunicipalityPicker({ value, onChange, disabled }: MunicipalityPickerProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getDepartments().then(setDepartments)
  }, [])

  useEffect(() => {
    if (selectedDeptId) {
      setLoading(true)
      getMunicipalities(selectedDeptId)
        .then(setMunicipalities)
        .finally(() => setLoading(false))
    } else {
      setMunicipalities([])
    }
  }, [selectedDeptId])

  // Try to pre-select dept if value exists
  useEffect(() => {
    if (value && !selectedDeptId) {
       const deptId = value.substring(0, 2)
       setSelectedDeptId(deptId)
    }
  }, [value])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 ml-1">Departamento</label>
        <select
          value={selectedDeptId}
          onChange={(e) => {
            setSelectedDeptId(e.target.value)
            onChange(null) // Reset municipality when dept changes
          }}
          disabled={disabled}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none"
        >
          <option value="">Selecciona...</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 ml-1">Municipio (DANE)</label>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !selectedDeptId || loading}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none disabled:opacity-50"
        >
          <option value="">{loading ? 'Cargando...' : 'Selecciona...'}</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
