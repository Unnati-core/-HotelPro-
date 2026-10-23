import { NavLink, Outlet } from 'react-router-dom'

const LINKS = [
  ['/admin', 'Dashboard', true],
  ['/admin/hotels', 'Hotels'],
  ['/admin/rooms', 'Rooms'],
  ['/admin/bookings', 'Bookings'],
  ['/admin/users', 'Guests'],
]

export default function AdminLayout() {
  return (
    <div className="admin">
      <aside className="admin-side">
        <h3>Admin</h3>
        {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  )
}
