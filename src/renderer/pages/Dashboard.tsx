import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function useIsDark() {
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isDark
}

function WalkTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startTime) / 1000))
  const isDark = useIsDark()

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const min = Math.floor(elapsed / 60)
  const sec = elapsed % 60
  const maxTime = 30 * 60
  const progress = Math.min(elapsed / maxTime, 1)
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="flex items-center gap-4">
      <svg className="w-24 h-24 -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="45"
          stroke={isDark ? '#1E293B' : '#d1fae5'}
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="48"
          cy="48"
          r="45"
          stroke={isDark ? '#34D399' : '#10b981'}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
        <text
          x="48"
          y="54"
          textAnchor="middle"
          fill={isDark ? '#F1F5F9' : '#15803d'}
          style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}
        >
          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
        </text>
      </svg>
    </div>
  )
}

export default function Dashboard() {
  const { stats, refreshStats, timerState, walkStatus, streakDays, weekComparison } = useApp()
  const isDark = useIsDark()

  const today = stats[0] || {
    date: new Date().toISOString().split('T')[0],
    standCount: 0,
    walkCount: 0,
    walkDurationSec: 0,
    waterCount: 0
  }

  const weekStand = stats.reduce((s, d) => s + d.standCount, 0)
  const weekWalk = stats.reduce((s, d) => s + d.walkCount, 0)
  const weekWalkDuration = stats.reduce((s, d) => s + d.walkDurationSec, 0)
  const weekWater = stats.reduce((s, d) => s + d.waterCount, 0)

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}秒`
    const min = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${min}分${s}秒` : `${min}分钟`
  }

  const formatCountdown = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000))
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    if (min > 10) return `${min}分`
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const remaining = timerState.remindIntervalMs - timerState.workTimerMs
  const progress = timerState.isWorking
    ? Math.min(timerState.workTimerMs / timerState.remindIntervalMs, 1)
    : 0
  const isUrgent = timerState.isWorking && remaining <= 5 * 60 * 1000
  const progressStyle = !timerState.isWorking
    ? { backgroundImage: 'linear-gradient(to right, #9CA3AF, #9CA3AF)' }
    : isUrgent
      ? { backgroundImage: 'linear-gradient(to right, #F59E0B, #FBBF24)' }
      : { backgroundImage: 'linear-gradient(to right, #4F46E5, #818CF8)' }

  const chartData = [...stats].reverse().map((d) => ({
    date: d.date.slice(5),
    站一站: d.standCount,
    走一走: d.walkCount,
    装个水: d.waterCount
  }))

  const handleRestNow = () => {
    window.electron?.ipcRenderer.send('trigger-rest-now')
  }

  const handleRemindNow = () => {
    window.electron?.ipcRenderer.send('trigger-remind-now')
  }

  return (
    <div className="p-5 space-y-5">
      <h2 className="text-lg font-bold text-[var(--color-text)]">📊 今日统计</h2>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--color-text-secondary)]">🔥 连续打卡</span>
        <span className="font-bold text-orange-500 whitespace-nowrap">{streakDays} 天</span>
      </div>

      {walkStatus.isWalking ? (
        <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚶</span>
            <span className="text-sm font-medium text-emerald-700">正在走路</span>
          </div>
          <WalkTimer startTime={walkStatus.startTime!} />
          <button
            onClick={() => window.electron?.ipcRenderer.send('walk-complete', Math.floor((Date.now() - walkStatus.startTime!) / 1000))}
            className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            结束走路
          </button>
        </div>
      ) : (
        <div className="bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-text)]">
              {timerState.isWorking ? '距下次休息' : '当前状态'}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
              {timerState.isWorking
                ? formatCountdown(remaining)
                : '🌙 非工作时段'}
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ ...progressStyle, width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--color-surface-card)] rounded-xl p-3 shadow-sm border border-[var(--color-border)]">
          <div className="text-xl mb-1">🧍</div>
          <div className="text-2xl font-bold text-indigo-600">{today.standCount}</div>
          <div className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">站一站 · 今日</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-1 whitespace-nowrap">本周 {weekStand} 次</div>
        </div>

        <div className="bg-[var(--color-surface-card)] rounded-xl p-3 shadow-sm border border-[var(--color-border)]">
          <div className="text-xl mb-1">🚶</div>
          <div className="text-2xl font-bold text-emerald-600">{today.walkCount}</div>
          <div className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">走一走 · 今日</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-1 whitespace-nowrap">今日 {formatDuration(today.walkDurationSec)}</div>
          <div className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">本周 {weekWalk} 次</div>
        </div>

        <div className="bg-[var(--color-surface-card)] rounded-xl p-3 shadow-sm border border-[var(--color-border)]">
          <div className="text-xl mb-1">🥤</div>
          <div className="text-2xl font-bold text-amber-600">{today.waterCount}</div>
          <div className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">装个水 · 今日</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-1 whitespace-nowrap">本周 {weekWater} 次</div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRestNow}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md"
        >
          🧘 立刻休息
        </button>
        <button
          onClick={handleRemindNow}
          className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors shadow-md"
        >
          ⏰ 立刻提醒
        </button>
        <button
          onClick={() => window.electron?.ipcRenderer.invoke('add-water')}
          className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors shadow-md"
        >
          🥤 喝了水
        </button>
      </div>

      <div className="bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">本周趋势</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} strokeOpacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748B' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748B' }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: '8px', color: isDark ? '#F1F5F9' : '#1E293B' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }} />
            <Line type="monotone" dataKey="站一站" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="走一走" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="装个水" stroke="#D97706" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">📊 本周 vs 上周</h3>
        {(['stand', 'walk', 'water'] as const).map((type) => {
          const labels = { stand: '🧍 站一站', walk: '🚶 走一走', water: '🥤 装个水' }
          const thisCount = weekComparison?.thisWeek[type] || 0
          const lastCount = weekComparison?.lastWeek[type] || 0
          const diff = thisCount - lastCount
          return (
            <div key={type} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[var(--color-text)] whitespace-nowrap">{labels[type]}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">{thisCount} 次</span>
                {diff !== 0 && (
                  <span className={`text-xs font-medium whitespace-nowrap ${diff > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {diff > 0 ? '↑' : '↓'}{Math.abs(diff)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
