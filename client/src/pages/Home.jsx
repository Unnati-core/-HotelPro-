import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, qs } from '../api'
import HotelCard from '../components/HotelCard'
import { addDays, todayStr } from '../utils'

export default function Home() {
  const [params, setParams] = useSearchParams()
  const get = (k, d = '') => params.get(k) || d

  // search form (applied on submit); filters apply immediately
  const [form, setForm] = useState({
    city: get('city'), checkIn: get('checkIn'), checkOut: get('checkOut'), guests: get('guests', '2'),
  })
  const stars = get('stars')
  const sort = get('sort', 'rating')

  const [hotels, setHotels] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { api.get('/hotels/cities').then((d) => setCities(d.cities)).catch(() => {}) }, [])

  useEffect(() => {
    setLoading(true)
    api
      .get(`/hotels${qs({ city: get('city'), checkIn: get('checkIn'), checkOut: get('checkOut'), guests: get('guests'), stars, sort, limit: 24 })}`)
      .then((d) => { setHotels(d.hotels); setError('') })
      .catch((e) => { setError(e.message); setHotels([]) })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next)
  }

  const submit = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    Object.entries(form).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  const onCheckIn = (v) => {
    const checkOut = form.checkOut && form.checkOut > v ? form.checkOut : v ? addDays(v, 1) : ''
    setForm({ ...form, checkIn: v, checkOut })
  }

  const dateSearch = get('checkIn') && get('checkOut') ? `?checkIn=${get('checkIn')}&checkOut=${get('checkOut')}&guests=${get('guests', '1')}` : ''

  return (
    <div className="page">
      <section className="hero">
        <h1>Find your perfect stay</h1>
        <p className="muted">Search hotels, compare rooms and book instantly with secure payment.</p>
        <form className="search-bar" onSubmit={submit}>
          <div>
            <label>Where</label>
            <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Check-in</label>
            <input type="date" min={todayStr()} value={form.checkIn} onChange={(e) => onCheckIn(e.target.value)} />
          </div>
          <div>
            <label>Check-out</label>
            <input type="date" min={form.checkIn ? addDays(form.checkIn, 1) : todayStr()} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
          </div>
          <div>
            <label>Guests</label>
            <input type="number" min="1" max="10" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} />
          </div>
          <button className="btn btn-lg">Search</button>
        </form>
      </section>

      <div className="toolbar">
        <h2 className="no-margin">{get('city') ? `Hotels in ${get('city')}` : 'Popular hotels'}</h2>
        <div className="filters">
          <select value={stars} onChange={(e) => setParam('stars', e.target.value)}>
            <option value="">Any rating</option>
            <option value="5">5 stars</option>
            <option value="4">4+ stars</option>
            <option value="3">3+ stars</option>
          </select>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
            <option value="rating">Guest rating</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="stars">Star class</option>
          </select>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="center-msg">Loading hotels…</div>
      ) : hotels.length === 0 ? (
        <div className="center-msg">No hotels match your search. Try different dates or filters.</div>
      ) : (
        <div className="grid">{hotels.map((h) => <HotelCard key={h._id} hotel={h} search={dateSearch} />)}</div>
      )}
    </div>
  )
}
