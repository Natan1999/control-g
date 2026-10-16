import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import { trackMarketingEvent, whatsappUrl } from '@/lib/marketing'

interface WhatsAppCtaProps {
  message: string
  placement: string
  children?: ReactNode
  className?: string
}

export function WhatsAppCta({ message, placement, children, className = '' }: WhatsAppCtaProps) {
  return (
    <a
      href={whatsappUrl(message, placement)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackMarketingEvent('whatsapp_lead', { placement })}
      className={className}
    >
      {children ?? (
        <>
          <MessageCircle size={19} aria-hidden="true" />
          Hablar con un asesor
        </>
      )}
    </a>
  )
}

export function StickyWhatsApp({ message }: { message: string }) {
  return (
    <WhatsAppCta
      message={message}
      placement="boton-flotante"
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-[#146B46] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_35px_rgba(20,107,70,.25)] transition hover:-translate-y-0.5 hover:bg-[#0e5536] focus:outline-none focus:ring-4 focus:ring-green-200"
    >
      <MessageCircle size={19} aria-hidden="true" />
      <span className="sm:hidden">WhatsApp</span>
      <span className="hidden sm:inline">Hablar con un asesor</span>
    </WhatsAppCta>
  )
}
