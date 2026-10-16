import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  canOfferMarketingAnalytics, getMarketingConsent, setMarketingConsent,
  stopMarketingAnalytics, subscribeMarketingConsent, syncMarketingPageView,
  type MarketingConsent,
} from '@/lib/marketing-analytics'

export function MarketingAnalytics() {
  const { pathname } = useLocation()
  const [eligible, setEligible] = useState(false)
  const [consent, setConsent] = useState<MarketingConsent>(null)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  useEffect(() => {
    const refresh = () => {
      const allowed = canOfferMarketingAnalytics()
      setEligible(allowed)
      setConsent(getMarketingConsent())
      if (allowed) syncMarketingPageView()
      else stopMarketingAnalytics()
    }
    refresh()
    const unsubscribe = subscribeMarketingConsent(refresh)
    // Metadata may arrive after a client-side route or CMS article resolves.
    const observer = new MutationObserver(refresh)
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'content'] })
    return () => { observer.disconnect(); unsubscribe(); stopMarketingAnalytics() }
  }, [pathname])

  if (!eligible) return null
  const showBanner = consent === null || preferencesOpen
  const choose = (value: 'accepted' | 'rejected') => {
    setMarketingConsent(value)
    setConsent(value)
    setPreferencesOpen(false)
  }

  return (
    <>
      <button type="button" onClick={() => setPreferencesOpen(value => !value)} aria-expanded={showBanner} aria-controls={showBanner ? 'control-g-analytics-preferences' : undefined} className="fixed bottom-5 left-4 z-[55] inline-flex min-h-11 items-center justify-center rounded-full border border-[#C8DCE5] bg-white px-3 py-2 text-[11px] font-semibold text-[#123B50] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087E8B] sm:bottom-6 sm:left-6">Preferencias de medición</button>
      {showBanner ? <aside id="control-g-analytics-preferences" role="region" aria-labelledby="control-g-analytics-title" aria-describedby="control-g-analytics-description" className="fixed inset-x-4 bottom-20 z-[60] mx-auto max-h-[calc(100dvh-7rem)] max-w-3xl overflow-y-auto rounded-xl border border-[#C8DCE5] bg-white p-5 text-[#132B36] shadow-[0_12px_50px_rgba(18,59,80,.18)] sm:p-6">
        <h2 id="control-g-analytics-title" className="text-lg font-bold leading-snug text-[#123B50]">Medición del sitio público</h2>
        <p id="control-g-analytics-description" className="mt-3 text-sm leading-6 text-[#4D6470]">Con su permiso usamos Google Analytics para conocer las visitas a este sitio y los clics de contacto. No medimos los paneles privados ni las respuestas de las encuestas. La elección se guarda en este navegador y puede cambiarla cuando quiera.</p>
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-[#087E8B] underline underline-offset-4">Cómo trata los datos Google</a>
        {consent !== null ? <p className="mt-2 text-xs leading-6 text-[#4D6470]">Preferencia actual: {consent === 'accepted' ? 'medición permitida' : 'medición rechazada'}.</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => choose('rejected')} className="min-h-12 rounded-lg border border-[#123B50] bg-white px-4 py-3 text-sm font-bold text-[#123B50] hover:bg-[#F4F8FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087E8B]">Rechazar</button><button type="button" onClick={() => choose('accepted')} className="min-h-12 rounded-lg border border-[#123B50] bg-white px-4 py-3 text-sm font-bold text-[#123B50] hover:bg-[#F4F8FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087E8B]">Permitir</button></div>
        {consent !== null ? <button type="button" onClick={() => setPreferencesOpen(false)} className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-[#4D6470] underline underline-offset-4">Mantener mi preferencia</button> : null}
      </aside> : null}
    </>
  )
}
