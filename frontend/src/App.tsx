import { useState, useCallback, useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'
import type { User } from './types'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const login = useCallback((newToken: string, userId: string, username: string) => {
    const u: User = { id: userId, username, email: '' }
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(u))
    setToken(newToken)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const authValue = useMemo(
    () => ({ user, token, login, logout, isAuthenticated: !!token }),
    [user, token, login, logout]
  )

  return (
    <AuthContext.Provider value={authValue}>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
          <Route element={<Layout />}>
            <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/projects/:id" element={token ? <ProjectDetail /> : <Navigate to="/login" />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthContext.Provider>
  )
}
