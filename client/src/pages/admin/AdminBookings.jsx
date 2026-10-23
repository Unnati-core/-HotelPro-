import { useEffect, useState } from 'react'
import { api, qs } from '../../api'
import { useToast } from '../../components/Toast'
import { fmtDate, rupees } from '../../utils'

const STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired']

export default function AdminBookings() {
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')

  const load = () => api.get(`/admin/bookings${qs({ status, date, limit: 100 })}`).then((d) => setBookings(d.bookings)).catch((e) => toast(e.message, 'error'))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, date])

  const act = async (b, action, done) => {
    try { await api.put(`/bookings/${b._id}/${action}`); toast(done); load() } catch (e) { toast(e.message, 'error') }
  }
  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.bookingCode}? Paid amounts are refunded.`)) return
    act(b, 'cancel', 'Booking cancelled')
  }

  return (
    <>
      <h1>Bookings</h1>
      <div className="row-gap">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <label>Guests staying on</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {date && <button className="link-btn" onClick={() => setDate('')}>Clear</button>}
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Guest</th><th>Hotel / Room</th><th>Stay</th><th>Total</th><th>Status</th><th /></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td><span className="code">{b.bookingCode}</span></td>
                <td>{b.user?.name}<br /><small className="muted">{b.user?.phone || b.user?.email}</small></td>
                <td>{b.hotel?.name}<br /><small className="muted">{b.room?.type} · {b.room?.roomNumber}</small></td>
                <td>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}<br /><small className="muted">{b.nights} night(s) · {b.guests} guest(s)</small></td>
                <td>{rupees(b.totalAmount)}<br /><small className="muted">{b.payment?.status}</small></td>
                <td><span className={`status ${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                <td className="actions">
                  {b.status === 'confirmed' && <button className="link-btn" onClick={() => act(b, 'checkin', 'Guest checked in')}>Check in</button>}
                  {b.status === 'checked_in' && <button className="link-btn" onClick={() => act(b, 'checkout', 'Guest checked out')}>Check out</button>}
                  {['pending', 'confirmed'].includes(b.status) && <button className="link-btn danger" onClick={() => cancel(b)}>Cancel</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <p className="muted">No bookings found.</p>}
      </div>
    </>
  )
}
