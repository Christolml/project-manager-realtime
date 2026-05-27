import { useState, useRef } from 'react'
import TaskCard from './TaskCard'
import type { TaskStatus, Task } from '../types'

interface Props {
  status: TaskStatus
  tasks: Task[]
  onEditTask: (task: Task, statusId: string) => void
  onDeleteTask: (taskId: string) => void
  onAddTask: (statusId: string) => void
  onMoveTask: (taskId: string, newStatusId: string, order: number) => void
  onRenameStatus: (statusId: string, name: string) => void
  onDeleteStatus: (statusId: string) => void
  onChangeStatusColor: (statusId: string, color: string) => void
}

export default function StatusColumn({
  status, tasks, onEditTask, onDeleteTask, onAddTask, onMoveTask,
  onRenameStatus, onDeleteStatus, onChangeStatusColor,
}: Props) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(status.name)
  const [dragOver, setDragOver] = useState(false)
  const dragCount = useRef(0)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  function handleDragLeave() {
    dragCount.current -= 1
    if (dragCount.current <= 0) { dragCount.current = 0; setDragOver(false) }
  }

  function handleDragEnter() {
    dragCount.current += 1
    setDragOver(true)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    dragCount.current = 0
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) onMoveTask(taskId, status.id, tasks.length)
  }

  function handleRename() {
    if (nameDraft.trim() && nameDraft !== status.name) onRenameStatus(status.id, nameDraft.trim())
    setEditingName(false)
  }

  return (
    <div
      className={`flex-1 min-w-[280px] max-w-[400px] bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col overflow-hidden transition-all border ${
        dragOver ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-gray-100 shadow-sm'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative">
            <input
              type="color"
              value={status.color}
              onChange={(e) => onChangeStatusColor(status.id, e.target.value)}
              className="absolute inset-0 opacity-0 w-4 h-4 cursor-pointer"
            />
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
          </div>
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
              className="text-sm font-semibold bg-transparent border-b border-gray-400 outline-none flex-1 min-w-0 font-['DM_Sans',sans-serif]"
            />
          ) : (
            <span
              className="text-sm font-semibold cursor-pointer truncate flex-1 font-['DM_Sans',sans-serif]"
              onDoubleClick={() => { setNameDraft(status.name); setEditingName(true) }}
              title="Double-click to rename"
            >
              {status.name}
            </span>
          )}
          <span className="text-xs text-gray-300 shrink-0 font-['DM_Sans',sans-serif]">{tasks.length}</span>
        </div>
        <button
          onClick={() => onDeleteStatus(status.id)}
          className="ml-1 text-xs text-gray-200 hover:text-red-400 transition shrink-0 cursor-pointer"
          title="Delete status"
        >
          ✕
        </button>
      </div>

      {/* Add task button */}
      <button
        onClick={() => onAddTask(status.id)}
        className="mx-3 mt-3 text-xs font-semibold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-xl transition cursor-pointer shrink-0 font-['DM_Sans',sans-serif]"
      >
        + Add task
      </button>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[100px]">
        {tasks.length === 0 && (
          <div className="text-xs text-gray-200 text-center py-6 select-none font-['DM_Sans',sans-serif]">Drop tasks here</div>
        )}
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onEdit={() => onEditTask(t, status.id)}
            onDelete={() => onDeleteTask(t.id)}
          />
        ))}
      </div>
    </div>
  )
}
