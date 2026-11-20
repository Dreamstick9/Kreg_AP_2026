import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'

function Dashboard() {
  const navigate = useNavigate()
  const [monitors, setMonitors] = useState([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [intervalSec, setIntervalSec] = useState('60')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadMonitors = useCallback(async () => {
    if (!localStorage.token) return

    try {
      const result = await api('/monitors?limit=50')
      const monitorsWithStats = await Promise.all(
        result.data.map(async (monitor) => {
          const stats = await api(`/monitors/${monitor.id}/stats`)
          return { ...monitor, uptime24h: stats.data.uptime24h }
        }),
      )
      setMonitors(monitorsWithStats)
      setLoadError('')
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem('token')
        navigate('/login')
        return
      }
      setLoadError(error.message || 'Could not load monitors')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!localStorage.token) return undefined

    const firstLoad = setTimeout(loadMonitors, 0)
    const intervalId = setInterval(loadMonitors, 15000)
    return () => {
      clearTimeout(firstLoad)
      clearInterval(intervalId)
    }
  }, [loadMonitors])

  if (!localStorage.token) {
    return <Navigate to="/login" />
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  function openMonitor(monitorId) {
    navigate(`/monitors/${monitorId}`)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSaving(true)

    try {
      await api('/monitors', {
        method: 'POST',
        body: { name, url, intervalSec: Number(intervalSec) },
      })
      setName('')
      setUrl('')
      setIntervalSec('60')
      await loadMonitors()
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem('token')
        navigate('/login')
        return
      }
      setFormError(error.message || 'Could not add monitor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="box dashboard">
      <header className="dashboard-header">
        <div>
          <h1>My monitors</h1>
          <p>Check the status and uptime of your monitors.</p>
        </div>
        <button type="button" onClick={logout}>Log out</button>
      </header>

      <section aria-labelledby="monitors-heading">
        <h2 id="monitors-heading">Monitors</h2>
        {loadError && <p className="error" role="alert">{loadError}</p>}
        <div className="monitor-table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Name</th>
                <th scope="col">URL</th>
                <th scope="col">Uptime (24h)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4">Loading monitors…</td></tr>
              ) : monitors.length === 0 ? (
                <tr><td colSpan="4">No monitors yet. Add one below.</td></tr>
              ) : (
                monitors.map((monitor) => {
                  const status = ['UP', 'DOWN'].includes(monitor.status)
                    ? monitor.status
                    : 'UNKNOWN'

                  return (
                    <tr
                      key={monitor.id}
                      className="monitor-row"
                      role="link"
                      tabIndex="0"
                      aria-label={`Open ${monitor.name}`}
                      onClick={() => openMonitor(monitor.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') openMonitor(monitor.id)
                      }}
                    >
                      <td><span className={`status-pill ${status.toLowerCase()}`}>{status}</span></td>
                      <td>{monitor.name}</td>
                      <td className="monitor-url">{monitor.url}</td>
                      <td>{monitor.uptime24h == null ? '–' : `${monitor.uptime24h}%`}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="add-monitor-heading">
        <h2 id="add-monitor-heading">Add a monitor</h2>
        <form className="monitor-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            URL
            <input
              type="text"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
            />
          </label>
          <label>
            Interval (seconds)
            <input
              type="number"
              min="10"
              step="1"
              value={intervalSec}
              onChange={(event) => setIntervalSec(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add monitor'}
          </button>
        </form>
        {formError && <p className="error" role="alert">{formError}</p>}
      </section>
    </main>
  )
}

export default Dashboard
