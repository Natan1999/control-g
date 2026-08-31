import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportClientError } from '@/lib/monitoring'

interface State {
  failed: boolean
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportClientError(error, 'react-boundary', info.componentStack || '')
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5" aria-labelledby="app-error-title">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><AlertTriangle size={27} aria-hidden="true" /></span>
          <h1 id="app-error-title" className="mt-5 text-2xl font-black text-slate-950">No pudimos mostrar esta pantalla</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Los datos guardados en el dispositivo no se eliminaron. Recarga Control G y vuelve a intentarlo.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B3A4B] px-5 font-black text-white">
            <RefreshCw size={18} aria-hidden="true" /> Recargar aplicación
          </button>
        </section>
      </main>
    )
  }
}
