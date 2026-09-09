import { buildMunicipalDemo, DEMO_FORMS, DEMO_TEAM, demoAssignedForms } from './municipal-demo'

export interface ProvisionAccount { key: string; full_name: string; email: string; password: string; role: 'coordinator' | 'support' | 'professional' }

export function generateDemoAccounts(namespace: string): ProvisionAccount[] {
  return DEMO_TEAM.map((member, index) => ({
    key: member.id, full_name: member.fullName.replace(' · ', ' — '),
    email: `demo.${namespace}.${['coordinacion','apoyo','juventud','servicios','rural'][index]}@controlg.co`,
    password: `Cg!${Array.from(crypto.getRandomValues(new Uint8Array(18)), byte => byte.toString(16).padStart(2,'0')).join('')}`,
    role: member.role as ProvisionAccount['role'],
  }))
}

export function buildMunicipalProvisionBundle(center = { latitude: 10.36, longitude: -75.42 }) {
  const source = buildMunicipalDemo()
  const shift = (coordinates: unknown): unknown => {
    if (!Array.isArray(coordinates)) return coordinates
    if (typeof coordinates[0] === 'number') return [Number(coordinates[0]) + center.longitude + 75.42, Number(coordinates[1]) + center.latitude - 10.36]
    return coordinates.map(shift)
  }
  const sectors = ['Centro', 'La Esperanza', 'Los Cedros', 'El Progreso', 'Ribera', 'Zona rural']
  return {
    territories: sectors.map(name => ({ id: '', name })),
    forms: DEMO_FORMS.map(form => ({ ...form,
      professional_keys: DEMO_TEAM.filter(user => demoAssignedForms(user.id).some(assigned => assigned.id === form.id)).map(user => user.id),
      pages: form.pages.map(page => ({ ...page, fields: [{ id: 'sector', type: 'select', label: 'Sector de intervención', required: true, options: sectors.map(value => ({label:value,value})) }, ...page.fields] })),
    })),
    layers: source.layers.map(layer => ({ ...layer, geojson: { type: 'FeatureCollection', features: (layer.geojson as { features: Array<{ geometry: { coordinates: unknown } }> }).features.map(feature => ({ ...feature, geometry: { ...feature.geometry, coordinates: shift(feature.geometry.coordinates) } })) } })),
    records: source.records.map((record,index) => ({ ...record,
      latitude: record.latitude + center.latitude - 10.36, longitude: record.longitude + center.longitude + 75.42,
      capturedAt: new Date(Date.now() - (index % 14 + 1) * 86400000).toISOString(),
      territory: record.dimensions!.sector.value,
      answers: { sector: record.dimensions!.sector.value,
        ...(record.formId === 'demo-youth' ? { age_range: ['18–21','22–25','26–28'][index%3], occupation: record.dimensions!.occupation.value, priority: ['Formación','Empleo','Deporte','Emprendimiento'][index%4] }
          : { water: record.dimensions!.water.value, energy: ['Estable','Intermitente','Sin conexión'][index%3], priority: ['Alta','Media','Baja'][index%3] }),
        gps: { latitude: record.latitude + center.latitude - 10.36, longitude: record.longitude + center.longitude + 75.42, accuracy: 15, timestamp: Date.now() - (index % 14 + 1) * 86400000 },
      },
    })),
  }
}
