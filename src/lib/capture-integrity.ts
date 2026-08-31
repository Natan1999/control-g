import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export type GeoQualityStatus = 'good' | 'low_accuracy' | 'invalid' | 'permission_denied' | 'unavailable'

export interface GeoCaptureMetadata {
  latitude: number | null
  longitude: number | null
  originalLatitude: number | null
  originalLongitude: number | null
  accuracyM: number | null
  altitudeM: number | null
  deviceTimestamp: string
  provider: string
  mockedSignal: boolean | null
  qualityStatus: GeoQualityStatus
  qualityNotes: string
}

function errorQuality(error: unknown): Pick<GeoCaptureMetadata, 'qualityStatus' | 'qualityNotes'> {
  const message = error instanceof Error ? error.message : String(error || '')
  if (/permission|denied|permiso/i.test(message)) {
    return { qualityStatus: 'permission_denied', qualityNotes: 'Permiso de ubicación denegado o restringido.' }
  }
  return { qualityStatus: 'unavailable', qualityNotes: 'El dispositivo no entregó una coordenada dentro del tiempo permitido.' }
}

export async function captureGeoMetadata(maxAccuracyM = 50): Promise<GeoCaptureMetadata> {
  const base = {
    latitude: null,
    longitude: null,
    originalLatitude: null,
    originalLongitude: null,
    accuracyM: null,
    altitudeM: null,
    deviceTimestamp: new Date().toISOString(),
    provider: Capacitor.isNativePlatform() ? 'capacitor_gnss' : 'browser_geolocation',
    mockedSignal: null,
  }
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 })
    const latitude = position.coords.latitude
    const longitude = position.coords.longitude
    const accuracyM = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
    const invalid = !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      || (latitude === 0 && longitude === 0)
    const lowAccuracy = !invalid && (accuracyM === null || accuracyM > maxAccuracyM)
    return {
      ...base,
      latitude: invalid ? null : latitude,
      longitude: invalid ? null : longitude,
      originalLatitude: invalid ? null : latitude,
      originalLongitude: invalid ? null : longitude,
      accuracyM,
      altitudeM: Number.isFinite(position.coords.altitude) ? position.coords.altitude : null,
      deviceTimestamp: new Date(position.timestamp || Date.now()).toISOString(),
      qualityStatus: invalid ? 'invalid' : lowAccuracy ? 'low_accuracy' : 'good',
      qualityNotes: invalid
        ? 'Coordenada inválida o 0/0; no se utilizó para el mapa.'
        : lowAccuracy
          ? `Precisión ${accuracyM === null ? 'desconocida' : `${Math.round(accuracyM)} m`}; supera el umbral de ${maxAccuracyM} m.`
          : `Precisión dentro del umbral de ${maxAccuracyM} m.`,
    }
  } catch (error) {
    return { ...base, ...errorQuality(error) }
  }
}

export async function sha256Blob(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
