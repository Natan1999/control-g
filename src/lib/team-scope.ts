import type { UserRole } from '@/types'

export function resolveTeamScope(user: { role: UserRole; entityId?: string } | null, requestedEntityId?: string) {
  if (!user || !['admin', 'coordinator'].includes(user.role)) return null
  const entityId = user.role === 'admin' ? requestedEntityId?.trim() : user.entityId
  if (!entityId || entityId.length > 128) return null
  return { entityId, mayCreateCoordinators: user.role === 'admin' }
}

export function canInviteTeamRole(scope: ReturnType<typeof resolveTeamScope>, role: string) {
  return Boolean(scope && (role === 'professional' || role === 'support' || (role === 'coordinator' && scope.mayCreateCoordinators)))
}
