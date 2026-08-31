import type { AnalyticsReport } from '@/types/analytics'
import { utf8, zipStored } from '@/lib/zip'

export type AnalyticsExportFormat = 'pdf' | 'docx' | 'xlsx' | 'csv'

export interface ReportArtifact {
  blob: Blob
  filename: string
  format: AnalyticsExportFormat
}

function xml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function safeFilename(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'control-g'
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function asBlob(bytes: Uint8Array, type: string) {
  const copy = bytes.slice().buffer
  return new Blob([copy], { type })
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function createCsv(report: AnalyticsReport) {
  const rows: unknown[][] = [
    ['CONTROL G - INFORME ANALÍTICO INSTITUCIONAL'],
    ['Entidad', report.entityName],
    ['Fecha de corte', report.cutoffAt],
    ['Metodología', report.methodologyVersion],
    [],
    ['INDICADORES'],
    ['Código', 'Indicador', 'Valor', 'Unidad', 'Metodología', 'Advertencia'],
    ...report.kpis.map(kpi => [kpi.code, kpi.label, kpi.value, kpi.unit, kpi.methodology, kpi.warning || '']),
    [],
    ['TERRITORIOS'],
    ['Territorio', 'Meta', 'Registros', 'Con GPS', 'Revisados', 'Rechazados', 'Cobertura %', 'GPS %', 'Suprimido'],
    ...report.territories.map(item => [item.suppressed ? 'Grupo pequeño suprimido' : item.name, item.target, item.suppressed ? '<5' : item.total, item.suppressed ? '' : item.mapped, item.suppressed ? '' : item.reviewed, item.suppressed ? '' : item.rejected, item.suppressed ? '' : item.coveragePercent ?? '', item.suppressed ? '' : item.gpsPercent, item.suppressed ? 'Sí' : 'No']),
    [],
    ['ADVERTENCIAS'],
    ...report.warnings.map(warning => [warning]),
  ]
  return new Blob([`${String.fromCharCode(0xFEFF)}${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
}

function excelColumn(index: number) {
  let value = index + 1
  let output = ''
  while (value > 0) {
    value -= 1
    output = String.fromCharCode(65 + (value % 26)) + output
    value = Math.floor(value / 26)
  }
  return output
}

function worksheetXml(rows: unknown[][]) {
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${excelColumn(columnIndex)}${rowIndex + 1}`
      const isHeader = rowIndex === 0
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${reference}"${isHeader ? ' s="1"' : ''}><v>${value}</v></c>`
      }
      if (typeof value === 'boolean') return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`
      return `<c r="${reference}" t="inlineStr"${isHeader ? ' s="1"' : ''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const width = Math.max(1, ...rows.map(row => row.length))
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${excelColumn(width - 1)}${Math.max(1, rows.length)}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="${width}" width="24" customWidth="1"/></cols><sheetData>${body}</sheetData><autoFilter ref="A1:${excelColumn(width - 1)}${Math.max(1, rows.length)}"/></worksheet>`
}

function createXlsx(report: AnalyticsReport) {
  const sheets = [
    {
      name: 'Resumen',
      rows: [
        ['Indicador', 'Valor visible', 'Valor numérico', 'Unidad', 'Metodología', 'Advertencia'],
        ...report.kpis.map(kpi => [kpi.label, kpi.display, kpi.value, kpi.unit, kpi.methodology, kpi.warning || '']),
        ...report.warnings.map(warning => ['Advertencia', warning, '', '', '', '']),
      ],
    },
    {
      name: 'Territorios',
      rows: [
        ['Territorio', 'Meta', 'Registros', 'Con GPS', 'Revisados', 'Rechazados', 'Cobertura %', 'GPS %', 'Suprimido'],
        ...report.territories.map(item => [item.suppressed ? 'Grupo pequeño suprimido' : item.name, item.target, item.suppressed ? '<5' : item.total, item.suppressed ? '' : item.mapped, item.suppressed ? '' : item.reviewed, item.suppressed ? '' : item.rejected, item.suppressed ? '' : item.coveragePercent ?? '', item.suppressed ? '' : item.gpsPercent, item.suppressed]),
      ],
    },
    {
      name: 'Serie temporal',
      rows: [
        ['Fecha', 'Registros', 'Con GPS', 'Revisados'],
        ...report.timeline.map(item => [item.date, item.total, item.mapped, item.reviewed]),
      ],
    },
    {
      name: 'Variable temática',
      rows: [
        ['Variable', report.thematicVariable?.label || 'No seleccionada', '', ''],
        ['Categoría', 'Conteo', 'Porcentaje', 'Suprimido'],
        ...report.thematicDistribution.map(item => [item.label, item.suppressed ? '<5 por categoría' : item.count, item.suppressed ? '' : item.percentage, item.suppressed]),
      ],
    },
    {
      name: 'Metodología',
      rows: [
        ['Campo', 'Valor'],
        ['Entidad', report.entityName],
        ['Fecha de corte', report.cutoffAt],
        ['Versión metodológica', report.methodologyVersion],
        ['Formulario', report.filters.formId || 'Todos'],
        ['Territorio', report.filters.municipalityId || 'Todos'],
        ['Estado', report.filters.status || 'Todos'],
        ['Desde', report.filters.from || 'Sin límite'],
        ['Hasta', report.filters.to || 'Sin límite'],
      ],
    },
  ]
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B3A4B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`
  const now = xml(report.cutoffAt)
  const files = [
    { name: '[Content_Types].xml', bytes: utf8(contentTypes) },
    { name: '_rels/.rels', bytes: utf8(rootRels) },
    { name: 'xl/workbook.xml', bytes: utf8(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', bytes: utf8(workbookRels) },
    { name: 'xl/styles.xml', bytes: utf8(styles) },
    { name: 'docProps/core.xml', bytes: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Informe analítico Control G</dc:title><dc:creator>Control G · DRAN Digital</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`) },
    { name: 'docProps/app.xml', bytes: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Control G</Application><TitlesOfParts><vt:vector xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes" size="${sheets.length}" baseType="lpstr">${sheets.map(sheet => `<vt:lpstr>${xml(sheet.name)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts></Properties>`) },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, bytes: utf8(worksheetXml(sheet.rows)) })),
  ]
  return asBlob(zipStored(files), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

function wordRun(value: unknown, bold = false, inverse = false) {
  return `<w:r>${bold || inverse ? `<w:rPr>${bold ? '<w:b/>' : ''}${inverse ? '<w:color w:val="FFFFFF"/>' : ''}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(value)}</w:t></w:r>`
}

function wordParagraph(value: unknown, style?: string) {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${wordRun(value)}</w:p>`
}

function wordTable(rows: unknown[][]) {
  return `<w:tbl><w:tblPr><w:tblStyle w:val="ControlGTable"/><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${Array.from({ length: Math.max(1, ...rows.map(row => row.length)) }, () => '<w:gridCol w:w="1560"/>').join('')}</w:tblGrid>${rows.map((row, rowIndex) => `<w:tr>${row.map(value => `<w:tc><w:tcPr><w:tcW w:w="1560" w:type="dxa"/>${rowIndex === 0 ? '<w:shd w:fill="1B3A4B"/>' : ''}</w:tcPr><w:p>${wordRun(value, rowIndex === 0, rowIndex === 0)}</w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`
}

function createDocx(report: AnalyticsReport) {
  const body = [
    wordParagraph('CONTROL G', 'Title'),
    wordParagraph('Informe analítico institucional', 'Subtitle'),
    wordParagraph(`Entidad: ${report.entityName}`),
    wordParagraph(`Fecha de corte: ${new Date(report.cutoffAt).toLocaleString('es-CO')}`),
    wordParagraph(`Versión metodológica: ${report.methodologyVersion}`),
    wordParagraph('Resumen ejecutivo', 'Heading1'),
    wordTable([
      ['Indicador', 'Resultado', 'Metodología'],
      ...report.kpis.map(kpi => [kpi.label, kpi.display, kpi.methodology]),
    ]),
    wordParagraph('Cobertura territorial', 'Heading1'),
    wordTable([
      ['Territorio', 'Registros', 'GPS', 'Revisados', 'Cobertura'],
      ...report.territories.map(item => [item.suppressed ? 'Grupo pequeño suprimido' : item.name, item.suppressed ? '<5' : item.total, item.suppressed ? '—' : `${item.gpsPercent.toFixed(1)}%`, item.suppressed ? '—' : item.reviewed, item.suppressed ? '—' : item.coveragePercent === null ? 'Sin meta' : `${item.coveragePercent.toFixed(1)}%`]),
    ]),
    ...(report.thematicVariable ? [
      wordParagraph(`Resultado temático: ${report.thematicVariable.label}`, 'Heading1'),
      wordTable([
        ['Categoría', 'Conteo', 'Porcentaje'],
        ...report.thematicDistribution.map(item => [item.label, item.suppressed ? '<5 por categoría' : item.count, item.suppressed ? '—' : `${item.percentage.toFixed(1)}%`]),
      ]),
    ] : []),
    wordParagraph('Advertencias y límites', 'Heading1'),
    ...report.warnings.map(warning => wordParagraph(`• ${warning}`)),
    wordParagraph('Metodología y filtros', 'Heading1'),
    wordParagraph(`Formulario: ${report.filters.formId || 'Todos'} · Territorio: ${report.filters.municipalityId || 'Todos'} · Estado: ${report.filters.status || 'Todos'} · Periodo: ${report.filters.from || 'inicio'} a ${report.filters.to || 'fecha de corte'}.`),
    wordParagraph('Documento generado automáticamente por Control G. Los resultados son descriptivos y deben interpretarse con las limitaciones metodológicas del operativo.'),
  ].join('')
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:color w:val="24323D"/></w:rPr><w:pPr><w:spacing w:after="120"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="1B3A4B"/></w:rPr><w:pPr><w:spacing w:after="80"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="26"/><w:color w:val="3D7B9E"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1B3A4B"/></w:rPr><w:pPr><w:spacing w:before="240" w:after="120"/><w:keepNext/></w:pPr></w:style><w:style w:type="table" w:styleId="ControlGTable"><w:name w:val="Control G Table"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:color="E2E8F0"/></w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`
  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Informe analítico Control G</dc:title><dc:creator>Control G · DRAN Digital</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${xml(report.cutoffAt)}</dcterms:created></cp:coreProperties>`
  return asBlob(zipStored([
    { name: '[Content_Types].xml', bytes: utf8(contentTypes) },
    { name: '_rels/.rels', bytes: utf8(rootRels) },
    { name: 'word/document.xml', bytes: utf8(documentXml) },
    { name: 'word/styles.xml', bytes: utf8(styles) },
    { name: 'word/_rels/document.xml.rels', bytes: utf8(documentRels) },
    { name: 'docProps/core.xml', bytes: utf8(core) },
  ]), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}

async function createPdf(report: AnalyticsReport) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const width = doc.internal.pageSize.getWidth()
  const footer = () => {
    doc.setFontSize(7)
    doc.setTextColor(105, 120, 130)
    doc.text(`Control G · ${report.methodologyVersion} · Corte ${new Date(report.cutoffAt).toLocaleString('es-CO')}`, 14, 274)
  }
  const addPage = () => {
    footer()
    doc.addPage()
    return 22
  }
  doc.setFillColor(27, 58, 75)
  doc.rect(0, 0, width, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('CONTROL G · INFORME ANALÍTICO', 14, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(report.entityName, 14, 22)
  let y = 42
  doc.setTextColor(27, 58, 75)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Resumen ejecutivo', 14, y)
  y += 9
  for (const kpi of report.kpis) {
    doc.setFillColor(244, 247, 248)
    doc.roundedRect(14, y - 5, 188, 11, 2, 2, 'F')
    doc.setTextColor(45, 58, 68)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(kpi.label, 18, y + 1)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(27, 58, 75)
    doc.text(kpi.display, 198, y + 1, { align: 'right' })
    y += 14
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Cobertura territorial', 14, y)
  y += 8
  doc.setFontSize(7.5)
  for (const item of report.territories) {
    if (y > 258) y = addPage()
    doc.setTextColor(35, 45, 55)
    doc.setFont('helvetica', 'normal')
    const name = item.suppressed ? 'Grupo pequeño suprimido' : item.name
    doc.text(name, 14, y, { maxWidth: 72 })
      doc.text(item.suppressed ? 'Registros: <5' : `Registros: ${item.total}`, 92, y)
      doc.text(item.suppressed ? 'GPS: —' : `GPS: ${item.gpsPercent.toFixed(1)}%`, 125, y)
      doc.text(item.suppressed ? 'Revisión: —' : `Revisión: ${item.reviewed}`, 155, y)
      doc.text(item.suppressed ? 'Cobertura: —' : item.coveragePercent === null ? 'Sin meta' : `Cobertura: ${item.coveragePercent.toFixed(1)}%`, 198, y, { align: 'right' })
    y += 7
  }
  if (report.thematicVariable) {
    y += 5
    if (y > 245) y = addPage()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Variable temática: ${report.thematicVariable.label}`, 14, y)
    y += 8
    doc.setFontSize(8)
    for (const item of report.thematicDistribution) {
      if (y > 258) y = addPage()
      doc.setFont('helvetica', 'normal')
      doc.text(item.label, 18, y, { maxWidth: 120 })
      doc.text(item.suppressed ? '<5 por categoría' : `${item.count} (${item.percentage.toFixed(1)}%)`, 198, y, { align: 'right' })
      y += 7
    }
  }
  y += 5
  if (y > 235) y = addPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Advertencias y metodología', 14, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  for (const warning of report.warnings) {
    const lines = doc.splitTextToSize(`• ${warning}`, 184)
    doc.text(lines, 18, y)
    y += lines.length * 4 + 3
  }
  footer()
  return doc.output('blob')
}

export async function createReportArtifact(format: AnalyticsExportFormat, report: AnalyticsReport): Promise<ReportArtifact> {
  const base = `${safeFilename(report.entityName)}-informe-analitico-${report.cutoffAt.slice(0, 10)}`
  if (format === 'csv') return { blob: createCsv(report), filename: `${base}.csv`, format }
  if (format === 'xlsx') return { blob: createXlsx(report), filename: `${base}.xlsx`, format }
  if (format === 'docx') return { blob: createDocx(report), filename: `${base}.docx`, format }
  return { blob: await createPdf(report), filename: `${base}.pdf`, format }
}

export function downloadReportArtifact(artifact: ReportArtifact) {
  download(artifact.blob, artifact.filename)
}

export async function sha256Hex(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
