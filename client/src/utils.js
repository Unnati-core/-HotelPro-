export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
export const fmtFullDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
export const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0))

export const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family', 'Presidential']
export const AMENITIES = ['WiFi', 'Pool', 'Spa', 'Parking', 'Restaurant', 'Gym', 'Conference Hall', 'Airport Shuttle']

// <input type="date"> works with "YYYY-MM-DD" (UTC based, matching the backend)
const iso = (d) => d.toISOString().slice(0, 10)
export const todayStr = () => iso(new Date())
export const addDays = (str, n) => iso(new Date(new Date(`${str}T00:00:00Z`).getTime() + n * 86400000))
export const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)

// "WiFi, Pool, Spa" <-> ['WiFi','Pool','Spa']
export const csvToList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean)
export const listToCsv = (list = []) => list.join(', ')
