import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { UserRole } from '@/lib/database.types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingSpinner fullPage text="Loading..." />
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to correct dashboard
    const dashboardMap: Record<UserRole, string> = {
      owner: '/owner',
      client: '/client',
      technician: '/technician',
    }
    return <Navigate to={dashboardMap[role] ?? '/login'} replace />
  }

  return <>{children}</>
}
