import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../components/Toast'
import HotelCard from '../components/HotelCard'

export default function Wishlist() {
  const toast = useToast()
  const [hotels, setHotels] = useState(null)

  const load = () => api.get('/favourites').then((d) => setHotels(d.hotels)).catch((e) => toast(e.message, 'error'))
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    try { await api.del(`/favourites/${id}`); load() } catch (e) { toast(e.message, 'error') }
  }

  if (!hotels) return <div className="center-msg">Loading…</div>
  return (
    <div className="page">
      <h1>My Wishlist</h1>
      {hotels.length === 0 && <p className="muted">Nothing saved yet. <Link to="/">Browse hotels</Link></p>}
      <div className="grid">
        {hotels.map((h) => (
          <div key={h._id}>
            <HotelCard hotel={{ ...h, amenities: h.amenities || [] }} />
            <button className="link-btn danger" onClick={() => remove(h._id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
