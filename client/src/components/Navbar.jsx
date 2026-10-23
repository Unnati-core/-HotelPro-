import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <Link to="/" className="logo">Hotel<span>Pro</span></Link>

      <nav className="nav-links">
        {user?.role === 'admin' ? (
          <NavLink to="/admin">Admin Panel</NavLink>
        ) : (
          user && (
            <>
              <NavLink to="/wishlist">Wishlist</NavLink>
              <NavLink to="/bookings">My Bookings</NavLink>
            </>
          )
        )}
        {user ? (
          <>
            <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
            <button className="btn btn-ghost" onClick={async () => { await logout(); navigate('/') }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/register" className="btn">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  )
}
