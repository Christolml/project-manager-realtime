import { useDrag } from '../hooks/useDragAndDrop'
import type { Task } from '../types'

interface Props {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export default function TaskCard({ task, onEdit, onDelete }: Props) {
  const { dragRef, isDragging } = useDrag(task.id)

  return (
    <div
      ref={dragRef}
      draggable
      className={`bg-white rounded-md shadow-sm border border-gray-200 p-3 mb-2 group cursor-grab active:cursor-grabbing transition-shadow ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-indigo-300' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-sm">{task.title}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => onEdit(task)} className="text-xs text-gray-400 hover:text-indigo-500">
            ✎
          </button>
          <button onClick={() => onDelete(task.id)} className="text-xs text-gray-400 hover:text-red-500">
            ✕
          </button>
        </div>
      </div>
      {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        {task.assignee && <span>{task.assignee.username}</span>}
        {task.dueDate && (
          <span className={new Date(task.dueDate) < new Date() ? 'text-red-400' : ''}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}
