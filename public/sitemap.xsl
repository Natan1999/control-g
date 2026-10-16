<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9" exclude-result-prefixes="s">
  <xsl:output method="html" encoding="UTF-8"/>
  <xsl:template match="/">
    <html lang="es-CO">
      <head>
        <meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Sitemap XML | Control G</title>
        <style>body{margin:0;background:#f4f8fa;color:#132b36;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:clamp(20px,5vw,64px)}h1{font-size:clamp(30px,5vw,48px);line-height:1.15}a{color:#086776;overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:20px}table{width:100%;border-collapse:collapse;background:white;margin-top:30px}th,td{text-align:left;padding:14px;border-bottom:1px solid #d4e1e8}th{background:#123b50;color:white}td:last-child{white-space:nowrap}@media(max-width:600px){th:last-child,td:last-child{display:none}td{padding:12px}}</style>
      </head>
      <body><main>
        <nav aria-label="Documentos públicos"><a href="/">Control G</a><a href="/sitemap.html">Mapa del sitio para personas</a><a href="/robots.txt">Robots</a><a href="/llms.txt">Información para IA</a></nav>
        <h1>Sitemap XML de Control G</h1>
        <p>Este archivo permite a los buscadores descubrir las páginas públicas de la plataforma. Contiene <strong><xsl:value-of select="count(s:urlset/s:url)"/></strong> URLs. No incluye cuentas, paneles privados ni respuestas de encuestas.</p>
        <p>Para una vista organizada por soluciones, países y artículos, visite el <a href="/sitemap.html">mapa del sitio en HTML</a>.</p>
        <table><thead><tr><th scope="col">Página pública</th><th scope="col">Última actualización</th></tr></thead><tbody>
          <xsl:for-each select="s:urlset/s:url"><tr><td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td><td><xsl:value-of select="s:lastmod"/></td></tr></xsl:for-each>
        </tbody></table>
      </main></body>
    </html>
  </xsl:template>
</xsl:stylesheet>
