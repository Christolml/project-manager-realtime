import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projectCount, setProjectCount] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.projects.list()
      .then((data) => setProjectCount(data?.length ?? 0))
      .catch(() => setProjectCount(0))
      .finally(() => setLoaded(true))
  },[])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-full flex flex-col">
      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-100/60 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-amber-100/50 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-indigo-50/40 blur-2xl" />
        </div>

        <div className={`relative text-center max-w-2xl mx-auto transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Greeting */}
          <p className="text-sm font-medium tracking-[0.2em] uppercase text-indigo-500 mb-4">
            {greeting}
          </p>

          {/* Name */}
          <h1 className="font-['Playfair_Display',serif] text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 leading-[1.1] tracking-tight mb-5">
            {user?.username ?? 'there'}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-md mx-auto mb-10 font-['DM_Sans',sans-serif] font-light">
            You have{' '}
            <span className="font-semibold text-gray-700">
              {loaded ? (projectCount ?? 0) : '...'}
            </span>{' '}
            {projectCount === 1 ? 'project' : 'projects'} ready. Pick one up or start something new.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => {
                document.querySelector<HTMLButtonElement>('[data-new-project]')?.click()
              }}
              className="group relative inline-flex items-center gap-2.5 bg-indigo-600 text-white px-7 py-3.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:bg-indigo-700 transition-all duration-300 active:scale-[0.97]"
            >
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
            <button
              onClick={() => {
                const firstProject = document.querySelector('a[href^="/projects/"]') as HTMLAnchorElement
                if (firstProject) firstProject.click()
              }}
              className="inline-flex items-center gap-2 bg-white text-gray-700 px-7 py-3.5 rounded-xl text-sm font-medium border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 active:scale-[0.97]"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Browse Projects
            </button>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
      </div>

      {/* Quick tips row */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100 transition-all duration-700 delay-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        {[
          { icon: '⊞', title: 'Kanban Board', desc: 'Drag & drop tasks across columns intuitively.' },
          { icon: '☰', title: 'List View', desc: 'See all tasks in a sortable table layout.' },
          { icon: '📅', title: 'Calendar', desc: 'Track deadlines on a monthly grid view.' },
        ].map((item, i) => (
          <div
            key={item.title}
            className="bg-white px-6 py-5 transition-all duration-500"
            style={{ animationDelay: `${400 + i * 150}ms` }}
          >
            <span className="text-lg mb-2 block text-indigo-500">{item.icon}</span>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{item.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
