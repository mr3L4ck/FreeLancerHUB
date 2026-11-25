import { Navigate, Outlet } from 'react-router-dom'

interface PublicRouteProps {
  isAuthenticated: boolean
}

export function PublicRoute({ isAuthenticated }: PublicRouteProps) {
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}