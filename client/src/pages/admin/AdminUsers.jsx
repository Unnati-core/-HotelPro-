import { useEffect, useState } from 'react'
import { api, qs } from '../../api'
import { useToast } from '../../components/Toast'
import { fmtFullDate } from '../../utils'

export default function AdminUsers() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')

  const load = () => api.get(`/admin/users${qs({ search })}`).then((d) => setUsers(d.users)).catch((e) => toast(e.message, 'error'))
  useEffect(() => { load() }, [])

  const toggle = async (u) => {
    try { await api.put(`/admin/users/${u._id}`, { isActive: !u.isActive }); load() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}?`)) return
    try { await api.del(`/admin/users/${u._id}`); toast('User deleted'); load() } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      <h1>Guests</h1>
      <form className="row-gap" onSubmit={(e) => { e.preventDefault(); load() }}>
        <input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn">Search</button>
      </form>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.phone || '–'}</td><td>{fmtFullDate(u.createdAt)}</td>
                <td><span className={`status ${u.isActive ? 'confirmed' : 'cancelled'}`}>{u.isActive ? 'active' : 'disabled'}</span></td>
                <td className="actions">
                  <button className="link-btn" onClick={() => toggle(u)}>{u.isActive ? 'Disable' : 'Enable'}</button>
                  <button className="link-btn danger" onClick={() => remove(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="muted">No guests found.</p>}
      </div>
    </>
  )
}
