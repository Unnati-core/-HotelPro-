import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // { _id, name, email, role: 'user' | 'admin' }
  const [loading, setLoading] = useState(true)

  // On page load, ask the backend who is logged in (reads the httpOnly cookie)
  useEffect(() => {
    api
      .get('/auth/me')
      .then((d) => setUser({ ...d.user, role: d.role }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password, asAdmin = false) => {
    const d = await api.post(asAdmin ? '/admin/login' : '/auth/login', { email, password })
    setUser(d.user)
    return d.user
  }, [])

  const register = useCallback(async (form) => {
    const d = await api.post('/auth/register', form)
    setUser(d.user)
    return d.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}
