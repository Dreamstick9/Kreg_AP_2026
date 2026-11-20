import { useState, useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../api'
import './MonitorDetail.css'

function showDuration(start, end) {
  let endTime = new Date()
  if (end) {
    endTime = new Date(end)
  }
  let sec = Math.floor((endTime - new Date(start)) / 1000)
  if (sec < 0) sec = 0
  if (sec < 60) {
    return sec + ' s'
  }
  let min = Math.floor(sec / 60)
  if (min < 60) {
    return min + ' min'
  }
  const hours = Math.floor(min / 60)
  min = min % 60
  if (min === 0) {
    return hours + ' h'
  }
  return hours + ' h ' + min + ' min'
}

function MonitorDetail() {
  const { id } = useParams()
  const [monitor, setMonitor] = useState(null)
  const [stats, setStats] = useState(null)
  const [results, setResults] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loadedId, setLoadedId] = useState(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!localStorage.token) return
    let cancelled = false

    async function loadData() {
      try {
        const m = await api('/monitors/' + id)
        const s = await api('/monitors/' + id + '/stats')
        const r = await api('/monitors/' + id + '/results?limit=50')
        const i = await api('/monitors/' + id + '/incidents')
        if (cancelled) return
        setMonitor(m.data)
        setStats(s.data)
        setResults(r.data)
        setIncidents(i.data)
        setError('')
      } catch (err) {
        if (cancelled) return
        setMonitor(null)
        setError(err.message)
      }
      setLoadedId(id)
      setChecking(false)
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [id, reload])

  async function checkNow() {
    setChecking(true)
    setError('')
    try {
      await api('/monitors/' + id + '/check', { method: 'POST' })
      setReload(reload + 1)
    } catch (err) {
      setError(err.message)
      setChecking(false)
    }
  }

  if (!localStorage.token) {
    return <Navigate to="/login" />
  }

  if (loadedId !== id) {
    return (
      <div className="box detail">
        <p>Loading...</p>
      </div>
    )
  }

  if (error === 'Monitor not found') {
    return (
      <div className="box detail">
        <Link to="/dashboard">Back to monitors</Link>
        <p>Monitor not found</p>
      </div>
    )
  }

  if (!monitor) {
    return (
      <div className="box detail">
        <Link to="/dashboard">Back to monitors</Link>
        <p className="error">{error}</p>
      </div>
    )
  }

  let pill = 'unknown'
  let pillText = 'UNKNOWN'
  if (monitor.status === 'UP') {
    pill = 'up'
    pillText = 'UP'
  }
  if (monitor.status === 'DOWN') {
    pill = 'down'
    pillText = 'DOWN'
  }

  return (
    <div className="box detail">
      <Link to="/dashboard">Back to monitors</Link>

      <div className="detail-top">
        <h1>{monitor.name}</h1>
        <span className={'pill ' + pill}>{pillText}</span>
      </div>
      <p className="detail-url">{monitor.url}</p>

      <div className="detail-numbers">
        <div className="detail-number">
          <span>Uptime (24h)</span>
          <b>{stats.uptime24h == null ? '–' : stats.uptime24h + '%'}</b>
        </div>
        <div className="detail-number">
          <span>Average response</span>
          <b>{stats.avgMs24h == null ? '–' : stats.avgMs24h + ' ms'}</b>
        </div>
      </div>

      <button onClick={checkNow} disabled={checking}>
        {checking ? 'Checking...' : 'Check now'}
      </button>
      {error && <p className="error">{error}</p>}

      <h2>Recent checks</h2>
      {results.length === 0 ? (
        <p>No checks yet.</p>
      ) : (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Result</th>
                <th>Status code</th>
                <th>Response time</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.checkedAt).toLocaleString()}</td>
                  <td>{r.isUp ? 'Up' : 'Down'}</td>
                  <td>{r.statusCode == null ? '–' : r.statusCode}</td>
                  <td>{r.responseTimeMs == null ? '–' : r.responseTimeMs + ' ms'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Incidents</h2>
      {incidents.length === 0 ? (
        <p>No incidents.</p>
      ) : (
        <ul className="detail-incidents">
          {incidents.map(inc => (
            <li key={inc.id}>
              <b>{inc.reason}</b>
              <div>Started: {new Date(inc.startedAt).toLocaleString()}</div>
              <div>Resolved: {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : 'ongoing'}</div>
              <div>Duration: {showDuration(inc.startedAt, inc.resolvedAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MonitorDetail
