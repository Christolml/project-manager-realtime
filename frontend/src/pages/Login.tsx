import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await api.auth.login({ email, password })
      login(res.token, res.userId, res.username)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-amber-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-indigo-100/60 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-amber-100/40 blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative w-full max-w-sm mx-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-['Playfair_Display',serif] text-3xl font-semibold text-gray-900 tracking-tight">Project Manager</h1>
          <p className="text-sm text-gray-400 mt-1.5 font-['DM_Sans',sans-serif]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm p-7 rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-['DM_Sans',sans-serif]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-['DM_Sans',sans-serif] tracking-wide uppercase">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all font-['DM_Sans',sans-serif]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-['DM_Sans',sans-serif] tracking-wide uppercase">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all font-['DM_Sans',sans-serif]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]"
          >
            Sign In
          </button>

          <p className="text-sm text-center mt-5 text-gray-400 font-['DM_Sans',sans-serif]">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:text-indigo-700 transition">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
