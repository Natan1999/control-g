import type { FormDefinition, User } from '@/types'
import type { GeoRecord, MapDataset, MapLayer } from '@/types/gis'

export const DEMO_ENTITY_ID = 'demo-villa-esperanza'
export const DEMO_DATE = '2026-09-01T12:00:00.000Z'
export const DEMO_TEAM: User[] = [
  { id: 'demo-coord', fullName: 'Laura · Coordinación', role: 'coordinator' },
  { id: 'demo-support', fullName: 'Diego · Apoyo de coordinación', role: 'support' },
  { id: 'demo-field-1', fullName: 'Camila · Juventud', role: 'professional' },
  { id: 'demo-field-2', fullName: 'Andrés · Servicios públicos', role: 'professional' },
  { id: 'demo-field-3', fullName: 'Valentina · Operación rural', role: 'professional' },
].map(user => ({ ...user, role: user.role as User['role'], entityId: DEMO_ENTITY_ID, email: `${user.id}@example.invalid`, status: 'active', createdAt: DEMO_DATE }))

const zones = ['Centro', 'La Esperanza', 'Los Cedros', 'El Progreso', 'Ribera', 'Zona rural']
const origin = { longitude: -75.42, latitude: 10.36 }
export const DEMO_FORMS: FormDefinition[] = [
  { id: 'demo-youth', entityId: DEMO_ENTITY_ID, title: 'Oportunidades para jóvenes', description: 'Instrumento ficticio: educación, empleo y participación juvenil. No escribas datos personales reales.', type: 'ex_ante', status: 'published', version: 1, createdAt: DEMO_DATE, updatedAt: DEMO_DATE,
    pages: [{ id: 'youth-page', title: 'Juventud y oportunidades', fields: [
      { id: 'age_range', type: 'select', label: 'Rango de edad', required: true, options: ['18–21', '22–25', '26–28'].map(value => ({ label: value, value })) },
      { id: 'occupation', type: 'select', label: 'Actividad principal', required: true, options: ['Estudia', 'Trabaja', 'Busca empleo'].map(value => ({ label: value, value })) },
      { id: 'priority', type: 'select', label: 'Oportunidad prioritaria', required: true, options: ['Formación', 'Empleo', 'Deporte', 'Emprendimiento'].map(value => ({ label: value, value })) },
      { id: 'gps', type: 'gps', label: 'Ubicación (opcional)', required: false, description: 'GPS puede funcionar sin internet. Si no hay señal satelital, continúa sin ubicación.' },
      { id: 'photo', type: 'photo', label: 'Foto de evidencia (opcional)', required: false, description: 'Usa una foto de prueba sin personas identificables.' },
    ] }] },
  { id: 'demo-services', entityId: DEMO_ENTITY_ID, title: 'Acceso a servicios públicos', description: 'Instrumento ficticio para identificar necesidades de agua, energía y saneamiento.', type: 'ex_ante', status: 'published', version: 1, createdAt: DEMO_DATE, updatedAt: DEMO_DATE,
    pages: [{ id: 'services-page', title: 'Servicios del sector', fields: [
      { id: 'water', type: 'select', label: 'Acceso al agua', required: true, options: ['Continuo', 'Intermitente', 'Sin conexión'].map(value => ({ label: value, value })) },
      { id: 'energy', type: 'select', label: 'Energía eléctrica', required: true, options: ['Estable', 'Intermitente', 'Sin conexión'].map(value => ({ label: value, value })) },
      { id: 'priority', type: 'select', label: 'Prioridad de intervención', required: true, options: ['Alta', 'Media', 'Baja'].map(value => ({ label: value, value })) },
      { id: 'gps', type: 'gps', label: 'Ubicación (opcional)', required: false },
      { id: 'photo', type: 'photo', label: 'Foto de evidencia (opcional)', required: false },
    ] }] },
]

export function demoAssignedForms(userId: string) {
  if (userId === 'demo-field-1') return DEMO_FORMS.slice(0, 1)
  if (userId === 'demo-field-2') return DEMO_FORMS.slice(1)
  if (userId === 'demo-field-3') return DEMO_FORMS
  return []
}

export function buildMunicipalDemo(): MapDataset {
  const layers: MapLayer[] = [{
    id: 'demo-sectors', entityId: DEMO_ENTITY_ID, name: 'Sectores de intervención', description: 'Límites sintéticos de demostración; no son cartografía oficial.', color: '#167d8d', opacity: 0.12, visibleDefault: true, layerType: 'polygons', status: 'active', updatedAt: DEMO_DATE,
    geojson: { type: 'FeatureCollection', features: zones.map((name, index) => {
      const x = origin.longitude + (index % 3) * 0.024, y = origin.latitude + Math.floor(index / 3) * 0.021
      return { type: 'Feature', properties: { name, synthetic: true }, geometry: { type: 'Polygon', coordinates: [[[x, y], [x + 0.024, y], [x + 0.024, y + 0.021], [x, y + 0.021], [x, y]]] } }
    }) },
  }, {
    id: 'demo-roads', entityId: DEMO_ENTITY_ID, name: 'Corredores de visita', description: 'Recorridos ilustrativos.', color: '#94a3b8', opacity: 0.6, visibleDefault: true, layerType: 'lines', status: 'active', updatedAt: DEMO_DATE,
    geojson: { type: 'FeatureCollection', features: Array.from({ length: 7 }, (_, i) => ({ type: 'Feature', properties: { name: `Corredor ${i + 1}` }, geometry: { type: 'LineString', coordinates: i < 4 ? [[origin.longitude + i * .024, origin.latitude], [origin.longitude + i * .024, origin.latitude + .042]] : [[origin.longitude, origin.latitude + (i - 4) * .021], [origin.longitude + .072, origin.latitude + (i - 4) * .021]] } })) },
  }, {
    id: 'demo-facilities', entityId: DEMO_ENTITY_ID, name: 'Centros de atención', color: '#8b5cf6', opacity: 0.9, visibleDefault: true, layerType: 'points', status: 'active', updatedAt: DEMO_DATE,
    geojson: { type: 'FeatureCollection', features: ['Casa de juventud', 'Centro comunitario', 'Punto de servicios'].map((name, i) => ({ type: 'Feature', properties: { name }, geometry: { type: 'Point', coordinates: [origin.longitude + .012 + i * .024, origin.latitude + .018] } })) },
  }]
  const records: GeoRecord[] = Array.from({ length: 240 }, (_, i) => {
    const zone = i < 100 ? i % 2 : i % 6
    const x = origin.longitude + (zone % 3) * .024, y = origin.latitude + Math.floor(zone / 3) * .021
    const youth = i % 2 === 0
    return { id: `demo-record-${i + 1}`, entityId: DEMO_ENTITY_ID, professionalId: i % 3 === 0 ? 'demo-field-3' : youth ? 'demo-field-1' : 'demo-field-2', formId: youth ? 'demo-youth' : 'demo-services', source: 'response', status: i % 7 === 0 ? 'pendiente de revisión' : 'aprobado', latitude: y + .004 + ((i * 37) % 101) / 101 * .012, longitude: x + .004 + ((i * 53) % 97) / 97 * .015, capturedAt: new Date(Date.parse(DEMO_DATE) - (i % 14) * 86400000).toISOString(), label: `${youth ? 'Jóvenes' : 'Servicios'} · ${zones[zone]} · ${i + 1}`, isPending: false,
      dimensions: { sector: { label: 'Sector', value: zones[zone] }, program: { label: 'Programa', value: youth ? 'Juventud' : 'Servicios públicos' }, priority: { label: 'Prioridad', value: ['Alta', 'Media', 'Baja'][i % 3] }, ...(youth ? { occupation: { label: 'Actividad', value: ['Estudia', 'Trabaja', 'Busca empleo'][i % 3] } } : { water: { label: 'Acceso al agua', value: ['Continuo', 'Intermitente', 'Sin conexión'][i % 3] } }) } }
  })
  return { records, layers, isOnline: false, loadedFromCache: true, lastUpdatedAt: DEMO_DATE, spatialPolicy: { privacyMode: 'aggregate', minimumGroupSize: 5, coverageTarget: 35 } }
}
