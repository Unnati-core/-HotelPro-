import { Link } from 'react-router-dom'
import { rupees, stars } from '../utils'

export function Cover({ hotel, className = '' }) {
  return hotel.images?.[0] ? (
    <img className={`cover ${className}`} src={hotel.images[0]} alt={hotel.name} loading="lazy" />
  ) : (
    <div className={`cover cover-fallback ${className}`}><span>{hotel.name?.[0]}</span></div>
  )
}

// `search` = "?checkIn=..&checkOut=..&guests=.." so the details page keeps the chosen dates
export default function HotelCard({ hotel, search = '' }) {
  return (
    <Link to={`/hotels/${hotel._id}${search}`} className="hotel-card">
      <div className="cover-wrap">
        <Cover hotel={hotel} />
        {hotel.averageRating > 0 && <span className="rating-pill">★ {hotel.averageRating} ({hotel.ratingCount})</span>}
      </div>
      <div className="hotel-card-body">
        <h3>{hotel.name}</h3>
        <p className="muted">{hotel.city} · <span className="gold">{stars(hotel.starRating)}</span></p>
        <p className="muted small">{hotel.amenities.slice(0, 3).join(' • ')}</p>
        <div className="between">
          {hotel.startingPrice != null ? (
            <span>From <b>{rupees(hotel.startingPrice)}</b> <small className="muted">/ night</small></span>
          ) : (
            <span className="muted">No rooms listed</span>
          )}
          {hotel.roomsAvailable > 0 && <small className="green">{hotel.roomsAvailable} room(s) free</small>}
        </div>
      </div>
    </Link>
  )
}
