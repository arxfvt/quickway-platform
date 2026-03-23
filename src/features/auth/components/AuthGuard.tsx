import { type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import type { UserRole } from '../../../types/user.types'

interface AuthGuardProps {
  allowedRoles: UserRole[]
  children?: ReactNode
}

/**
 * Wraps protected routes.
 * - Redirects to /login if no authenticated user.
 * - Redirects to / if the user's role is not in allowedRoles.
 * - Renders children (the layout + Outlet) when access is granted.
 */
export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <span>Loading…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
