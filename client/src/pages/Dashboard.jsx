import { Navigate, useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()

  if (!localStorage.token) {
    return <Navigate to="/login" />
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="box">
      <h1>Dashboard</h1>
      <button onClick={logout}>Log out</button>
    </div>
  )
}

export default Dashboard
