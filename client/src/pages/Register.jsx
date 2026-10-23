import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await register(form)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Create account</h1>
        <p className="muted">Join HotelPro and book your stay in seconds</p>
        {error && <div className="alert error">{error}</div>}
        <input placeholder="Full name" required value={form.name} onChange={set('name')} />
        <input type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
        <input placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} />
        <input type="password" placeholder="Password (min 6 characters)" minLength={6} required value={form.password} onChange={set('password')} />
        <button className="btn btn-lg full" disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
        <p className="muted center">Already have an account? <Link to="/login" state={location.state}>Login</Link></p>
      </form>
    </div>
  )
}
