// Thin fetch wrapper around the backend. "/api" is proxied to http://localhost:5000 (see vite.config.js).
// credentials: 'include' sends the httpOnly login cookie with every request.
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: body || {} }),
  put: (p, body) => request(p, { method: 'PUT', body: body || {} }),
  del: (p) => request(p, { method: 'DELETE' }),
}

// build "?a=1&b=2" skipping empty values
export const qs = (obj) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => v !== '' && v != null && p.append(k, v))
  const s = p.toString()
  return s ? `?${s}` : ''
}
