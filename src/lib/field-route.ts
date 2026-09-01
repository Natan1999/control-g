import type { GeoJsonPosition, GeoRecord } from '@/types/gis'

const EARTH_RADIUS_M = 6_371_008.8
const MAX_ROUTE_STOPS = 100

export interface FieldRouteOrigin {
  latitude: number
  longitude: number
  label?: string
}

export interface FieldRouteStop {
  record: GeoRecord
  order: number
  distanceFromPreviousMeters: number
  cumulativeDistanceMeters: number
}

export interface FieldRoutePlan {
  origin: FieldRouteOrigin | null
  stops: FieldRouteStop[]
  coordinates: GeoJsonPosition[]
  totalDistanceMeters: number
  baselineDistanceMeters: number
  savedDistanceMeters: number
  truncated: boolean
}

function radians(value: number) {
  return value * Math.PI / 180
}

export function routeDistanceMeters(first: FieldRouteOrigin, second: FieldRouteOrigin) {
  const latitude1 = radians(first.latitude)
  const latitude2 = radians(second.latitude)
  const latitudeDelta = latitude2 - latitude1
  const longitudeDelta = radians(second.longitude - first.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

function isRoutePoint(value: FieldRouteOrigin | null | undefined): value is FieldRouteOrigin {
  return Boolean(value
    && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90
    && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180
    && !(value.latitude === 0 && value.longitude === 0))
}

function pathDistance(records: GeoRecord[], origin: FieldRouteOrigin | null) {
  let previous: FieldRouteOrigin | null = origin
  let distance = 0
  for (const record of records) {
    if (previous) distance += routeDistanceMeters(previous, record)
    previous = record
  }
  return distance
}

function nearestNeighbour(records: GeoRecord[], origin: FieldRouteOrigin | null, maximumStops: number) {
  const remaining = [...records]
  const ordered: GeoRecord[] = []
  let current: FieldRouteOrigin | null = origin

  if (!current && remaining.length) {
    current = remaining.shift()!
    ordered.push(current as GeoRecord)
  }

  while (remaining.length && ordered.length < maximumStops) {
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    for (let index = 0; index < remaining.length; index += 1) {
      const distance = routeDistanceMeters(current!, remaining[index])
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    }
    const [nearest] = remaining.splice(nearestIndex, 1)
    ordered.push(nearest)
    current = nearest
  }
  return ordered
}

function improveWithTwoOpt(records: GeoRecord[], origin: FieldRouteOrigin | null) {
  const route = [...records]
  if (route.length < 3) return route

  for (let pass = 0; pass < 6; pass += 1) {
    let improved = false
    for (let start = 0; start < route.length - 1; start += 1) {
      const previous = start === 0 ? origin : route[start - 1]
      if (!previous) continue
      for (let end = start + 1; end < route.length; end += 1) {
        const next = route[end + 1]
        const currentDistance = routeDistanceMeters(previous, route[start])
          + (next ? routeDistanceMeters(route[end], next) : 0)
        const reversedDistance = routeDistanceMeters(previous, route[end])
          + (next ? routeDistanceMeters(route[start], next) : 0)
        if (reversedDistance + 0.01 < currentDistance) {
          const reversed = route.slice(start, end + 1).reverse()
          route.splice(start, reversed.length, ...reversed)
          improved = true
        }
      }
    }
    if (!improved) break
  }
  return route
}

export function planFieldRoute(
  records: GeoRecord[],
  origin?: FieldRouteOrigin | null,
  requestedMaximumStops = 25,
): FieldRoutePlan {
  const maximumStops = Math.min(MAX_ROUTE_STOPS, Math.max(1, Math.floor(requestedMaximumStops) || 1))
  const validOrigin = isRoutePoint(origin) ? origin : null
  const uniqueRecords = Array.from(new Map(records
    .filter(record => isRoutePoint(record) && record.id !== 'device-current-position')
    .map(record => [record.id, record])).values())
  const baselineRecords = uniqueRecords.slice(0, maximumStops)
  const greedy = nearestNeighbour(uniqueRecords, validOrigin, maximumStops)
  const optimized = improveWithTwoOpt(greedy, validOrigin)
  const baselineDistanceMeters = pathDistance(baselineRecords, validOrigin)

  let previous: FieldRouteOrigin | null = validOrigin
  let cumulativeDistanceMeters = 0
  const stops = optimized.map((record, index) => {
    const distanceFromPreviousMeters = previous ? routeDistanceMeters(previous, record) : 0
    cumulativeDistanceMeters += distanceFromPreviousMeters
    previous = record
    return {
      record,
      order: index + 1,
      distanceFromPreviousMeters,
      cumulativeDistanceMeters,
    }
  })
  const coordinates: GeoJsonPosition[] = [
    ...(validOrigin ? [[validOrigin.longitude, validOrigin.latitude] as GeoJsonPosition] : []),
    ...stops.map(stop => [stop.record.longitude, stop.record.latitude] as GeoJsonPosition),
  ]

  return {
    origin: validOrigin,
    stops,
    coordinates,
    totalDistanceMeters: cumulativeDistanceMeters,
    baselineDistanceMeters,
    savedDistanceMeters: Math.max(0, baselineDistanceMeters - cumulativeDistanceMeters),
    truncated: uniqueRecords.length > maximumStops,
  }
}

export function formatRouteDistance(meters: number) {
  if (meters < 1_000) return `${Math.round(meters)} m`
  return `${(meters / 1_000).toFixed(meters < 10_000 ? 1 : 0)} km`
}
