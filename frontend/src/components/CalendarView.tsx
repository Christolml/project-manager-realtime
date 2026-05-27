import { useState, useMemo } from 'react'
import type { Task, TaskStatus } from '../types'

interface Props {
  tasks: Task[]
  statuses: TaskStatus[]
  onEditTask: (task: Task) => void
}

export default function CalendarView({ tasks, statuses, onEditTask }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses])
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.dueDate) continue
      const key = task.dueDate.split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [tasks])

  function isToday(day: number) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  const calendarDays = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d)
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-50">
        <button
          onClick={() => month === 0 ? (setYear(year - 1), setMonth(11)) : setMonth(month - 1)}
          className="text-gray-300 hover:text-gray-500 text-lg px-2 transition"
        >
          ‹
        </button>
        <h3 className="font-['Playfair_Display',serif] text-lg font-semibold text-gray-800 tracking-tight">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}
          className="text-gray-300 hover:text-gray-500 text-lg px-2 transition"
        >
          ›
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-gray-50">
        {dayNames.map((d) => (
          <div key={d} className="text-[11px] font-medium text-gray-300 text-center py-2.5 uppercase tracking-wider font-['DM_Sans',sans-serif]">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square bg-[#f8f7f4]/50" />
          }
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const dayTasks = tasksByDate.get(dateStr) || []
          return (
            <div
              key={day}
              className={`aspect-square border border-gray-50 p-1 overflow-hidden transition ${
                isToday(day) ? 'bg-indigo-50/40' : ''
              }`}
            >
              <span className={`text-[11px] font-medium mb-1 block px-1 font-['DM_Sans',sans-serif] ${
                isToday(day) ? 'text-indigo-600' : 'text-gray-400'
              }`}>
                {day}
              </span>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const status = statusMap.get(task.statusId)
                  return (
                    <button
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className="w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-80 transition font-medium leading-relaxed font-['DM_Sans',sans-serif]"
                      style={{ backgroundColor: status?.color || '#6B7280', color: '#fff' }}
                    >
                      {task.title}
                    </button>
                  )
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-gray-300 px-1 font-['DM_Sans',sans-serif]">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tasks without due date */}
      {tasks.filter((t) => !t.dueDate).length > 0 && (
        <div className="border-t border-gray-50 p-4">
          <p className="text-xs font-medium text-gray-300 mb-2 font-['DM_Sans',sans-serif]">
            Tasks without due date ({tasks.filter((t) => !t.dueDate).length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tasks.filter((t) => !t.dueDate).map((task) => (
              <button
                key={task.id}
                onClick={() => onEditTask(task)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition font-['DM_Sans',sans-serif]"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
