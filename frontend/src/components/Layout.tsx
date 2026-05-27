import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from './Sidebar'

export default function Layout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const showSidebar = location.pathname !== '/login' && location.pathname !== '/register'
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-[#f8f7f4]">
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200/70 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <Link to="/" className="font-['Playfair_Display',serif] text-lg sm:text-xl font-semibold text-indigo-600 tracking-tight">
          Project Manager
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:inline font-['DM_Sans',sans-serif]">{user.username}</span>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors font-['DM_Sans',sans-serif]"
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      <div className="flex flex-1 overflow-hidden relative">
        {showSidebar && (
          <>
            {isMobile && sidebarOpen && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10" onClick={() => setSidebarOpen(false)} />
            )}
            <div className={`${
              isMobile
                ? `fixed inset-y-0 left-0 z-20 pt-14 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
                : sidebarOpen ? 'block' : 'hidden'
            }`}>
              <Sidebar
                collapsed={!sidebarOpen && !isMobile}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
              />
            </div>
            {!sidebarOpen && !isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute left-3 top-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition z-10"
                title="Open sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
          </>
        )}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
