import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DELETION_MAILTO, getLegalDocument, LEGAL_CONTACT, LEGAL_OPERATOR, LEGAL_VERSION } from '../../../shared/legal-documents.mjs'
import { LegalLinks } from '@/components/legal/LegalLinks'

export default function LegalPage({ document }: { document: 'privacidad' | 'eliminar-cuenta' }) {
  const content = getLegalDocument(document)!
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [document])
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-[#183344] sm:py-10">
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[72ch] bg-white p-5 sm:p-9">
        <Link to="/login" className="inline-flex min-h-11 items-center font-bold text-[#1B3A4B] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Control G</Link>
        <h1 ref={heading} tabIndex={-1} className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{content.title}</h1>
        <p className="mt-4 text-sm text-slate-600">{LEGAL_OPERATOR} · Versión {LEGAL_VERSION}</p>
        <p className="mt-6 text-base leading-8">{content.introduction}</p>
        {document === 'eliminar-cuenta' ? <a href={DELETION_MAILTO} className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-[#1B3A4B] px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Preparar correo de solicitud</a> : null}
        {content.sections.map(section => (
          <section key={section.id} aria-labelledby={section.id} className="mt-9">
            <h2 id={section.id} className="text-xl font-bold leading-7">{section.title}</h2>
            {section.paragraphs.map(paragraph => <p key={paragraph} className="mt-4 break-words text-base leading-8">{paragraph}</p>)}
          </section>
        ))}
        <p className="mt-8 break-words leading-8">Contacto: <a href={`mailto:${LEGAL_CONTACT}`} className="underline underline-offset-4">{LEGAL_CONTACT}</a>.</p>
        <p className="mt-4 text-sm leading-7 text-slate-600">Esta copia está incluida en la aplicación y se puede leer sin conexión. Puedes consultar la versión publicada en <a href={`https://www.controlg.co/${content.slug}`} className="underline underline-offset-4">www.controlg.co/{content.slug}</a> con internet. Preparar un correo no lo envía ni elimina información automáticamente.</p>
        <footer className="mt-8 border-t border-slate-200 text-[#075e83]"><LegalLinks /></footer>
      </main>
    </div>
  )
}
