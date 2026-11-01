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

// Store review is a separate, two-account tenant. Never reuse a customer or
// silently expand the five-account municipal demonstration.
export function generateReviewAccounts(namespace: string): ProvisionAccount[] {
  const accounts = generateDemoAccounts(`play-${namespace}`)
  return [accounts.find(account => account.role === 'coordinator')!, accounts.find(account => account.role === 'professional')!]
    .map(account => ({ ...account, full_name: account.role === 'coordinator' ? 'Coordinación · Revisión Play (ficticia)' : 'Profesional · Revisión Play (ficticio)' }))
}

export function buildReviewProvisionBundle(professionalKey: string, center = { latitude: 10.36, longitude: -75.42 }) {
  if (!professionalKey) throw new Error('Falta el profesional de la demo de revisión.')
  const source = buildMunicipalProvisionBundle(center)
  const forms = [{
    id: 'review-visit', title: 'DEMO · Visita de campo', type: 'ex_ante',
    description: 'Instrumento ficticio para verificar captura offline, evidencias y sincronización. No ingresar datos personales reales.',
    professional_keys: [professionalKey],
    pages: [{ id: 'review-page', title: 'Registro de visita ficticia', fields: [
      { id: 'reference', type: 'text', label: 'Referencia ficticia de la visita', required: true },
      { id: 'sector', type: 'select', label: 'Sector de intervención', required: true, options: source.territories.map(territory => ({label:territory.name,value:territory.name})) },
      { id: 'result', type: 'radio', label: 'Resultado de la visita', required: true, options: [{label:'Atendida',value:'attended'},{label:'Pendiente',value:'pending'}] },
      { id: 'notes', type: 'longtext', label: 'Hallazgo ficticio (sin datos personales)', required: false },
      { id: 'gps', type: 'gps', label: 'Ubicación de demostración (opcional)', required: false },
      { id: 'photo', type: 'photo', label: 'Foto de un objeto de prueba (opcional)', required: false },
      { id: 'signature', type: 'signature', label: 'Trazo ficticio de prueba (opcional)', required: false },
      { id: 'audio', type: 'audio', label: 'Audio de demostración (opcional)', required: false, maxFileSizeMb:5 },
      { id: 'document', type: 'file', label: 'PDF ficticio (opcional)', required: false, maxFileSizeMb:5 },
    ] }],
  }, {
    id: 'review-unassigned', title: 'DEMO · Control sin asignar', type: 'ex_post',
    description: 'Este formulario no debe estar disponible para capturar en la cuenta profesional hasta que coordinación lo asigne.',
    professional_keys: [],
    pages: [{ id: 'review-unassigned-page', title: 'Control de asignación', fields: [{ id:'check', type:'text', label:'Comprobación de asignación', required:true }] }],
  }]
  return {
    territories: source.territories, forms, layers: source.layers,
    records: Array.from({ length: 24 }, (_, index) => {
      const sector = source.territories[index % source.territories.length].name
      const capturedAt = new Date(Date.now() - (index % 7 + 1) * 86400000).toISOString()
      const latitude = center.latitude + ((index % 6) - 2.5) * 0.006
      const longitude = center.longitude + (Math.floor(index / 6) - 1.5) * 0.008
      return { formId: 'review-visit', professionalId: professionalKey, territory: sector, latitude, longitude, capturedAt,
        answers: { reference:`DEMO-${index+1}`,sector,result:index%4?'attended':'pending',notes:'Registro ficticio para revisión de la aplicación',gps:{latitude,longitude,accuracy:20,timestamp:Date.parse(capturedAt)} } }
    }),
  }
}
