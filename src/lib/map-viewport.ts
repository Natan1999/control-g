import type { GeoJsonPosition } from '@/types/gis'

const R = 6378137
export function mercator([lng, lat]: GeoJsonPosition): GeoJsonPosition {
  const clamped = Math.max(-85, Math.min(85, lat))
  return [R * lng * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + clamped * Math.PI / 360))]
}

export function fitMap(coordinates: GeoJsonPosition[], width: number, height: number) {
  const valid = coordinates.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90)
  if (!valid.length) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const coordinate of valid) {
    const [x, y] = mercator(coordinate)
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2
  const scale = Math.min(Math.max(100, width - 96) / Math.max(400, (maxX - minX) * 1.15), Math.max(100, height - 96) / Math.max(400, (maxY - minY) * 1.15))
  const centerLatitude = valid.reduce((sum, point) => sum + point[1], 0) / valid.length
  return {
    point(coordinate: GeoJsonPosition): GeoJsonPosition {
      const [x, y] = mercator(coordinate)
      return [width / 2 + (x - centerX) * scale, height / 2 - (y - centerY) * scale]
    },
    metersPerPixel: Math.cos(centerLatitude * Math.PI / 180) / scale,
  }
}
