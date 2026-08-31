export interface CountryConfig {
  code: string
  name: string
  locale: string
  timezone: string
  currency: string
  adminLevel1Label: string
  adminLevel2Label: string
  mapCenter: { latitude: number; longitude: number }
}

export const LATAM_COUNTRIES: CountryConfig[] = [
  { code: 'AR', name: 'Argentina', locale: 'es-AR', timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS', adminLevel1Label: 'Provincia', adminLevel2Label: 'Municipio o departamento', mapCenter: { latitude: -38.42, longitude: -63.62 } },
  { code: 'BO', name: 'Bolivia', locale: 'es-BO', timezone: 'America/La_Paz', currency: 'BOB', adminLevel1Label: 'Departamento', adminLevel2Label: 'Municipio', mapCenter: { latitude: -16.29, longitude: -63.59 } },
  { code: 'BR', name: 'Brasil', locale: 'pt-BR', timezone: 'America/Sao_Paulo', currency: 'BRL', adminLevel1Label: 'Estado', adminLevel2Label: 'Município', mapCenter: { latitude: -14.24, longitude: -51.93 } },
  { code: 'CL', name: 'Chile', locale: 'es-CL', timezone: 'America/Santiago', currency: 'CLP', adminLevel1Label: 'Región', adminLevel2Label: 'Comuna', mapCenter: { latitude: -33.45, longitude: -70.67 } },
  { code: 'CO', name: 'Colombia', locale: 'es-CO', timezone: 'America/Bogota', currency: 'COP', adminLevel1Label: 'Departamento', adminLevel2Label: 'Municipio', mapCenter: { latitude: 4.57, longitude: -74.3 } },
  { code: 'CR', name: 'Costa Rica', locale: 'es-CR', timezone: 'America/Costa_Rica', currency: 'CRC', adminLevel1Label: 'Provincia', adminLevel2Label: 'Cantón', mapCenter: { latitude: 9.75, longitude: -83.75 } },
  { code: 'CU', name: 'Cuba', locale: 'es-CU', timezone: 'America/Havana', currency: 'CUP', adminLevel1Label: 'Provincia', adminLevel2Label: 'Municipio', mapCenter: { latitude: 21.52, longitude: -77.78 } },
  { code: 'DO', name: 'República Dominicana', locale: 'es-DO', timezone: 'America/Santo_Domingo', currency: 'DOP', adminLevel1Label: 'Provincia', adminLevel2Label: 'Municipio', mapCenter: { latitude: 18.74, longitude: -70.16 } },
  { code: 'EC', name: 'Ecuador', locale: 'es-EC', timezone: 'America/Guayaquil', currency: 'USD', adminLevel1Label: 'Provincia', adminLevel2Label: 'Cantón', mapCenter: { latitude: -1.83, longitude: -78.18 } },
  { code: 'SV', name: 'El Salvador', locale: 'es-SV', timezone: 'America/El_Salvador', currency: 'USD', adminLevel1Label: 'Departamento', adminLevel2Label: 'Municipio o distrito', mapCenter: { latitude: 13.79, longitude: -88.9 } },
  { code: 'GT', name: 'Guatemala', locale: 'es-GT', timezone: 'America/Guatemala', currency: 'GTQ', adminLevel1Label: 'Departamento', adminLevel2Label: 'Municipio', mapCenter: { latitude: 15.78, longitude: -90.23 } },
  { code: 'HN', name: 'Honduras', locale: 'es-HN', timezone: 'America/Tegucigalpa', currency: 'HNL', adminLevel1Label: 'Departamento', adminLevel2Label: 'Municipio', mapCenter: { latitude: 15.2, longitude: -86.24 } },
  { code: 'MX', name: 'México', locale: 'es-MX', timezone: 'America/Mexico_City', currency: 'MXN', adminLevel1Label: 'Estado', adminLevel2Label: 'Municipio o alcaldía', mapCenter: { latitude: 23.63, longitude: -102.55 } },
  { code: 'NI', name: 'Nicaragua', locale: 'es-NI', timezone: 'America/Managua', currency: 'NIO', adminLevel1Label: 'Departamento o región', adminLevel2Label: 'Municipio', mapCenter: { latitude: 12.87, longitude: -85.21 } },
  { code: 'PA', name: 'Panamá', locale: 'es-PA', timezone: 'America/Panama', currency: 'PAB', adminLevel1Label: 'Provincia o comarca', adminLevel2Label: 'Distrito', mapCenter: { latitude: 8.54, longitude: -80.78 } },
  { code: 'PY', name: 'Paraguay', locale: 'es-PY', timezone: 'America/Asuncion', currency: 'PYG', adminLevel1Label: 'Departamento', adminLevel2Label: 'Distrito', mapCenter: { latitude: -23.44, longitude: -58.44 } },
  { code: 'PE', name: 'Perú', locale: 'es-PE', timezone: 'America/Lima', currency: 'PEN', adminLevel1Label: 'Departamento o región', adminLevel2Label: 'Provincia o distrito', mapCenter: { latitude: -9.19, longitude: -75.02 } },
  { code: 'PR', name: 'Puerto Rico', locale: 'es-PR', timezone: 'America/Puerto_Rico', currency: 'USD', adminLevel1Label: 'Región', adminLevel2Label: 'Municipio', mapCenter: { latitude: 18.22, longitude: -66.59 } },
  { code: 'UY', name: 'Uruguay', locale: 'es-UY', timezone: 'America/Montevideo', currency: 'UYU', adminLevel1Label: 'Departamento', adminLevel2Label: 'Municipio', mapCenter: { latitude: -32.52, longitude: -55.77 } },
  { code: 'VE', name: 'Venezuela', locale: 'es-VE', timezone: 'America/Caracas', currency: 'VES', adminLevel1Label: 'Estado', adminLevel2Label: 'Municipio', mapCenter: { latitude: 6.42, longitude: -66.59 } },
]

export function countryConfig(code: string) {
  return LATAM_COUNTRIES.find(country => country.code === code) || LATAM_COUNTRIES.find(country => country.code === 'CO')!
}

export function countryName(code?: string) {
  return LATAM_COUNTRIES.find(country => country.code === code)?.name || code || 'Colombia'
}
