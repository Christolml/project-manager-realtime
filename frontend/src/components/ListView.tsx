import type { Task, TaskStatus } from '../types'
import { isOverdue, formatDate } from '../lib/api'

interface Props {
  tasks: Task[]
  statuses: TaskStatus[]
  onEditTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export default function ListView({ tasks, statuses, onEditTask, onDeleteTask }: Props) {
  const statusMap = new Map(statuses.map((s) => [s.id, s]))
  const sorted = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-300">
        <div className="text-4xl mb-4 opacity-50">📝</div>
        <p className="text-sm font-medium font-['DM_Sans',sans-serif]">No tasks yet</p>
        <p className="text-xs mt-1.5 font-['DM_Sans',sans-serif]">Switch to Kanban view to create your first task.</p>
      </div>
    )
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-[11px] uppercase tracking-wider font-['DM_Sans',sans-serif]">Task</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-[11px] uppercase tracking-wider font-['DM_Sans',sans-serif]">Status</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-[11px] uppercase tracking-wider hidden md:table-cell font-['DM_Sans',sans-serif]">Due Date</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-400 text-[11px] uppercase tracking-wider hidden lg:table-cell font-['DM_Sans',sans-serif]">Last edit</th>
              <th className="text-right px-4 py-3.5 font-medium text-gray-400 text-[11px] uppercase tracking-wider w-14 font-['DM_Sans',sans-serif]" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const status = statusMap.get(task.statusId)
              const overdue = task.dueDate ? isOverdue(task.dueDate) : false
              return (
                <tr
                  key={task.id}
                  className="border-b border-gray-50 hover:bg-[#f8f7f4] cursor-pointer transition"
                  onClick={() => onEditTask(task)}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-800 font-['DM_Sans',sans-serif]">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5 font-['DM_Sans',sans-serif]">{task.description}</p>
                    )}
                    <div className="flex items-center gap-x-2 text-[10px] text-gray-300 flex-wrap mt-1 font-['DM_Sans',sans-serif]">
                      {task.creator && <span>created by {task.creator.username}</span>}
                      {task.updater && <span>edited by {task.updater.username}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {status && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium font-['DM_Sans',sans-serif]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {task.dueDate ? (
                      <span className={`text-xs font-['DM_Sans',sans-serif] ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {overdue && '⚠ '}
                        {formatDate(task.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-200 font-['DM_Sans',sans-serif]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-gray-400 font-['DM_Sans',sans-serif]">
                      {task.updater?.username || task.creator?.username || <span className="text-gray-200">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id) }}
                      className="text-xs text-gray-200 hover:text-red-400 transition"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
