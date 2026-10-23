import { useEffect, useState } from 'react'
import { api, qs } from '../../api'
import { useToast } from '../../components/Toast'
import { ROOM_TYPES, csvToList, listToCsv, rupees } from '../../utils'

const EMPTY = { roomNumber: '', type: 'Standard', floor: 1, pricePerNight: '', capacity: 2, beds: '1 Queen', amenities: 'AC, TV, WiFi', description: '', status: 'available' }

export default function AdminRooms() {
  const toast = useToast()
  const [hotels, setHotels] = useState([])
  const [hotelId, setHotelId] = useState('')
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    api.get('/hotels/admin/all').then((d) => { setHotels(d.hotels); if (d.hotels[0]) setHotelId(d.hotels[0]._id) }).catch((e) => toast(e.message, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = () => hotelId && api.get(`/rooms${qs({ hotel: hotelId, all: 1 })}`).then((d) => setRooms(d.rooms)).catch((e) => toast(e.message, 'error'))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hotelId])

  const reset = () => { setForm(EMPTY); setEditing(null) }

  const submit = async (e) => {
    e.preventDefault()
    const body = { ...form, hotel: hotelId, floor: Number(form.floor), pricePerNight: Number(form.pricePerNight), capacity: Number(form.capacity), amenities: csvToList(form.amenities) }
    try {
      if (editing) await api.put(`/rooms/${editing}`, body)
      else await api.post('/rooms', body)
      toast(editing ? 'Room updated' : 'Room added')
      reset(); load()
    } catch (err) { toast(err.message, 'error') }
  }

  const edit = (r) => {
    setEditing(r._id)
    setForm({ ...EMPTY, ...r, amenities: listToCsv(r.amenities) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const setStatus = async (r, status) => {
    try { await api.put(`/rooms/${r._id}`, { status }); load() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async (r) => {
    if (!window.confirm(`Delete room ${r.roomNumber}?`)) return
    try { await api.del(`/rooms/${r._id}`); toast('Room deleted'); load() } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      <h1>Rooms</h1>
      <div className="row-gap">
        <label>Hotel</label>
        <select value={hotelId} onChange={(e) => { setHotelId(e.target.value); reset() }}>
          {hotels.map((h) => <option key={h._id} value={h._id}>{h.name} – {h.city}</option>)}
        </select>
      </div>
      {hotels.length === 0 && <p className="muted">Add a hotel first.</p>}

      {hotelId && (
        <form className="card form-grid" onSubmit={submit}>
          <h3 className="span2">{editing ? 'Edit room' : 'Add a room'}</h3>
          <input placeholder="Room number *" required value={form.roomNumber} onChange={set('roomNumber')} />
          <select value={form.type} onChange={set('type')}>{ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <div className="price-field"><span>₹</span><input type="number" min="0" placeholder="Price per night *" required value={form.pricePerNight} onChange={set('pricePerNight')} /></div>
          <input type="number" min="1" max="10" placeholder="Max guests" value={form.capacity} onChange={set('capacity')} />
          <input type="number" placeholder="Floor" value={form.floor} onChange={set('floor')} />
          <input placeholder="Beds (e.g. 1 King)" value={form.beds} onChange={set('beds')} />
          <input className="span2" placeholder="Amenities, comma separated" value={form.amenities} onChange={set('amenities')} />
          <input className="span2" placeholder="Description" value={form.description || ''} onChange={set('description')} />
          <select value={form.status} onChange={set('status')}>
            <option value="available">Available</option>
            <option value="maintenance">Under maintenance</option>
          </select>
          <div className="row-gap">
            <button className="btn">{editing ? 'Save changes' : 'Add room'}</button>
            {editing && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      )}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Room</th><th>Type</th><th>Beds</th><th>Guests</th><th>Price / night</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r._id}>
                <td><b>{r.roomNumber}</b><br /><small className="muted">Floor {r.floor}</small></td>
                <td>{r.type}</td><td>{r.beds}</td><td>{r.capacity}</td><td>{rupees(r.pricePerNight)}</td>
                <td><span className={`status ${r.status === 'available' ? 'confirmed' : 'pending'}`}>{r.status}</span></td>
                <td className="actions">
                  <button className="link-btn" onClick={() => edit(r)}>Edit</button>
                  <button className="link-btn" onClick={() => setStatus(r, r.status === 'available' ? 'maintenance' : 'available')}>
                    {r.status === 'available' ? 'Maintenance' : 'Make available'}
                  </button>
                  <button className="link-btn danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rooms.length === 0 && <p className="muted">No rooms for this hotel yet.</p>}
      </div>
    </>
  )
}
