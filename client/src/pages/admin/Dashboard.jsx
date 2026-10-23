import { useEffect, useState } from 'react'
import { api } from '../../api'
import { rupees } from '../../utils'

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/admin/dashboard').then(setD).catch((e) => setError(e.message)) }, [])

  if (error) return <div className="alert error">{error}</div>
  if (!d) return <div className="center-msg">Loading…</div>
  const { stats, topHotels, last7Days } = d
  const max = Math.max(1, ...last7Days.map((x) => x.revenue))
  const cards = [
    ['Revenue', rupees(stats.totalRevenue)], ['Occupancy tonight', `${stats.occupancyRate}%`], ['Arrivals today', stats.arrivalsToday],
    ['Departures today', stats.departuresToday], ['Nights booked', stats.nightsBooked], ['Guests', stats.users],
    ['Hotels', stats.hotels], ['Rooms in service', stats.rooms],
  ]

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        {cards.map(([k, v]) => <div key={k} className="card stat"><span className="muted">{k}</span><b>{v}</b></div>)}
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Revenue – last 7 days</h3>
          {last7Days.length === 0 ? <p className="muted">No paid bookings yet.</p> : (
            <div className="bars">
              {last7Days.map((x) => (
                <div key={x.date} className="bar-col" title={`${x.bookings} bookings`}>
                  <div className="bar" style={{ height: `${(x.revenue / max) * 100}%` }} />
                  <small>{x.date.slice(5)}</small>
                  <small className="muted">{rupees(x.revenue)}</small>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Top hotels</h3>
          {topHotels.length === 0 ? <p className="muted">No data yet.</p> : (
            <table><thead><tr><th>Hotel</th><th>Nights</th><th>Revenue</th></tr></thead>
              <tbody>{topHotels.map((h) => <tr key={h.hotelId}><td>{h.name}<br /><small className="muted">{h.city}</small></td><td>{h.nights}</td><td>{rupees(h.revenue)}</td></tr>)}</tbody>
            </table>
          )}
          <h3>Bookings by status</h3>
          <div className="chips">
            {Object.entries(stats.bookingsByStatus).map(([k, v]) => <span key={k} className={`status ${k}`}>{k.replace('_', ' ')}: {v}</span>)}
          </div>
        </div>
      </div>
    </>
  )
}
