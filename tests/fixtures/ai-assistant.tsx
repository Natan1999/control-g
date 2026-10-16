import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import AiFormAssistant from '../../src/components/forms/AiFormAssistant'
import '../../src/index.css'

function Fixture() {
  const [open, setOpen] = useState(true)
  const [applied, setApplied] = useState('Sin incorporar')
  return <main className="p-8"><h1>Prueba aislada · datos sintéticos · sin persistencia</h1><button onClick={() => setOpen(true)}>Abrir asistente</button><p role="status">{applied}</p>{open ? <AiFormAssistant entityId="qa-synthetic" countryCode="CO" currentForm={{ title: 'Instrumento original', pages: [] }} onClose={() => setOpen(false)} onApply={(draft, strategy) => { setApplied(`${strategy}: ${draft.title} · ${draft.pages.length} sección(es)`); setOpen(false) }} /> : null}</main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
