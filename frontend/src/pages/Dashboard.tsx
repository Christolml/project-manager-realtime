import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, extractError } from '../lib/api'
import { useToast } from '../hooks/useToast'
import type { Project } from '../types'

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { showToast } = useToast()

  async function loadProjects() {
    try {
      const data = await api.projects.list()
      setProjects(data || [])
    } catch (err) {
      showToast(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [])

  async function handleCreate() {
    if (!name.trim()) return
    try {
      await api.projects.create({ name, description })
      setName('')
      setDescription('')
      setShowModal(false)
      showToast('Project created successfully', 'success')
      loadProjects()
    } catch (err) {
      showToast(extractError(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return
    try {
      await api.projects.delete(id)
      showToast('Project deleted', 'success')
      loadProjects()
    } catch (err) {
      showToast(extractError(err))
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No projects yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow p-5 border border-gray-200">
              <div className="flex items-start justify-between">
                <Link to={`/projects/${p.id}`} className="text-lg font-semibold text-indigo-600 hover:underline">
                  {p.name}
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
              {p.description && <p className="text-gray-500 text-sm mt-1">{p.description}</p>}
              <p className="text-xs text-gray-400 mt-3">{p.taskCount ?? 0} tasks</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New Project</h2>
            <input
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
