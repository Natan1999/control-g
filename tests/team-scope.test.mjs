import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const source=await readFile('src/lib/team-scope.ts','utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText
const{resolveTeamScope,canInviteTeamRole}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
test('only superadmin may choose a tenant and create coordinators',()=>{
  const root=resolveTeamScope({role:'admin'},'demo-target')
  assert.equal(root.entityId,'demo-target');assert.equal(canInviteTeamRole(root,'coordinator'),true)
  assert.equal(canInviteTeamRole(root,'admin'),false)
  assert.equal(resolveTeamScope({role:'admin'}),null)
})
test('coordinators cannot switch tenants or grant a coordinator/admin role',()=>{
  const scope=resolveTeamScope({role:'coordinator',entityId:'own'},'other')
  assert.equal(scope.entityId,'own')
  assert.equal(canInviteTeamRole(scope,'coordinator'),false);assert.equal(canInviteTeamRole(scope,'admin'),false)
  assert.equal(canInviteTeamRole(scope,'support'),true);assert.equal(canInviteTeamRole(scope,'professional'),true)
  assert.equal(resolveTeamScope({role:'professional',entityId:'own'},'other'),null)
  assert.equal(resolveTeamScope({role:'support',entityId:'own'},'other'),null)
  assert.equal(resolveTeamScope(null,'other'),null)
})
