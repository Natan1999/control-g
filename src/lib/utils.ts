import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7) return `Hace ${days}d`
  return formatDate(date)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

export function getConfidenceClass(confidence: number) {
  const pct = Math.round(confidence * 100)
  if (pct >= 90) return 'text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700'
  if (pct >= 70) return 'text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700'
  return 'text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700'
}

export function getConfidenceLabel(confidence: number) {
  const pct = Math.round(confidence * 100)
  return `${pct}% confianza`
}
