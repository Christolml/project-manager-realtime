import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { api, extractError } from '../lib/api'
import { wsClient } from '../lib/ws'
import { useToast } from '../hooks/useToast'
import type { Project } from '../types'

interface Props {
  onRefresh?: () => void
  collapsed?: boolean
  onToggle?: () => void
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const location = useLocation()
  const currentId = location.pathname.startsWith('/projects/') ? location.pathname.split('/')[2] : null
  const { showToast } = useToast()

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.projects.list()
      setProjects(data || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProjects() }, [location.pathname, loadProjects])

  useEffect(() => {
    const unsub = wsClient.on('projectInvited', () => { loadProjects() })
    return () => { unsub() }
  }, [loadProjects])

  async function handleCreate() {
    if (!name.trim()) return
    try {
      await api.projects.create({ name, description })
      setName('')
      setDescription('')
      setShowModal(false)
      showToast('Project created', 'success')
      loadProjects()
    } catch (err) {
      showToast(extractError(err))
    }
  }

  const sidebar = collapsed ? (
    <aside className="w-14 bg-white/90 backdrop-blur-sm border-r border-gray-200/70 flex flex-col items-center py-3 gap-3">
      <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 text-lg" title="Open sidebar">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <button
        onClick={() => setShowModal(true)}
        className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
        title="New project"
        data-new-project
      >
        +
      </button>
      <div className="w-8 border-t border-gray-100" />
      <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto w-full px-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition ${
              currentId === p.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
            title={p.name}
          >
            {p.name.charAt(0).toUpperCase()}
          </Link>
        ))}
      </div>
    </aside>
  ) : (
    <aside className="w-64 bg-white/90 backdrop-blur-sm border-r border-gray-200/70 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 shrink-0" title="Collapse sidebar">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]"
          data-new-project
        >
          New Project
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-[10px] font-medium text-gray-300 uppercase tracking-widest mb-2 px-2 font-['DM_Sans',sans-serif]">Projects</p>
        {loading ? (
          <div className="text-xs text-gray-300 text-center py-6 font-['DM_Sans',sans-serif]">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-xs text-gray-300 text-center py-6 font-['DM_Sans',sans-serif]">No projects yet</div>
        ) : (
          <div className="space-y-0.5">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition ${
                  currentId === p.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${currentId === p.id ? 'bg-indigo-500' : 'bg-indigo-200'}`} />
                <span className="truncate flex-1 font-['DM_Sans',sans-serif]">{p.name}</span>
                <span className="text-[11px] text-gray-300">{p.taskCount ?? ''}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <>
      {sidebar}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['Playfair_Display',serif] text-lg font-semibold mb-5">New Project</h2>
            <input
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 mb-4 font-['DM_Sans',sans-serif]"
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 mb-6 font-['DM_Sans',sans-serif]"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 font-['DM_Sans',sans-serif]">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]">Create</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
