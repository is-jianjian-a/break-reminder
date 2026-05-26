import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { ActionType, ACTION_LABELS, WorkPeriod, ActionRecord } from '../../shared/types'
import { ActionIcon } from '../utils/ActionIcon'
import CalendarPicker from '../components/CalendarPicker'

const PERIOD_META: Record<string, { label: string; emoji: string }> = {
  morning: { label: '上午', emoji: '🌅' },
  afternoon: { label: '下午', emoji: '☀️' },
  evening: { label: '晚上', emoji: '🌙' }
}

const PERIOD_KEYS = ['morning', 'afternoon', 'evening']

const DOT_COLORS: Record<ActionType, string> = {
  stand: 'bg-indigo-500',
  walk: 'bg-emerald-500',
  water: 'bg-amber-500'
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function getPeriodTimeMs(period: WorkPeriod, dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const sMin = timeToMinutes(period.start)
  const eMin = timeToMinutes(period.end)
  return {
    startMs: new Date(year, month - 1, day, Math.floor(sMin / 60), sMin % 60).getTime(),
    endMs: new Date(year, month - 1, day, Math.floor(eMin / 60), eMin % 60).getTime()
  }
}

function getDisplayRange(period: WorkPeriod, index: number) {
  const sMin = timeToMinutes(period.start)
  const eMin = timeToMinutes(period.end)
  return {
    startMin: index === 0 ? 8 * 60 : sMin,
    endMin: index === 2 ? 23 * 60 : eMin
  }
}

interface TimelineItem {
  type: 'hour' | 'record'
  minutes: number
  hour?: number
  records?: ActionRecord[]
}

function buildTimelineItems(displayStart: number, displayEnd: number, records: ActionRecord[]): TimelineItem[] {
  const items: TimelineItem[] = []
  const startH = Math.floor(displayStart / 60)
  const endH = Math.ceil(displayEnd / 60)
  for (let h = startH; h <= endH; h++) {
    const hMin = h * 60
    if (hMin >= displayStart && hMin <= displayEnd) {
      items.push({ type: 'hour', minutes: hMin, hour: h })
    }
  }
  const grouped = new Map<number, ActionRecord[]>()
  for (const record of records) {
    const d = new Date(record.timestamp)
    const key = d.getHours() * 60 + d.getMinutes()
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(record)
  }
  for (const [minutes, recs] of grouped) {
    items.push({ type: 'record', minutes, records: recs })
  }
  items.sort((a, b) => a.minutes - b.minutes || (a.type === 'hour' ? -1 : 1))
  return items
}

export default function History() {
  const { records, config, refreshRecords, refreshStats, refreshStreak, refreshWeekComparison } = useApp()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType, setAddType] = useState<ActionType>('stand')
  const [addTime, setAddTime] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [addWalkMinutes, setAddWalkMinutes] = useState('5')

  const recordDates = useMemo(() => {
    const dateSet = new Set<string>()
    for (const r of records) {
      const d = new Date(r.timestamp)
      dateSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
    return Array.from(dateSet)
  }, [records])

  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`

  const dayRecords = useMemo(() => {
    return records
      .filter(r => {
        const d = new Date(r.timestamp)
        const rStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        return rStr === selectedDateStr
      })
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [records, selectedDateStr])

  const dateLabel = useMemo(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (selectedDateStr === todayStr) return '今天'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    if (selectedDateStr === yesterdayStr) return '昨天'
    return selectedDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }, [selectedDate, selectedDateStr])

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (sec?: number) => {
    if (!sec) return ''
    if (sec < 60) return `${sec}秒`
    const min = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${min}分${s}秒` : `${min}分钟`
  }

  const handleDelete = async (id: string) => {
    await window.electron?.ipcRenderer.invoke('delete-record', id)
    refreshRecords()
    refreshStats()
    refreshStreak()
    refreshWeekComparison()
  }

  const handleEditDuration = (record: ActionRecord) => {
    if (record.type !== 'walk') return
    setEditingId(record.id)
    setEditValue(record.durationSec ? String(Math.round(record.durationSec / 60)) : '5')
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

  const periodRecordsMap = useMemo(() => {
    const map = new Map<string, ActionRecord[]>()
    for (const period of config.workPeriods) {
      const { startMs, endMs } = getPeriodTimeMs(period, selectedDateStr)
      const pr = dayRecords.filter(r => r.timestamp >= startMs && r.timestamp < endMs)
      map.set(period.id, pr)
    }
    const assigned = new Set<string>()
    for (const pr of map.values()) {
      for (const r of pr) assigned.add(r.id)
    }
    const unassigned = dayRecords.filter(r => !assigned.has(r.id))
    if (unassigned.length > 0 && config.workPeriods.length > 0) {
      for (const record of unassigned) {
        const rMin = new Date(record.timestamp).getHours() * 60 + new Date(record.timestamp).getMinutes()
        let nearestIdx = 0
        let nearestDist = Infinity
        for (let i = 0; i < config.workPeriods.length; i++) {
          const sMin = timeToMinutes(config.workPeriods[i].start)
          const eMin = timeToMinutes(config.workPeriods[i].end)
          const dist = Math.min(Math.abs(rMin - sMin), Math.abs(rMin - eMin))
          if (dist < nearestDist) {
            nearestDist = dist
            nearestIdx = i
          }
        }
        const periodId = config.workPeriods[nearestIdx].id
        const existing = map.get(periodId) || []
        existing.push(record)
        map.set(periodId, existing)
      }
    }
    return map
  }, [config.workPeriods, dayRecords, selectedDateStr])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text)]">📅 历史记录</h2>
        <button
          onClick={handleOpenAddForm}
          className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          + 补充记录
        </button>
      </div>

      <CalendarPicker
        selectedDate={selectedDate}
        onSelectDate={(date) => setSelectedDate(date)}
        recordDates={recordDates}
      />

      <div className="text-sm font-semibold text-[var(--color-text-secondary)]">
        {dateLabel}
      </div>

      <div className="grid grid-cols-3 gap-3 items-start">
        {config.workPeriods.map((period, index) => {
          const periodKey = PERIOD_KEYS[index] || `period-${index}`
          const meta = PERIOD_META[periodKey] || { label: `时段${index + 1}`, emoji: '⏰' }
          const periodRecords = periodRecordsMap.get(period.id) || []
          const { startMin, endMin } = getDisplayRange(period, index)
          const items = buildTimelineItems(startMin, endMin, periodRecords)

          return (
            <div key={period.id} className="bg-[var(--color-surface-card)] rounded-xl p-3 border border-[var(--color-border)]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{meta.emoji}</span>
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{meta.label}</span>
                {periodRecords.length > 0 && (
                  <span className="text-[10px] text-[var(--color-text-secondary)] opacity-60">{periodRecords.length}条</span>
                )}
              </div>

              <div className="relative pl-6">
                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[var(--color-border)]" />

                {items.map((item, idx) => {
                  if (item.type === 'hour') {
                    return (
                      <div key={`h-${item.hour}`} className="relative flex items-center h-7">
                        <div className="absolute left-[7px] w-3 h-px bg-[var(--color-text-secondary)] opacity-30" />
                        <span className="text-[10px] text-[var(--color-text-secondary)] opacity-40 font-mono select-none">
                          {String(item.hour).padStart(2, '0')}:00
                        </span>
                      </div>
                    )
                  }

                  const recs = item.records!
                  const firstRec = recs[0]
                  const hasWalk = recs.some(r => r.type === 'walk')
                  const walkRec = recs.find(r => r.type === 'walk')
                  const isEditing = walkRec && editingId === walkRec.id
                  const dotColor = hasWalk ? DOT_COLORS.walk : DOT_COLORS[recs[0].type]

                  return (
                    <div key={`r-${idx}`} className="relative flex items-center py-1.5 group">
                      <div className={`absolute left-[1.5px] w-3 h-3 rounded-full ${dotColor} ring-2 ring-[var(--color-surface-card)]`} />
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="text-[11px] text-[var(--color-text-secondary)] font-mono shrink-0">
                          {formatTime(firstRec.timestamp)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {recs.map(r => (
                            <ActionIcon key={r.id} type={r.type} size={13} />
                          ))}
                        </div>
                        {walkRec && walkRec.durationSec && !isEditing && (
                          <span
                            className="text-[10px] text-[var(--color-text-secondary)] cursor-pointer hover:text-indigo-500 transition-colors shrink-0"
                            onClick={() => handleEditDuration(walkRec)}
                          >
                            {formatDuration(walkRec.durationSec)}
                          </span>
                        )}
                        {isEditing && walkRec && (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveDuration(walkRec!.id)
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                              className="w-12 border border-indigo-300 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-[var(--color-surface-card)] text-[var(--color-text)]"
                              autoFocus
                            />
                            <span className="text-[10px] text-[var(--color-text-secondary)]">分</span>
                            <button onClick={() => handleSaveDuration(walkRec!.id)} className="text-xs text-indigo-600 hover:text-indigo-800">✓</button>
                            <button onClick={handleCancelEdit} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">✕</button>
                          </div>
                        )}
                        <button
                          onClick={() => { recs.forEach(r => handleDelete(r.id)) }}
                          className="opacity-0 group-hover:opacity-100 ml-auto shrink-0 w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 transition-all text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
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
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    addType === type
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:bg-indigo-50'
                  }`}
                >
                  <ActionIcon type={type} size={14} />
                  {ACTION_LABELS[type]}
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
    </div>
  )
}
