export type GeoRecordSource = 'response' | 'activity' | 'family' | 'local'

export interface GeoRecord {
  id: string
  localId?: string
  entityId: string
  professionalId?: string
  formId?: string
  source: GeoRecordSource
  status: string
  latitude: number
  longitude: number
  capturedAt: string
  label: string
  isPending: boolean
  /** Non-sensitive, reportable form values used for thematic maps. */
  dimensions?: Record<string, GeoDimensionValue>
}

export interface GeoDimensionValue {
  label: string
  value: string | number | boolean
}

export interface CapturedGeometryVertex {
  latitude: number
  longitude: number
  accuracyM: number | null
  altitudeM: number | null
  timestamp: number
}

export interface CapturedGeometryValue {
  captureType: 'geotrace' | 'geoshape'
  geometryType: 'LineString' | 'Polygon'
  coordinates: GeoJsonPosition[]
  vertices: CapturedGeometryVertex[]
  complete: boolean
  capturedAt: string
  updatedAt: string
}

export type GeoJsonPosition = [number, number]

export interface GeoJsonGeometry {
  type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon'
  coordinates: unknown
}

export interface GeoJsonFeature {
  type: 'Feature'
  geometry: GeoJsonGeometry | null
  properties?: Record<string, unknown> | null
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

export type SupportedGeoJson = GeoJsonFeatureCollection | GeoJsonFeature | GeoJsonGeometry

export interface MapLayer {
  id: string
  entityId: string
  name: string
  description?: string
  layerType: 'points' | 'lines' | 'polygons' | 'mixed'
  geojson: SupportedGeoJson
  color: string
  opacity: number
  visibleDefault: boolean
  status: 'active' | 'archived'
  updatedAt: string
  source?: string
  sourceUrl?: string
  readOnly?: boolean
}

export interface MapDataset {
  records: GeoRecord[]
  layers: MapLayer[]
  isOnline: boolean
  loadedFromCache: boolean
  lastUpdatedAt: string | null
  spatialPolicy: {
    privacyMode: 'exact' | 'approximate' | 'aggregate'
    minimumGroupSize: number
    coverageTarget: number
  }
}
