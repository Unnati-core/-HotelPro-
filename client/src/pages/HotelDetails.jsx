import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Cover } from '../components/HotelCard'
import { addDays, fmtFullDate, nightsBetween, rupees, stars, todayStr } from '../utils'

export default function HotelDetails() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const checkIn = params.get('checkIn') || ''
  const checkOut = params.get('checkOut') || ''
  const guests = params.get('guests') || '1'
  const hasDates = checkIn && checkOut

  const [data, setData] = useState(null)
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ checkIn, checkOut, guests })
  const [review, setReview] = useState({ rating: 5, comment: '' })
  const [busyRoom, setBusyRoom] = useState(null)

  const load = useCallback(() => {
    const q = hasDates ? `?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}` : ''
    api.get(`/hotels/${id}${q}`).then((d) => { setData(d); setError('') }).catch((e) => setError(e.message))
    api.get(`/reviews/hotel/${id}`).then((d) => setReviews(d.reviews)).catch(() => {})
  }, [id, checkIn, checkOut, guests, hasDates])
  useEffect(() => { load() }, [load])

  const applyDates = (e) => {
    e.preventDefault()
    if (!form.checkIn || !form.checkOut) return toast('Choose check-in and check-out dates', 'error')
    setParams({ checkIn: form.checkIn, checkOut: form.checkOut, guests: form.guests || '1' })
  }

  const book = async (room) => {
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } })
    if (user.role === 'admin') return toast('Please use a customer account to book', 'error')
    if (!hasDates) return toast('Select your dates first', 'error')
    setBusyRoom(room._id)
    try {
      const d = await api.post('/bookings', { roomId: room._id, checkIn, checkOut, guests: Number(guests) })
      navigate(`/checkout/${d.booking._id}`)
    } catch (e) { toast(e.message, 'error'); load() } finally { setBusyRoom(null) }
  }

  const toggleWish = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } })
    try {
      if (data.isFavourite) await api.del(`/favourites/${id}`)
      else await api.post('/favourites', { hotel: id })
      setData({ ...data, isFavourite: !data.isFavourite })
    } catch (e) { toast(e.message, 'error') }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    try {
      await api.post('/reviews', { hotel: id, rating: Number(review.rating), comment: review.comment })
      toast('Thanks for your review!'); setReview({ rating: 5, comment: '' }); load()
    } catch (err) { toast(err.message, 'error') }
  }

  if (error) return <div className="page"><div className="alert error">{error}</div></div>
  if (!data) return <div className="center-msg">Loading…</div>
  const { hotel, rooms, nights } = data
  const alreadyReviewed = user && reviews.some((r) => r.user?._id === user._id)

  return (
    <div className="page">
      <div className="details">
        <Cover hotel={hotel} className="details-cover" />
        <div>
          <div className="between">
            <h1>{hotel.name}</h1>
            {user?.role !== 'admin' && (
              <button className="btn btn-ghost" onClick={toggleWish}>{data.isFavourite ? '♥ Saved' : '♡ Save'}</button>
            )}
          </div>
          <p className="muted">{hotel.address ? `${hotel.address}, ` : ''}{hotel.city} · <span className="gold">{stars(hotel.starRating)}</span>
            {hotel.averageRating > 0 && <> · ★ {hotel.averageRating} ({hotel.ratingCount} reviews)</>}</p>
          {hotel.description && <p>{hotel.description}</p>}
          <div className="chips">{hotel.amenities.map((a) => <span key={a} className="chip">{a}</span>)}</div>
          <p className="muted small">Check-in from {hotel.checkInTime} · Check-out by {hotel.checkOutTime}
            {hotel.contactPhone && <> · 📞 {hotel.contactPhone}</>}</p>
        </div>
      </div>

      <form className="card search-bar inline" onSubmit={applyDates}>
        <div>
          <label>Check-in</label>
          <input type="date" min={todayStr()} value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value, checkOut: form.checkOut > e.target.value ? form.checkOut : addDays(e.target.value, 1) })} />
        </div>
        <div>
          <label>Check-out</label>
          <input type="date" min={form.checkIn ? addDays(form.checkIn, 1) : todayStr()} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
        </div>
        <div>
          <label>Guests</label>
          <input type="number" min="1" max="10" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} />
        </div>
        <button className="btn">Check availability</button>
      </form>

      <h2>Rooms {hasDates && <small className="muted">· {fmtFullDate(checkIn)} → {fmtFullDate(checkOut)} ({nights} night{nights > 1 ? 's' : ''})</small>}</h2>
      {rooms.length === 0 && <p className="muted">No rooms listed yet.</p>}
      {rooms.map((r) => (
        <div key={r._id} className={`card room-row ${hasDates && !r.available ? 'dim-card' : ''}`}>
          <div className="grow">
            <h3>{r.type} · Room {r.roomNumber}</h3>
            <p className="muted">{r.beds} · up to {r.capacity} guests · floor {r.floor}</p>
            {r.description && <p className="small">{r.description}</p>}
            <div className="chips">{r.amenities.map((a) => <span key={a} className="chip">{a}</span>)}</div>
          </div>
          <div className="room-price">
            <b>{rupees(r.pricePerNight)}</b><small className="muted"> / night</small>
            {hasDates && nights && <p className="small muted">{rupees(r.pricePerNight * nights)} for {nights} night{nights > 1 ? 's' : ''} + tax</p>}
            {hasDates && !r.available ? (
              <span className="status cancelled">{r.unavailableReason}</span>
            ) : (
              <button className="btn" disabled={busyRoom === r._id || r.status !== 'available'} onClick={() => book(r)}>
                {r.status !== 'available' ? 'Unavailable' : busyRoom === r._id ? 'Holding…' : hasDates ? 'Book now' : 'Select dates'}
              </button>
            )}
          </div>
        </div>
      ))}

      <h2>Guest reviews</h2>
      {user?.role === 'user' && !alreadyReviewed && (
        <form className="card review-form" onSubmit={submitReview}>
          <h3>Stayed here? Write a review</h3>
          <select value={review.rating} onChange={(e) => setReview({ ...review, rating: e.target.value })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
          </select>
          <textarea rows="3" placeholder="Share your experience (optional)" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
          <button className="btn">Submit review</button>
          <small className="muted">Only guests who have completed a stay can post a review.</small>
        </form>
      )}
      {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {reviews.map((r) => (
        <div key={r._id} className="card review">
          <b>{r.user?.name || 'Guest'}</b> <span className="gold">{stars(r.rating)}</span>
          {r.comment && <p>{r.comment}</p>}
          <small className="muted">{fmtFullDate(r.createdAt)}</small>
        </div>
      ))}
    </div>
  )
}
