import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, extractError, parseLocalDate, todayStr } from '../lib/api'
import { wsClient } from '../lib/ws'
import { useWebSocket } from '../hooks/useWebSocket'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuth'
import type { ProjectDetail as ProjectDetailType, Task, ViewMode } from '../types'
import StatusColumn from '../components/StatusColumn'
import ListView from '../components/ListView'
import CalendarView from '../components/CalendarView'
import ViewSwitcher from '../components/ViewSwitcher'
import MemberPanel from '../components/MemberPanel'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectDetailType | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [showCreateStatus, setShowCreateStatus] = useState(false)
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('#6366F1')

  const [taskModal, setTaskModal] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    statusId?: string
    editTask?: Task
  }>({ open: false, mode: 'create' })

  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formStatusId, setFormStatusId] = useState('')

  const idRef = useRef(id)
  idRef.current = id
  const { showToast } = useToast()
  const ws = useWebSocket()

  const isOwner = project?.ownerId === user?.id

  const handleWSMessage = useCallback(async () => {
    const pid = idRef.current
    if (pid) {
      try {
        const t = await api.tasks.list(pid)
        setTasks(t)
      } catch { /* silent */ }
    }
  }, [])

  useEffect(() => {
    if (!id) return
    ws.subscribe(id)
    const unsubAll = ws.on('*', handleWSMessage)
    const unsubRemoved = ws.on('memberRemoved', (msg) => {
      if ((msg.data as Record<string, string>)?.userId === user?.id) {
        showToast('You have been removed from the project', 'info')
        navigate('/')
      }
    })
    return () => { ws.unsubscribe(id); unsubAll(); unsubRemoved() }
  }, [id, ws, handleWSMessage, user, navigate, showToast])

  async function loadProject() {
    if (!id) return
    try {
      const [p, t] = await Promise.all([api.projects.get(id), api.tasks.list(id)])
      setProject(p)
      setTasks(t || [])
    } catch (err) { showToast(extractError(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProject() }, [id])

  function openCreateTask(statusId: string) {
    setFormTitle(''); setFormDesc(''); setFormDueDate(''); setFormStatusId(statusId)
    setTaskModal({ open: true, mode: 'create', statusId })
  }

  function openEditTask(task: Task) {
    setFormTitle(task.title)
    setFormDesc(task.description || '')
    setFormDueDate(task.dueDate ? task.dueDate.split('T')[0] : '')
    setFormStatusId(task.statusId)
    setTaskModal({ open: true, mode: 'edit', editTask: task })
  }

  async function handleSaveTask() {
    if (!id || !formTitle.trim() || !formStatusId) return
    if (formDueDate) {
      const selected = parseLocalDate(formDueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selected < today) {
        showToast('Due date cannot be in the past', 'info')
        return
      }
    }
    try {
      if (taskModal.mode === 'create') {
        await api.tasks.create(id, {
          title: formTitle, description: formDesc,
          statusId: formStatusId, dueDate: formDueDate || undefined,
        })
        showToast('Task created', 'success')
      } else if (taskModal.editTask) {
        await api.tasks.update(id, taskModal.editTask.id, {
          title: formTitle, description: formDesc,
          statusId: formStatusId, dueDate: formDueDate || null,
        })
        showToast('Task updated', 'success')
      }
      setTaskModal({ open: false, mode: 'create' })
      const t = await api.tasks.list(id)
      setTasks(t)
    } catch (err) { showToast(extractError(err)) }
  }

  async function handleDeleteTask(taskId: string) {
    if (!id || !confirm('Delete this task?')) return
    try {
      await api.tasks.delete(id, taskId)
      showToast('Task deleted', 'success')
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (err) { showToast(extractError(err)) }
  }

  async function handleMoveTask(taskId: string, toStatusId: string) {
    if (!id) return
    const current = tasks.find((t) => t.id === taskId)
    if (!current || current.statusId === toStatusId) return
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statusId: toStatusId } : t)))
    try { await api.tasks.move(id, taskId, { statusId: toStatusId }) }
    catch (err) {
      showToast(extractError(err))
      const t = await api.tasks.list(id).catch(() => [])
      setTasks(t)
    }
  }

  async function handleCreateStatus() {
    if (!id || !newStatusName.trim()) return
    try {
      const s = await api.statuses.create(id, { name: newStatusName, color: newStatusColor })
      setNewStatusName(''); setShowCreateStatus(false)
      showToast(`Status "${s.name}" created`, 'success')
      const p = await api.projects.get(id)
      setProject(p)
    } catch (err) { showToast(extractError(err)) }
  }

  async function handleRenameStatus(statusId: string, name: string) {
    if (!id) return
    try {
      await api.statuses.update(id, statusId, { name })
      setProject((prev) => prev ? {
        ...prev,
        statuses: prev.statuses.map((s) => s.id === statusId ? { ...s, name } : s),
      } : prev)
    } catch (err) { showToast(extractError(err)) }
  }

  async function handleChangeStatusColor(statusId: string, color: string) {
    if (!id) return
    try {
      await api.statuses.update(id, statusId, { color })
      setProject((prev) => prev ? {
        ...prev,
        statuses: prev.statuses.map((s) => s.id === statusId ? { ...s, color } : s),
      } : prev)
    } catch (err) { showToast(extractError(err)) }
  }

  async function handleDeleteStatus(statusId: string) {
    if (!id) return
    const statusTasks = tasks.filter((t) => t.statusId === statusId)
    if (statusTasks.length > 0 && !confirm(`This status has ${statusTasks.length} task(s). Delete anyway?`)) return
    try {
      await api.statuses.delete(id, statusId)
      showToast('Status deleted', 'success')
      const p = await api.projects.get(id)
      setProject(p)
      const t = await api.tasks.list(id)
      setTasks(t)
    } catch (err) { showToast(extractError(err)) }
  }

  async function handleDeleteProject() {
    if (!id || !confirm('Delete this project and all its tasks? This cannot be undone.')) return
    try {
      await api.projects.delete(id)
      showToast('Project deleted', 'success')
      navigate('/')
    } catch (err) { showToast(extractError(err)) }
  }

  async function handleLeaveProject() {
    if (!id || !confirm('Leave this project?')) return
    try {
      await api.members.leave(id)
      navigate('/')
    } catch (err) { showToast(extractError(err)) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading board...</div>
  )
  if (!project) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Project not found</div>
  )

  const tasksByStatus = (statusId: string) =>
    tasks.filter((t) => t.statusId === statusId)

  const sortedStatuses = [...(project.statuses || [])].sort((a, b) => a.order - b.order)

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      {/* ---- Header ---- */}
      <div className="mb-5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-['DM_Sans',sans-serif]">Tasks</span>
              <span className="text-xs text-gray-300 font-['DM_Sans',sans-serif]">{tasks.length} total</span>
              {project.ownerId && (
                <span className="text-[11px] text-gray-300 font-['DM_Sans',sans-serif]">·</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-semibold text-gray-900 tracking-tight truncate">{project.name}</h1>
            {project.description && <p className="text-sm text-gray-400 mt-1 font-['DM_Sans',sans-serif]">{project.description}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ViewSwitcher current={viewMode} onChange={setViewMode} />
            {viewMode === 'kanban' && (
              <button
                onClick={() => setShowCreateStatus(true)}
                className="text-xs font-semibold bg-indigo-600 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]"
              >
                + New Status
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Project Actions ---- */}
      <div className="flex items-center gap-3 mb-5">
        {isOwner && (
          <button
            onClick={handleDeleteProject}
            className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition font-['DM_Sans',sans-serif]"
          >
            Delete Project
          </button>
        )}
        {!isOwner && user && (
          <button
            onClick={handleLeaveProject}
            className="text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition font-['DM_Sans',sans-serif]"
          >
            Leave Project
          </button>
        )}
      </div>

      {/* ---- Member Panel ---- */}
      <MemberPanel projectId={id!} isOwner={isOwner ?? false} />

      {/* ---- Views ---- */}
      <div className="flex-1 min-h-0">
        {viewMode === 'kanban' && (
          <div className="h-full overflow-x-auto -mx-6 px-6 pb-4">
            {sortedStatuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                <div className="text-4xl mb-4 opacity-50">📋</div>
                <p className="text-sm font-medium font-['DM_Sans',sans-serif]">No status columns yet</p>
                <p className="text-xs mt-1.5 font-['DM_Sans',sans-serif]">Click <strong className="text-indigo-500">+ New Status</strong> above to create your first column.</p>
              </div>
            ) : (
              <div className="flex gap-4 pb-6 h-full min-h-0">
                {sortedStatuses.map((s) => (
                  <StatusColumn
                    key={s.id}
                    status={s}
                    tasks={tasksByStatus(s.id)}
                    onEditTask={openEditTask}
                    onDeleteTask={handleDeleteTask}
                    onAddTask={openCreateTask}
                    onMoveTask={handleMoveTask}
                    onRenameStatus={handleRenameStatus}
                    onDeleteStatus={handleDeleteStatus}
                    onChangeStatusColor={handleChangeStatusColor}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <ListView
            tasks={tasks}
            statuses={project.statuses}
            onEditTask={openEditTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            tasks={tasks}
            statuses={project.statuses}
            onEditTask={openEditTask}
          />
        )}
      </div>

      {/* ---- Create Status Modal ---- */}
      {showCreateStatus && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateStatus(false)}>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['Playfair_Display',serif] text-lg font-semibold mb-5">New Status Column</h2>
            <input
              type="text"
              placeholder="Status name (e.g. Reviewing)"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateStatus()}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 mb-4 font-['DM_Sans',sans-serif]"
              autoFocus
            />
            <div className="flex items-center gap-3 mb-6">
              <label className="text-xs text-gray-400 font-medium font-['DM_Sans',sans-serif]">Color:</label>
              <input
                type="color"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="w-9 h-9 p-0.5 border border-gray-200 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateStatus(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 font-['DM_Sans',sans-serif]">Cancel</button>
              <button onClick={handleCreateStatus} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Create / Edit Task Modal ---- */}
      {taskModal.open && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setTaskModal({ open: false, mode: 'create' })}>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['Playfair_Display',serif] text-lg font-semibold mb-5">
              {taskModal.mode === 'create' ? 'New Task' : 'Edit Task'}
            </h2>

            <label className="text-xs text-gray-400 font-medium mb-1.5 block font-['DM_Sans',sans-serif]">Title *</label>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 mb-4 font-['DM_Sans',sans-serif]"
              autoFocus
            />

            <label className="text-xs text-gray-400 font-medium mb-1.5 block font-['DM_Sans',sans-serif]">Description</label>
            <textarea
              placeholder="Add details..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 mb-4 font-['DM_Sans',sans-serif]"
              rows={3}
            />

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block font-['DM_Sans',sans-serif]">Status</label>
                <select
                  value={formStatusId}
                  onChange={(e) => setFormStatusId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-['DM_Sans',sans-serif]"
                >
                  {project.statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block font-['DM_Sans',sans-serif]">Due Date</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  min={todayStr()}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-['DM_Sans',sans-serif]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setTaskModal({ open: false, mode: 'create' })} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 font-['DM_Sans',sans-serif]">Cancel</button>
              <button onClick={handleSaveTask} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 font-['DM_Sans',sans-serif]">
                {taskModal.mode === 'create' ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
