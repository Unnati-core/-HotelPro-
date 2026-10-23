import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Used for customer login (/login) and admin login (/admin/login)
export default function Login({ admin = false }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await login(form.email, form.password, admin)
      navigate(admin ? '/admin' : location.state?.from || '/', { replace: true })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>{admin ? 'Admin login' : 'Welcome back'}</h1>
        <p className="muted">{admin ? 'Sign in to manage HotelPro' : 'Log in to book your stay'}</p>
        {error && <div className="alert error">{error}</div>}
        <input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn btn-lg full" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
        {!admin && <p className="muted center">New here? <Link to="/register" state={location.state}>Create an account</Link></p>}
      </form>
    </div>
  )
}
