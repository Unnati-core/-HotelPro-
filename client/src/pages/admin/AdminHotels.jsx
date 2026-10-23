import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toast'
import { AMENITIES, csvToList, listToCsv, stars } from '../../utils'

const EMPTY = { name: '', city: '', address: '', description: '', starRating: 3, amenities: '', images: '', contactPhone: '', contactEmail: '', checkInTime: '14:00', checkOutTime: '11:00' }

export default function AdminHotels() {
  const toast = useToast()
  const [hotels, setHotels] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const load = () => api.get('/hotels/admin/all').then((d) => setHotels(d.hotels)).catch((e) => toast(e.message, 'error'))
  useEffect(() => { load() }, [])

  const reset = () => { setForm(EMPTY); setEditing(null) }

  const submit = async (e) => {
    e.preventDefault()
    const body = { ...form, starRating: Number(form.starRating), amenities: csvToList(form.amenities), images: csvToList(form.images) }
    try {
      if (editing) await api.put(`/hotels/${editing}`, body)
      else await api.post('/hotels', body)
      toast(editing ? 'Hotel updated' : 'Hotel added')
      reset(); load()
    } catch (err) { toast(err.message, 'error') }
  }

  const edit = (h) => {
    setEditing(h._id)
    setForm({ ...EMPTY, ...h, amenities: listToCsv(h.amenities), images: listToCsv(h.images) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggle = async (h) => {
    try { await api.put(`/hotels/${h._id}`, { isActive: !h.isActive }); load() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async (h) => {
    if (!window.confirm(`Delete ${h.name} and all its rooms?`)) return
    try { await api.del(`/hotels/${h._id}`); toast('Hotel deleted'); load() } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      <h1>Hotels</h1>
      <form className="card form-grid" onSubmit={submit}>
        <h3 className="span2">{editing ? 'Edit hotel' : 'Add a hotel'}</h3>
        <input placeholder="Hotel name *" required value={form.name} onChange={set('name')} />
        <input placeholder="City *" required value={form.city} onChange={set('city')} />
        <input className="span2" placeholder="Address" value={form.address || ''} onChange={set('address')} />
        <textarea className="span2" rows="3" placeholder="Description" value={form.description || ''} onChange={set('description')} />
        <select value={form.starRating} onChange={set('starRating')}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star</option>)}
        </select>
        <input placeholder="Phone" value={form.contactPhone || ''} onChange={set('contactPhone')} />
        <input placeholder="Contact email" value={form.contactEmail || ''} onChange={set('contactEmail')} />
        <div className="row-gap">
          <label>Check-in</label><input type="time" value={form.checkInTime} onChange={set('checkInTime')} />
          <label>Check-out</label><input type="time" value={form.checkOutTime} onChange={set('checkOutTime')} />
        </div>
        <input className="span2" placeholder={`Amenities, comma separated (e.g. ${AMENITIES.slice(0, 4).join(', ')})`} value={form.amenities} onChange={set('amenities')} />
        <input className="span2" placeholder="Image URLs, comma separated (optional)" value={form.images} onChange={set('images')} />
        <div className="span2 row-gap">
          <button className="btn">{editing ? 'Save changes' : 'Add hotel'}</button>
          {editing && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Hotel</th><th>City</th><th>Class</th><th>Rooms</th><th>Rating</th><th>Status</th><th /></tr></thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h._id}>
                <td>{h.name}</td><td>{h.city}</td><td className="gold">{stars(h.starRating)}</td><td>{h.roomCount}</td>
                <td>{h.averageRating ? `★ ${h.averageRating} (${h.ratingCount})` : '–'}</td>
                <td><span className={`status ${h.isActive ? 'confirmed' : 'cancelled'}`}>{h.isActive ? 'active' : 'hidden'}</span></td>
                <td className="actions">
                  <button className="link-btn" onClick={() => edit(h)}>Edit</button>
                  <button className="link-btn" onClick={() => toggle(h)}>{h.isActive ? 'Hide' : 'Show'}</button>
                  <button className="link-btn danger" onClick={() => remove(h)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hotels.length === 0 && <p className="muted">No hotels yet.</p>}
      </div>
    </>
  )
}
