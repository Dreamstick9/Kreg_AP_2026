import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MonitorDetail from './pages/MonitorDetail'
import Status from './pages/Status'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/status" element={<Status />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/monitors/:id" element={<MonitorDetail />} />
    </Routes>
  )
}

export default App
