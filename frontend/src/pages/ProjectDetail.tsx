import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, extractError } from '../lib/api'
import { wsClient } from '../lib/ws'
import { useWebSocket } from '../hooks/useWebSocket'
import { useToast } from '../hooks/useToast'
import type { ProjectDetail as ProjectDetailType, Task } from '../types'
import type { WSMessage } from '../types'
import StatusColumn from '../components/StatusColumn'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<ProjectDetailType | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [taskModal, setTaskModal] = useState<{ open: boolean; statusId?: string; editTask?: Task }>({ open: false })
  const [statusModal, setStatusModal] = useState(false)
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('#6366F1')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const idRef = useRef(id)
  idRef.current = id
  const { showToast } = useToast()

  const ws = useWebSocket()

  const handleWSMessage = useCallback(async () => {
    const pid = idRef.current
    if (pid) {
      try {
        const t = await api.tasks.list(pid)
        setTasks(t)
      } catch { /* silent on WS refresh failures */ }
    }
  }, [])

  useEffect(() => {
    if (!id) return
    ws.subscribe(id)
    const unsub = ws.on('*', handleWSMessage)
    return () => {
      ws.unsubscribe(id)
      unsub()
    }
  }, [id, ws, handleWSMessage])

  async function loadProject() {
    if (!id) return
    try {
      const [p, t] = await Promise.all([api.projects.get(id), api.tasks.list(id)])
      setProject(p)
      setTasks(t || [])
    } catch (err) {
      showToast(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProject() }, [id])

  async function handleMoveTask(taskId: string, toStatusId: string) {
    if (!id) return
    const current = tasks.find((t) => t.id === taskId)
    if (!current || current.statusId === toStatusId) return
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statusId: toStatusId } : t)))
    try {
      await api.tasks.move(id, taskId, { statusId: toStatusId })
    } catch (err) {
      showToast(extractError(err))
      if (id) {
        const t = await api.tasks.list(id).catch(() => [])
        setTasks(t)
      }
    }
  }

  async function handleCreateTask() {
    if (!id || !taskModal.statusId || !formTitle.trim()) return
    try {
      await api.tasks.create(id, {
        title: formTitle,
        description: formDesc,
        statusId: taskModal.statusId,
        dueDate: formDueDate || undefined,
      })
      setTaskModal({ open: false })
      setFormTitle('')
      setFormDesc('')
      setFormDueDate('')
      showToast('Task created', 'success')
      const t = await api.tasks.list(id)
      setTasks(t)
    } catch (err) {
      showToast(extractError(err))
    }
  }

  async function handleUpdateTask() {
    if (!id || !taskModal.editTask) return
    try {
      await api.tasks.update(id, taskModal.editTask.id, {
        title: formTitle,
        description: formDesc,
        dueDate: formDueDate || null,
      })
      setTaskModal({ open: false })
      showToast('Task updated', 'success')
      const t = await api.tasks.list(id)
      setTasks(t)
    } catch (err) {
      showToast(extractError(err))
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!id || !confirm('Delete this task?')) return
    try {
      await api.tasks.delete(id, taskId)
      showToast('Task deleted', 'success')
      const t = await api.tasks.list(id)
      setTasks(t)
    } catch (err) {
      showToast(extractError(err))
    }
  }

  async function handleCreateStatus() {
    if (!id || !newStatusName.trim()) return
    try {
      await api.statuses.create(id, { name: newStatusName, color: newStatusColor })
      setNewStatusName('')
      setStatusModal(false)
      showToast('Status created', 'success')
      loadProject()
    } catch (err) {
      showToast(extractError(err))
    }
  }

  function openEditTask(task: Task) {
    setFormTitle(task.title)
    setFormDesc(task.description || '')
    setFormDueDate(task.dueDate || '')
    setTaskModal({ open: true, editTask: task })
  }

  function openCreateTask(statusId: string) {
    setFormTitle('')
    setFormDesc('')
    setFormDueDate('')
    setTaskModal({ open: true, statusId })
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>
  if (!project) return <div className="text-center py-12 text-gray-400">Project not found</div>

  const tasksByStatus = (statusId: string) => tasks.filter((t) => t.statusId === statusId)

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Link to="/" className="text-sm text-indigo-600 hover:underline">← Back to projects</Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && <p className="text-gray-500 text-sm">{project.description}</p>}
          </div>
          <button
            onClick={() => setStatusModal(true)}
            className="text-sm bg-gray-200 px-3 py-1.5 rounded hover:bg-gray-300"
          >
            + Status
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full pb-4 min-h-0" style={{ minWidth: project.statuses.length * 300 }}>
          {project.statuses.map((s) => (
            <StatusColumn
              key={s.id}
              status={s}
              tasks={tasksByStatus(s.id)}
              onEditTask={openEditTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={openCreateTask}
              onMoveTask={handleMoveTask}
            />
          ))}
        </div>
      </div>

      {taskModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{taskModal.editTask ? 'Edit Task' : 'New Task'}</h2>
            <input
              type="text"
              placeholder="Task title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              rows={3}
            />
            <input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setTaskModal({ open: false })} className="px-4 py-2 text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button
                onClick={taskModal.editTask ? handleUpdateTask : handleCreateTask}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                {taskModal.editTask ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">New Status</h2>
            <input
              type="text"
              placeholder="Status name"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              autoFocus
            />
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm text-gray-500">Color:</label>
              <input
                type="color"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="w-10 h-10 p-0.5 border rounded cursor-pointer"
              />
              <span className="text-xs text-gray-400">{newStatusColor}</span>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStatusModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button onClick={handleCreateStatus} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
