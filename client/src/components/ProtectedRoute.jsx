import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// role="user" -> customers only, role="admin" -> admins only
export default function ProtectedRoute({ role = 'user', children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center-msg">Loading…</div>
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} state={{ from: location.pathname }} replace />
  if (user.role !== role) return <Navigate to="/" replace />
  return children
}
