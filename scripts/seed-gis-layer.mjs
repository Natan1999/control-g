import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para sembrar capas GIS.')
}

const path = fileURLToPath(new URL('../supabase/seed/bolivar-municipios-dane-2025.geojson', import.meta.url))
const geojson = JSON.parse(await readFile(path, 'utf8'))
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

const { error } = await supabase.from('map_layers').upsert({
  id: 'layer-bolivar-municipios-dane-2025',
  entity_id: 'gov-bolivar-2026',
  name: 'Municipios de Bolívar · DANE 2025',
  description: 'Límites municipales oficiales simplificados para visualización operativa offline.',
  layer_type: 'polygons',
  geojson,
  color: '#3D7B9E',
  opacity: 0.10,
  visible_default: true,
  status: 'active',
  source: 'DANE · Marco Geoestadístico Nacional / DIVIPOLA 2025',
  source_url: 'https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer/317',
}, { onConflict: 'id' })

if (error) throw error
console.log(`Capa GIS de Bolívar lista: ${geojson.features.length} municipios.`)
