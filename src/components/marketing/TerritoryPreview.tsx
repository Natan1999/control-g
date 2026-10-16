import { useId, useState } from 'react'
import { Check, Layers3, MapPin, WifiOff } from 'lucide-react'

const POINTS = [
  [172, 138], [203, 165], [235, 150], [265, 183], [174, 208], [222, 231],
  [272, 246], [314, 215], [337, 176], [355, 247], [394, 276], [313, 299],
  [255, 305], [199, 275], [149, 264], [370, 325], [429, 227], [302, 134],
]

const MODES = [{ value: 'puntos', label: 'Puntos' }, { value: 'calor', label: 'Calor' }, { value: 'cobertura', label: 'Cobertura' }] as const

export function TerritoryPreview() {
  const [mode, setMode] = useState<(typeof MODES)[number]['value']>('puntos')
  const id = useId().replace(/:/g, '')

  return (
    <figure className="cg-map-preview">
      <figcaption className="cg-map-title"><span><span className="cg-map-status" aria-hidden="true" /> Mapa territorial</span><span className="cg-example-label">Vista ilustrativa</span></figcaption>
      <div className="cg-map-canvas">
        <svg viewBox="0 0 560 402" role="img" aria-label={`Ejemplo sintético de un mapa territorial en vista de ${mode}. No contiene datos de clientes.`}>
          <defs><pattern id={`${id}-grid`} width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#D8E6E9" strokeWidth="0.6" /></pattern><clipPath id={`${id}-clip`}><rect width="560" height="402" rx="0" /></clipPath></defs>
          <g clipPath={`url(#${id}-clip)`}>
            <rect width="560" height="402" fill="#EBF2F1" /><rect width="560" height="402" fill={`url(#${id}-grid)`} />
            <path d="M-30 326C54 278 86 337 150 300S202 238 173 164S119 67 183-18" fill="none" stroke="#BDDBDF" strokeWidth="47" /><path d="M-30 326C54 278 86 337 150 300S202 238 173 164S119 67 183-18" fill="none" stroke="#D1E9E9" strokeWidth="34" />
            <path d="M-20 80 73 54 139 84 149 136 97 189 18 171Z" fill="#DDE8DB" /><path d="M368-10 567 2 568 119 477 143 399 99Z" fill="#DDE8DB" /><path d="M450 314 566 286 566 420 412 420Z" fill="#DDE8DB" />
            <g stroke="#FFF" strokeWidth="9" fill="none"><path d="M48-20 65 99 121 170 251 238 376 296 578 334" /><path d="M251-20 254 97 293 177 335 258 354 417" /><path d="M568 103 437 150 336 170 194 223 83 257-12 253" /><path d="M103 418 188 345 280 292 396 231 571 213" /></g>
            <g stroke="#C6D7D7" strokeWidth="1.5" fill="none"><path d="M48-20 65 99 121 170 251 238 376 296 578 334" /><path d="M251-20 254 97 293 177 335 258 354 417" /><path d="M568 103 437 150 336 170 194 223 83 257-12 253" /><path d="M103 418 188 345 280 292 396 231 571 213" /></g>
            <g fill={mode === 'cobertura' ? '#087E8B' : '#87B7B2'} fillOpacity={mode === 'cobertura' ? '0.22' : '0.09'} stroke="#417C82" strokeWidth="1.4" strokeDasharray="5 4"><path d="M191 102 309 101 350 173 281 244 187 218 150 156Z" /><path d="M187 218 281 244 309 329 219 366 131 296Z" /><path d="M350 173 431 159 481 260 403 338 309 329 281 244Z" /></g>
            {mode === 'calor' ? <g fill="#CF7949" fillOpacity="0.24"><ellipse cx="238" cy="194" rx="69" ry="62" /><ellipse cx="333" cy="259" rx="77" ry="68" /><ellipse cx="219" cy="278" rx="50" ry="49" /><ellipse cx="238" cy="194" rx="34" ry="32" fillOpacity="0.45" /><ellipse cx="333" cy="259" rx="42" ry="36" fillOpacity="0.4" /></g> : null}
            {mode !== 'calor' ? <g>{POINTS.map(([x, y], index) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r={mode === 'cobertura' ? '3.5' : '6'} fill={index % 5 === 0 ? '#123B50' : '#087E8B'} stroke="white" strokeWidth="2.5" />{index === 7 && mode === 'puntos' ? <circle cx={x} cy={y} r="12" fill="none" stroke="#087E8B" strokeWidth="1.4" /> : null}</g>)}</g> : null}
            <g fill="#44616A" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="600"><text x="212" y="87">Sector norte</text><text x="384" y="150">Sector oriente</text><text x="218" y="346">Sector centro</text></g>
            <g transform="translate(504 29)" fill="#123B50"><path d="M0 23 7 0 14 23 7 18Z" /><text x="7" y="-8" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700">N</text></g>
            <g transform="translate(25 370)" stroke="#47636B" strokeWidth="1.5"><path d="M0 0V5H58V0" fill="none" /></g>
          </g>
        </svg>
        <div className="cg-map-layer-label"><Layers3 size={15} aria-hidden="true" /> Territorios y registros</div>
        <div className="cg-map-modes" role="group" aria-label="Explorar vistas del mapa ilustrativo">{MODES.map(item => <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => setMode(item.value)}>{item.label}</button>)}</div>
      </div>
      <div className="cg-map-caption"><span><MapPin size={16} aria-hidden="true" /> Respuestas con contexto territorial</span><span>Ejemplo sin datos reales</span></div>
      <div className="cg-field-note"><div className="cg-field-note-icon"><WifiOff size={21} aria-hidden="true" /></div><div><strong>En campo, con o sin señal.</strong><p>Capture en el dispositivo. Sincronice al volver a tener conexión.</p></div><span className="cg-field-note-check"><Check size={18} aria-hidden="true" /></span></div>
    </figure>
  )
}
