const RELEASE = import.meta.env.VITE_APP_VERSION || '2.15.0'
const ENABLED = import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true'

type ErrorKind = 'react-boundary' | 'window-error' | 'unhandled-rejection'

function sanitizeText(input: unknown, maxLength = 1_500) {
  return String(input || '')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[token]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/https?:\/\/[^\s)]+/gi, '[url]')
    .replace(/\b\d{6,}\b/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function endpoint() {
  if (import.meta.env.VITE_MONITORING_ENDPOINT) return import.meta.env.VITE_MONITORING_ENDPOINT
  return window.location.protocol === 'capacitor:'
    ? 'https://www.controlg.co/api/monitoring/client-error'
    : '/api/monitoring/client-error'
}

export function reportClientError(error: unknown, kind: ErrorKind, componentStack = '') {
  if (!ENABLED || !navigator.onLine) return
  const normalized = error instanceof Error ? error : new Error(String(error || 'Unknown error'))
  const payload = {
    eventId: crypto.randomUUID(),
    release: RELEASE,
    kind,
    route: window.location.pathname,
    online: navigator.onLine,
    native: window.location.protocol === 'capacitor:',
    message: sanitizeText(normalized.message, 500),
    stack: sanitizeText(`${normalized.stack || ''} ${componentStack}`),
  }
  void fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined)
}

export function initializeClientMonitoring() {
  if (!ENABLED) return
  window.addEventListener('error', event => reportClientError(event.error || event.message, 'window-error'))
  window.addEventListener('unhandledrejection', event => reportClientError(event.reason, 'unhandled-rejection'))
}
