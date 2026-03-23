import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/user.types'

// Returns true if the current user has one of the given roles.
export function usePermissions(allowedRoles: UserRole[]): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  return allowedRoles.includes(user.role)
}
