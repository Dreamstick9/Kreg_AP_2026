import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

function formatTime(date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

function Status() {
  const [monitors, setMonitors] = useState([])
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let requestInFlight = false

    async function refreshStatus() {
      if (requestInFlight) return
      requestInFlight = true

      try {
        const result = await api('/status', { cache: 'no-store' })
        if (!Array.isArray(result.data)) {
          throw new Error('Unexpected status response')
        }
        if (active) {
          setMonitors(result.data)
          setUpdatedAt(new Date())
          setError('')
        }
      } catch {
        if (active) setError('Could not load public status. Retrying shortly.')
      } finally {
        requestInFlight = false
        if (active) setLoading(false)
      }
    }

    refreshStatus()
    const intervalId = window.setInterval(refreshStatus, 15000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <main className="box dashboard status-page">
      <header className="dashboard-header">
        <div>
          <h1>Service status</h1>
          <p>Current health and recent performance of our public monitors.</p>
        </div>
        <Link to="/login">Log in</Link>
      </header>

      <section aria-labelledby="public-monitors-heading">
        <h2 id="public-monitors-heading">Public monitors</h2>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="monitor-table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Name</th>
                <th scope="col">Uptime (24h)</th>
                <th scope="col">Average response (24h)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4">Loading public monitors…</td></tr>
              ) : monitors.length === 0 ? (
                <tr><td colSpan="4">No public monitors available.</td></tr>
              ) : (
                monitors.map((monitor) => {
                  const status = ['UP', 'DOWN'].includes(monitor.status)
                    ? monitor.status
                    : 'UNKNOWN'

                  return (
                    <tr key={monitor.id} className="monitor-row">
                      <td>
                        <span
                          className={`status-dot ${status.toLowerCase()}`}
                          role="img"
                          aria-label={status}
                          title={status}
                        />
                      </td>
                      <td>{monitor.name}</td>
                      <td>{monitor.uptime24h == null ? '–' : `${monitor.uptime24h}%`}</td>
                      <td>{monitor.avgMs24h == null ? '–' : `${monitor.avgMs24h} ms`}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="status-page-footer" aria-live="polite">
        Last updated {updatedAt ? formatTime(updatedAt) : '–'}
      </footer>
    </main>
  )
}

export default Status
