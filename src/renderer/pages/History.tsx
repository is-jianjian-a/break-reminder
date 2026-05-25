import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { ActionType, ACTION_LABELS, ACTION_ICONS } from '../../shared/types'

export default function History() {
  const { records, refreshRecords, refreshStats, refreshStreak, refreshWeekComparison } = useApp()
  const [filter, setFilter] = useState<ActionType | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType, setAddType] = useState<ActionType>('stand')
  const [addTime, setAddTime] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [addWalkMinutes, setAddWalkMinutes] = useState('5')

  const filteredRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp)
    if (filter === 'all') return sorted
    return sorted.filter((r) => r.type === filter)
  }, [records, filter])

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredRecords> = {}
    for (const record of filteredRecords) {
      const date = new Date(record.timestamp).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(record)
    }
    return groups
  }, [filteredRecords])

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (sec?: number) => {
    if (!sec) return ''
    if (sec < 60) return `${sec}秒`
    const min = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${min}分${s}秒` : `${min}分钟`
  }

  const todayStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = yesterdayDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })

  const formatDateLabel = (date: string) => {
    if (date === todayStr) return '今天'
    if (date === yesterdayStr) return '昨天'
    return date
  }

  const handleDelete = async (id: string) => {
    await window.electron?.ipcRenderer.invoke('delete-record', id)
    refreshRecords()
    refreshStats()
    refreshStreak()
    refreshWeekComparison()
  }

  const handleEditDuration = (record: ActionRecord) => {
    if (record.type !== 'walk' || !record.durationSec) return
    setEditingId(record.id)
    setEditValue(String(Math.round(record.durationSec / 60)))
  }

  const handleSaveDuration = async (id: string) => {
    const minutes = parseInt(editValue)
    if (isNaN(minutes) || minutes < 0) {
      setEditingId(null)
      return
    }
    await window.electron?.ipcRenderer.invoke('update-record', { id, updates: { durationSec: minutes * 60 } })
    setEditingId(null)
    refreshRecords()
    refreshStats()
    refreshStreak()
    refreshWeekComparison()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleAddRecord = async () => {
    const timestamp = new Date(addTime).getTime()
    if (isNaN(timestamp)) return

    const record: { type: ActionType; timestamp: number; durationSec?: number } = {
      type: addType,
      timestamp
    }

    if (addType === 'walk') {
      const minutes = parseInt(addWalkMinutes)
      if (isNaN(minutes) || minutes <= 0) return
      record.durationSec = minutes * 60
    }

    await window.electron?.ipcRenderer.invoke('add-record', record)
    setShowAddForm(false)
    refreshRecords()
    refreshStats()
    refreshStreak()
    refreshWeekComparison()
  }

  const handleOpenAddForm = () => {
    const now = new Date()
    setAddTime(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setAddType('stand')
    setAddWalkMinutes('5')
    setShowAddForm(true)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text)]">📅 历史记录</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddForm}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            + 补充记录
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActionType | 'all')}
            className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-1.5 bg-[var(--color-surface-card)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="all">全部</option>
            <option value="stand">🧍 站一站</option>
            <option value="walk">🚶 走一走</option>
            <option value="water">🥤 装个水</option>
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-indigo-200 space-y-3 animate-fade-in">
          <div className="text-sm font-semibold text-[var(--color-text)]">补充记录</div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-secondary)] w-16">类型</span>
            <div className="flex gap-2">
              {(['stand', 'walk', 'water'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setAddType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    addType === type
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:bg-indigo-50'
                  }`}
                >
                  {ACTION_ICONS[type]} {ACTION_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-secondary)] w-16">时间</span>
            <input
              type="datetime-local"
              value={addTime}
              onChange={(e) => setAddTime(e.target.value)}
              className="flex-1 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--color-surface-card)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {addType === 'walk' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--color-text-secondary)] w-16">时长</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={addWalkMinutes}
                  onChange={(e) => setAddWalkMinutes(e.target.value)}
                  className="w-20 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-center bg-[var(--color-surface-card)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <span className="text-sm text-[var(--color-text-secondary)]">分钟</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddRecord}
              className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {Object.keys(groupedByDate).length === 0 && (
        <div className="text-center text-[var(--color-text-secondary)] py-12">暂无记录</div>
      )}

      {Object.entries(groupedByDate).map(([date, recs]) => (
        <div key={date}>
          <div className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">{formatDateLabel(date)}</div>
          <div className="space-y-1.5">
            {recs.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 bg-[var(--color-surface-card)] rounded-lg px-4 py-2.5 shadow-sm border border-[var(--color-border)] group"
              >
                <span className="text-lg">{ACTION_ICONS[record.type]}</span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {ACTION_LABELS[record.type]}
                </span>
                {record.type === 'walk' && record.durationSec ? (
                  editingId === record.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveDuration(record.id)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="w-12 border border-indigo-300 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-[var(--color-surface-card)] text-[var(--color-text)]"
                        autoFocus
                      />
                      <span className="text-xs text-[var(--color-text-secondary)]">分</span>
                      <button onClick={() => handleSaveDuration(record.id)} className="text-xs text-indigo-600 hover:text-indigo-800">✓</button>
                      <button onClick={handleCancelEdit} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">✕</button>
                    </div>
                  ) : (
                    <span
                      className="text-xs text-[var(--color-text-secondary)] cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => handleEditDuration(record)}
                      title="点击修改时长"
                    >
                      {formatDuration(record.durationSec)}
                    </span>
                  )
                ) : record.durationSec ? (
                  <span className="text-xs text-[var(--color-text-secondary)]">{formatDuration(record.durationSec)}</span>
                ) : null}
                <span className="ml-auto text-xs text-[var(--color-text-secondary)]">{formatTime(record.timestamp)}</span>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 text-sm ml-2"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
