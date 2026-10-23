import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../components/Toast'
import { BookingCard } from './Checkout'

export default function MyBookings() {
  const toast = useToast()
  const [bookings, setBookings] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.get('/bookings/my').then((d) => setBookings(d.bookings)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try { const d = await api.put(`/bookings/${id}/cancel`); toast(d.message); load() } catch (e) { toast(e.message, 'error') }
  }

  if (error) return <div className="page"><div className="alert error">{error}</div></div>
  if (!bookings) return <div className="center-msg">Loading…</div>

  return (
    <div className="page narrow">
      <h1>My Bookings</h1>
      {bookings.length === 0 && <p className="muted">No bookings yet. <Link to="/">Find a hotel</Link></p>}
      {bookings.map((b) => (
        <div key={b._id}>
          <BookingCard booking={b} />
          <div className="row-gap ticket-actions">
            {b.status === 'pending' && <Link className="btn" to={`/checkout/${b._id}`}>Pay now</Link>}
            {b.status === 'checked_out' && <Link className="btn btn-ghost" to={`/hotels/${b.hotel._id}`}>Write a review</Link>}
            {['pending', 'confirmed'].includes(b.status) && <button className="btn btn-ghost" onClick={() => cancel(b._id)}>Cancel booking</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
