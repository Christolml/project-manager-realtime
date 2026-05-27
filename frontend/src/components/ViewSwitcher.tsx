import type { ViewMode } from '../types'

interface Props {
  current: ViewMode
  onChange: (mode: ViewMode) => void
}

const views: { mode: ViewMode; label: string; icon: string }[] = [
  { mode: 'kanban', label: 'Kanban', icon: '⊞' },
  { mode: 'list', label: 'List', icon: '☰' },
  { mode: 'calendar', label: 'Calendar', icon: '📅' },
]

export default function ViewSwitcher({ current, onChange }: Props) {
  return (
    <div className="flex items-center bg-gray-100/80 rounded-xl p-0.5 gap-0.5 border border-gray-100">
      {views.map((v) => (
        <button
          key={v.mode}
          onClick={() => onChange(v.mode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 font-['DM_Sans',sans-serif] ${
            current === v.mode
              ? 'bg-white shadow-sm text-gray-800'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-sm">{v.icon}</span>
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  )
}
