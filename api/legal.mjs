import { renderLegalDocument } from '../shared/legal-documents.mjs'

export default function legal(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Robots-Tag', 'noindex, follow, noarchive')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD')
    res.statusCode = 405
    return res.end()
  }
  const html = renderLegalDocument(req.query?.document)
  res.statusCode = html ? 200 : 404
  res.end(req.method === 'HEAD' ? '' : html || 'Documento no encontrado')
}
