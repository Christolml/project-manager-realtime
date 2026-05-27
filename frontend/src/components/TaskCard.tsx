import { useDrag } from '../hooks/useDragAndDrop'
import type { Task } from '../types'
import { isOverdue, formatDate } from '../lib/api'

interface Props {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export default function TaskCard({ task, onEdit, onDelete }: Props) {
  const { dragRef, isDragging } = useDrag(task.id)
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false

  return (
    <div
      ref={dragRef}
      draggable
      onClick={() => onEdit(task)}
      className={`bg-white rounded-xl border border-gray-100 p-3.5 group cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-gray-200 ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-indigo-200 rotate-2' : 'shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 leading-snug flex-1 font-['DM_Sans',sans-serif]">{task.title}</h4>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
          className="text-xs text-gray-200 hover:text-red-400 shrink-0 mt-0.5 transition"
        >
          ✕
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed font-['DM_Sans',sans-serif]">{task.description}</p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {task.assignee && (
          <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium font-['DM_Sans',sans-serif]">
            {task.assignee.username}
          </span>
        )}
        {task.dueDate && (
          <span className={`text-[11px] flex items-center gap-1 font-['DM_Sans',sans-serif] ${
            overdue ? 'text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-md' : 'text-gray-400'
          }`}>
            {overdue && '⚠'}
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-x-2 gap-y-0.5 mt-3 pt-2.5 border-t border-gray-50 text-[10px] text-gray-300 flex-wrap font-['DM_Sans',sans-serif]">
        {task.creator && <span>created by {task.creator.username}</span>}
        {task.updater && <span>edited by {task.updater.username}</span>}
      </div>
    </div>
  )
}
