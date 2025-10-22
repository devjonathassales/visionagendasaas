import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/authContext'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="container py-8">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
