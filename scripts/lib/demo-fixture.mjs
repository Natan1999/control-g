import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const transpile = text => ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText
const dataUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
export async function loadDemoFixture(namespace) {
  const demoUrl = dataUrl(transpile(await readFile('src/lib/municipal-demo.ts','utf8')))
  const builderSource = transpile(await readFile('src/lib/entity-provisioning.ts','utf8')).replace("'./municipal-demo'",JSON.stringify(demoUrl)).replace('"./municipal-demo"',JSON.stringify(demoUrl))
  const builder = await import(dataUrl(builderSource))
  const bundle = builder.buildMunicipalProvisionBundle()
  const accounts = builder.generateDemoAccounts(namespace)
  const entity = {name:'Alcaldía Villa Esperanza · DEMO',department:'Bolívar',country_code:'CO',locale:'es-CO',timezone:'America/Bogota',currency_code:'COP',contract_number:`DEMO-${namespace}`,contract_object:'Caracterización ficticia de juventud y servicios públicos',operator_name:'DRAN Digital · Demostración',is_demo:true,entity_kind:'municipality',default_map_center:{latitude:10.36,longitude:-75.42},map_privacy_mode:'exact',map_minimum_group_size:5,map_coverage_target:35,require_mfa_for_privileged:true,period_start:new Date().toISOString().slice(0,10),period_end:`${new Date().getFullYear()+1}-12-31`,families_per_municipality:40,territories:bundle.territories}
  return {entity,accounts,bundle}
}
