import { parseGeoJson } from '@/lib/geo'
import type { GeoJsonFeatureCollection, GeoRecord, MapLayer, SupportedGeoJson } from '@/types/gis'

const textEncoder = new TextEncoder()

function safeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'control-g-gis'
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function recordsToGeoJson(records: GeoRecord[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: records.map(record => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [record.longitude, record.latitude] },
      properties: {
        control_g_id: record.id,
        source: record.source,
        status: record.status,
        captured_at: record.capturedAt,
        pending_sync: record.isPending,
      },
    })),
  }
}

export function downloadGeoJson(records: GeoRecord[], name = 'control-g-capturas') {
  const blob = new Blob([JSON.stringify(recordsToGeoJson(records), null, 2)], { type: 'application/geo+json;charset=utf-8' })
  download(blob, `${safeFilename(name)}.geojson`)
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadWgs84Csv(records: GeoRecord[], name = 'control-g-capturas') {
  const rows = [
    ['control_g_id', 'source', 'status', 'captured_at', 'pending_sync', 'latitude_wgs84', 'longitude_wgs84'],
    ...records.map(record => [record.id, record.source, record.status, record.capturedAt, record.isPending, record.latitude, record.longitude]),
  ]
  const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeFilename(name)}-wgs84.csv`)
}

function countBy(records: GeoRecord[], key: (record: GeoRecord) => string) {
  const counts = new Map<string, number>()
  for (const record of records) {
    const value = key(record) || 'Sin dato'
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

async function mapSnapshot() {
  const svg = document.querySelector<SVGSVGElement>('svg[aria-label^="Mapa interno"]')
  if (!svg) return null
  const serialized = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 768
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#EAF1F2'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png', 0.9)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function downloadTerritorialPdf(records: GeoRecord[], layers: MapLayer[], name = 'informe-territorial-control-g') {
  if (!records.length) throw new Error('No hay puntos visibles para incluir en el informe.')
  const [{ jsPDF }, snapshot] = await Promise.all([import('jspdf'), mapSnapshot()])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFillColor(27, 58, 75)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('CONTROL G · INFORME TERRITORIAL GIS', 14, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Generado ${new Date().toLocaleString('es-CO')} · Sistema de referencia WGS84 (EPSG:4326)`, 14, 20)

  const sourceCounts = countBy(records, record => record.source)
  const statusCounts = countBy(records, record => record.status)
  const latitudes = records.map(record => record.latitude)
  const longitudes = records.map(record => record.longitude)
  const pending = records.filter(record => record.isPending).length

  doc.setTextColor(20, 30, 38)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Resumen operativo', 14, 39)
  const kpis = [
    ['Puntos visibles', records.length],
    ['Pendientes de sincronización', pending],
    ['Capas institucionales', layers.filter(layer => !layer.readOnly).length],
    ['Fuentes de datos', sourceCounts.length],
  ] as const
  kpis.forEach(([label, value], index) => {
    const x = 14 + index * 47
    doc.setFillColor(241, 245, 247)
    doc.rect(x, 44, 42, 22, 'F')
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(String(value), x + 4, 54)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 4, 61, { maxWidth: 34 })
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Cobertura geográfica', 14, 77)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Latitud: ${Math.min(...latitudes).toFixed(6)} a ${Math.max(...latitudes).toFixed(6)}`, 14, 84)
  doc.text(`Longitud: ${Math.min(...longitudes).toFixed(6)} a ${Math.max(...longitudes).toFixed(6)}`, 14, 90)

  if (snapshot) doc.addImage(snapshot, 'PNG', 105, 36, 161, 103)
  else {
    doc.setDrawColor(190, 205, 210)
    doc.rect(105, 36, 161, 103)
    doc.text('Vista cartográfica no disponible para esta exportación.', 112, 88)
  }

  const list = (title: string, values: Array<{ label: string; count: number }>, x: number, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(title, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    values.slice(0, 10).forEach((item, index) => doc.text(`${item.label}: ${item.count}`, x, y + 7 + index * 5))
  }
  list('Distribución por fuente', sourceCounts, 14, 106)
  list('Distribución por estado', statusCounts, 58, 106)

  doc.setFontSize(7)
  doc.setTextColor(90, 105, 115)
  doc.text('Este informe contiene información operativa agregada. No incorpora nombres, documentos, respuestas personales ni archivos de evidencia.', 105, 149, { maxWidth: 160 })
  doc.save(`${safeFilename(name)}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function arcGisLayerUrl(value: string) {
  const url = new URL(value.trim())
  if (url.protocol !== 'https:') throw new Error('La capa ArcGIS debe usar HTTPS.')
  const normalized = url.toString().replace(/\/+$/, '')
  if (!/(FeatureServer|MapServer)\/\d+$/i.test(normalized)) {
    throw new Error('Usa la URL de una capa ArcGIS que termine en FeatureServer/0 o MapServer/0.')
  }
  return normalized
}

export async function fetchArcGisLayer(serviceUrl: string, token?: string): Promise<SupportedGeoJson> {
  const endpoint = new URL(`${arcGisLayerUrl(serviceUrl)}/query`)
  endpoint.searchParams.set('where', '1=1')
  endpoint.searchParams.set('outFields', '*')
  endpoint.searchParams.set('returnGeometry', 'true')
  endpoint.searchParams.set('outSR', '4326')
  endpoint.searchParams.set('f', 'geojson')
  if (token?.trim()) endpoint.searchParams.set('token', token.trim())
  const response = await fetch(endpoint, { headers: { Accept: 'application/geo+json, application/json' } })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message || `ArcGIS respondió con estado ${response.status}.`)
  }
  return parseGeoJson(payload)
}

export async function publishRecordsToArcGis(serviceUrl: string, token: string, records: GeoRecord[]) {
  if (!token.trim()) throw new Error('ArcGIS requiere un token temporal con permiso de edición.')
  if (!records.length) throw new Error('No hay puntos visibles para publicar.')
  const endpoint = `${arcGisLayerUrl(serviceUrl)}/addFeatures`
  let added = 0
  const failures: string[] = []
  for (let start = 0; start < records.length; start += 500) {
    const batch = records.slice(start, start + 500)
    const features = batch.map(record => ({
      geometry: { x: record.longitude, y: record.latitude, spatialReference: { wkid: 4326 } },
      attributes: {
        control_g_id: record.id.slice(0, 120),
        source: record.source,
        status: record.status.slice(0, 120),
        captured_at: new Date(record.capturedAt).getTime(),
        pending_sync: record.isPending ? 1 : 0,
      },
    }))
    const body = new URLSearchParams({
      f: 'json',
      token: token.trim(),
      rollbackOnFailure: 'false',
      features: JSON.stringify(features),
    })
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.error) throw new Error(payload?.error?.message || `ArcGIS respondió con estado ${response.status}.`)
    for (const [index, result] of (payload?.addResults || []).entries()) {
      if (result.success) added += 1
      else failures.push(`${batch[index]?.id || 'registro'}: ${result.error?.description || 'no agregado'}`)
    }
  }
  return { added, failed: failures.length, failures }
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const output = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function shapefileHeader(fileLengthBytes: number, records: GeoRecord[]) {
  const bytes = new Uint8Array(100)
  const view = new DataView(bytes.buffer)
  const xs = records.map(record => record.longitude)
  const ys = records.map(record => record.latitude)
  view.setInt32(0, 9994, false)
  view.setInt32(24, fileLengthBytes / 2, false)
  view.setInt32(28, 1000, true)
  view.setInt32(32, 1, true)
  view.setFloat64(36, Math.min(...xs), true)
  view.setFloat64(44, Math.min(...ys), true)
  view.setFloat64(52, Math.max(...xs), true)
  view.setFloat64(60, Math.max(...ys), true)
  return bytes
}

function buildShp(records: GeoRecord[]) {
  const fileLength = 100 + records.length * 28
  const parts = [shapefileHeader(fileLength, records)]
  records.forEach((record, index) => {
    const bytes = new Uint8Array(28)
    const view = new DataView(bytes.buffer)
    view.setInt32(0, index + 1, false)
    view.setInt32(4, 10, false)
    view.setInt32(8, 1, true)
    view.setFloat64(12, record.longitude, true)
    view.setFloat64(20, record.latitude, true)
    parts.push(bytes)
  })
  return concatBytes(parts)
}

function buildShx(records: GeoRecord[]) {
  const fileLength = 100 + records.length * 8
  const bytes = new Uint8Array(fileLength)
  bytes.set(shapefileHeader(fileLength, records))
  const view = new DataView(bytes.buffer)
  records.forEach((_, index) => {
    view.setInt32(100 + index * 8, 50 + index * 14, false)
    view.setInt32(104 + index * 8, 10, false)
  })
  return bytes
}

interface DbfField {
  name: string
  type: 'C' | 'N'
  length: number
  decimals?: number
  value: (record: GeoRecord) => string
}

function fixedDbfValue(value: string, length: number, rightAlign = false) {
  let bytes = textEncoder.encode(value)
  while (bytes.length > length) bytes = textEncoder.encode(value.slice(0, Math.max(0, value.length - 1)))
  const output = new Uint8Array(length).fill(32)
  output.set(bytes, rightAlign ? Math.max(0, length - bytes.length) : 0)
  return output
}

function buildDbf(records: GeoRecord[]) {
  const fields: DbfField[] = [
    { name: 'CG_ID', type: 'C', length: 40, value: record => record.id },
    { name: 'SOURCE', type: 'C', length: 12, value: record => record.source },
    { name: 'STATUS', type: 'C', length: 40, value: record => record.status },
    { name: 'CAPTURED', type: 'C', length: 25, value: record => record.capturedAt },
    { name: 'PENDING', type: 'N', length: 1, value: record => record.isPending ? '1' : '0' },
    { name: 'LATITUDE', type: 'N', length: 14, decimals: 7, value: record => record.latitude.toFixed(7) },
    { name: 'LONGITUDE', type: 'N', length: 15, decimals: 7, value: record => record.longitude.toFixed(7) },
  ]
  const recordLength = 1 + fields.reduce((total, field) => total + field.length, 0)
  const headerLength = 32 + fields.length * 32 + 1
  const output = new Uint8Array(headerLength + records.length * recordLength + 1).fill(0)
  const view = new DataView(output.buffer)
  const now = new Date()
  output[0] = 0x03
  output[1] = now.getFullYear() - 1900
  output[2] = now.getMonth() + 1
  output[3] = now.getDate()
  view.setUint32(4, records.length, true)
  view.setUint16(8, headerLength, true)
  view.setUint16(10, recordLength, true)
  fields.forEach((field, index) => {
    const offset = 32 + index * 32
    output.set(textEncoder.encode(field.name.slice(0, 10)), offset)
    output[offset + 11] = field.type.charCodeAt(0)
    output[offset + 16] = field.length
    output[offset + 17] = field.decimals || 0
  })
  output[headerLength - 1] = 0x0D
  records.forEach((record, recordIndex) => {
    let offset = headerLength + recordIndex * recordLength
    output[offset] = 0x20
    offset += 1
    for (const field of fields) {
      output.set(fixedDbfValue(field.value(record), field.length, field.type === 'N'), offset)
      offset += field.length
    }
  })
  output[output.length - 1] = 0x1A
  return output
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xEDB88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(bytes: Uint8Array) {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function dosTimestamp(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = Math.max(1, date.getDate())
  const dosDate = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | day
  return { time, date: dosDate }
}

function zipStored(files: Array<{ name: string; bytes: Uint8Array }>) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  const timestamp = dosTimestamp()
  for (const file of files) {
    const name = textEncoder.encode(file.name)
    const crc = crc32(file.bytes)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034B50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(10, timestamp.time, true)
    localView.setUint16(12, timestamp.date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, file.bytes.length, true)
    localView.setUint32(22, file.bytes.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    localParts.push(local, file.bytes)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014B50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(12, timestamp.time, true)
    centralView.setUint16(14, timestamp.date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, file.bytes.length, true)
    centralView.setUint32(24, file.bytes.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centralParts.push(central)
    offset += local.length + file.bytes.length
  }
  const central = concatBytes(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054B50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, central.length, true)
  endView.setUint32(16, offset, true)
  return concatBytes([...localParts, central, end])
}

export function buildPointShapefileArchive(records: GeoRecord[], name = 'control-g-capturas') {
  if (!records.length) throw new Error('No hay puntos visibles para exportar.')
  const base = safeFilename(name)
  const projection = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
  return zipStored([
    { name: `${base}.shp`, bytes: buildShp(records) },
    { name: `${base}.shx`, bytes: buildShx(records) },
    { name: `${base}.dbf`, bytes: buildDbf(records) },
    { name: `${base}.prj`, bytes: textEncoder.encode(projection) },
    { name: `${base}.cpg`, bytes: textEncoder.encode('UTF-8') },
  ])
}

export function downloadPointShapefile(records: GeoRecord[], name = 'control-g-capturas') {
  const base = safeFilename(name)
  const zip = buildPointShapefileArchive(records, name)
  download(new Blob([zip], { type: 'application/zip' }), `${base}-shapefile-wgs84.zip`)
}
