import { useDrop } from '../hooks/useDragAndDrop'
import type { Task, TaskStatus } from '../types'
import TaskCard from './TaskCard'

interface Props {
  status: TaskStatus
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onAddTask: (statusId: string) => void
  onMoveTask: (taskId: string, toStatusId: string) => void
}

export default function StatusColumn({ status, tasks, onEditTask, onDeleteTask, onAddTask, onMoveTask }: Props) {
  const { dropRef, isOver } = useDrop<HTMLDivElement>(status.id, (taskId) => {
    onMoveTask(taskId, status.id)
  })

  return (
    <div
      ref={dropRef}
      className={`bg-gray-100 rounded-lg p-3 min-w-[280px] w-[280px] flex-shrink-0 transition-colors ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-300' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
          <h3 className="font-semibold text-sm">{status.name}</h3>
          <span className="text-xs text-gray-400">({tasks.length})</span>
        </div>
        <button
          onClick={() => onAddTask(status.id)}
          className="text-gray-400 hover:text-indigo-500 text-sm"
        >
          +
        </button>
      </div>
      <div className="min-h-[60px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
        ))}
      </div>
    </div>
  )
}
