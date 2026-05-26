import { useState } from 'react'

interface CalendarPickerProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  recordDates: string[]
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarPicker({ selectedDate, onSelectDate, recordDates }: CalendarPickerProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  const today = new Date()
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  const selectedStr = formatDateStr(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())

  const recordSet = new Set(recordDates)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevYear, isCurrentMonth: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true })
  }

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false })
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    onSelectDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  }

  const handleClickDay = (year: number, month: number, day: number) => {
    onSelectDate(new Date(year, month, day))
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="bg-[var(--color-surface-card)] rounded-xl p-3 shadow-sm border border-[var(--color-border)]" style={{ width: '100%' }}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePrevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors text-sm"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
          {viewYear}年{viewMonth + 1}月
        </span>
        <button
          onClick={handleToday}
          className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          今
        </button>
        <button
          onClick={handleNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors text-sm"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((wd) => (
          <div key={wd} className="text-center text-xs text-[var(--color-text-secondary)] font-medium py-1.5">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dateStr = formatDateStr(cell.year, cell.month, cell.day)
          const isSelected = dateStr === selectedStr
          const isToday = dateStr === todayStr
          const hasRecord = recordSet.has(dateStr)

          return (
            <button
              key={idx}
              onClick={() => handleClickDay(cell.year, cell.month, cell.day)}
              className={`
                relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors
                ${!cell.isCurrentMonth ? 'opacity-30' : ''}
                ${isSelected ? 'bg-indigo-600 text-white' : 'text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]'}
                ${isToday && !isSelected ? 'border-b-2 border-indigo-400' : ''}
              `}
            >
              <span className="text-sm leading-tight whitespace-nowrap">{cell.day}</span>
              {hasRecord && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
