const API = 'http://localhost:3000/api/v1'

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (localStorage.token) {
    headers.Authorization = 'Bearer ' + localStorage.token
  }

  const res = await fetch(API + path, {
    ...options,
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (res.status === 204) return null
  const body = await res.json()
  if (!res.ok) {
    const error = new Error(body.error)
    error.status = res.status
    throw error
  }
  return body
}
