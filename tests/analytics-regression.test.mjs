import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function importTypeScriptModule(path) {
  const source = await readFile(path, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

const analytics = await importTypeScriptModule('src/lib/analytics.ts')
const fixture = JSON.parse(await readFile('tests/fixtures/indicator-pattern.json', 'utf8'))

test('el dataset patrón fija KPIs, supresión y metodología de forma reproducible', () => {
  const report = analytics.buildAnalyticsReport({
    entityId: fixture.entity.id,
    entityName: fixture.entity.name,
    forms: fixture.forms,
    responses: fixture.responses,
    municipalities: fixture.municipalities,
    filters: { formId: '', municipalityId: '', status: '', from: '', to: '', variableKey: 'pattern-form:water' },
    minimumGroupSize: 3,
  })
  const kpi = code => report.kpis.find(item => item.code === code)?.value
  assert.equal(report.methodologyVersion, 'control-g-analytics-v1')
  assert.equal(report.recordCount, fixture.expected.records)
  assert.equal(kpi('gps_coverage'), fixture.expected.gpsCoverage)
  assert.equal(kpi('reviewed_share'), fixture.expected.reviewedShare)
  assert.equal(kpi('approved_share'), fixture.expected.approvedShare)
  assert.equal(kpi('rejected_share'), fixture.expected.rejectedShare)
  assert.equal(Math.round(kpi('required_completeness') * 100) / 100, fixture.expected.requiredCompleteness)
  assert.equal(kpi('median_sync_lag'), fixture.expected.medianSyncLag)
  assert.equal(report.thematicDistribution.find(item => !item.suppressed)?.count, fixture.expected.thematicVisible)
  assert.equal(report.thematicDistribution.find(item => item.suppressed)?.count, fixture.expected.thematicSuppressed)
  assert.equal(report.territories.find(item => item.id === 'territory-a')?.coveragePercent, 70)
  assert.equal(report.territories.find(item => item.id === 'territory-b')?.coveragePercent, 30)
})

test('los filtros del dataset patrón producen cortes estables sin exponer variables sensibles', () => {
  const variables = analytics.listAnalyticsVariables(fixture.forms, fixture.responses)
  assert.ok(variables.some(variable => variable.key === 'water'))
  assert.ok(!variables.some(variable => variable.key === 'full_name'))
  const report = analytics.buildAnalyticsReport({
    entityId: fixture.entity.id,
    entityName: fixture.entity.name,
    forms: fixture.forms,
    responses: fixture.responses,
    municipalities: fixture.municipalities,
    filters: { formId: 'pattern-form', municipalityId: 'territory-b', status: '', from: '2026-08-01', to: '2026-08-31', variableKey: '' },
    minimumGroupSize: 5,
  })
  assert.equal(report.recordCount, 3)
  assert.equal(report.territories[0].suppressed, true)
})
