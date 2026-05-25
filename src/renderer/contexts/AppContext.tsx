import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { AppConfig, ActionRecord, DailyStats, DEFAULT_CONFIG, TimerState } from '../../shared/types'
import { useToast, ToastContainer } from '../components/Toast'

const ipc = () => window.electron?.ipcRenderer

interface WeekComparison {
  thisWeek: { stand: number; walk: number; walkDuration: number; water: number }
  lastWeek: { stand: number; walk: number; walkDuration: number; water: number }
}

interface WalkStatus {
  isWalking: boolean
  startTime?: number
}

interface AppContextType {
  config: AppConfig
  records: ActionRecord[]
  stats: DailyStats[]
  timerState: TimerState
  walkStatus: WalkStatus
  streakDays: number
  weekComparison: WeekComparison | null
  refreshConfig: () => Promise<void>
  saveConfig: (config: AppConfig) => Promise<void>
  refreshRecords: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshStreak: () => Promise<void>
  refreshWeekComparison: () => Promise<void>
  clearAllData: () => Promise<void>
  addToast: (message: string) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [records, setRecords] = useState<ActionRecord[]>([])
  const [stats, setStats] = useState<DailyStats[]>([])
  const [streakDays, setStreakDays] = useState<number>(0)
  const [weekComparison, setWeekComparison] = useState<WeekComparison | null>(null)
  const [timerState, setTimerState] = useState<TimerState>({
    workTimerMs: 0,
    isWorking: false,
    isWalking: false,
    remindIntervalMs: 30 * 60 * 1000
  })
  const [walkStatus, setWalkStatus] = useState<WalkStatus>({ isWalking: false })
  const { toasts, addToast, removeToast } = useToast()
  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await ipc()?.invoke('get-config')
      if (cfg) setConfig(cfg as AppConfig)
    } catch {}
  }, [])

  const saveConfig = useCallback(async (newConfig: AppConfig) => {
    try {
      await ipc()?.invoke('save-config', newConfig)
      setConfig(newConfig)
    } catch {}
  }, [])

  const refreshStreak = useCallback(async () => {
    try {
      const d = await ipc()?.invoke('get-streak-days')
      if (typeof d === 'number') setStreakDays(d)
    } catch {}
  }, [])

  const refreshWeekComparison = useCallback(async () => {
    try {
      const w = await ipc()?.invoke('get-week-comparison')
      if (w) setWeekComparison(w as WeekComparison)
    } catch {}
  }, [])

  const refreshRecords = useCallback(async () => {
    try {
      const recs = await ipc()?.invoke('get-records')
      if (recs) setRecords(recs as ActionRecord[])
    } catch {}
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const s = await ipc()?.invoke('get-stats', 7)
      if (s) setStats(s as DailyStats[])
    } catch {}
  }, [])

  const clearAllData = useCallback(async () => {
    try {
      await ipc()?.invoke('clear-all-data')
      setRecords([])
      setStats([])
    } catch {}
  }, [])

  useEffect(() => {
    refreshConfig()
    refreshRecords()
    refreshStats()
    refreshStreak()
    refreshWeekComparison()

    const unsub = ipc()?.on('timer-tick', (state: unknown) => {
      if (state) setTimerState(state as TimerState)
    })
    return () => {
      unsub?.()
    }
  }, [refreshConfig, refreshRecords, refreshStats, refreshStreak, refreshWeekComparison])

  useEffect(() => {
    const unsub = ipc()?.on('action-toast', (data: unknown) => {
      const d = data as { message: string }
      if (d?.message) addToast(d.message)
    })
    return () => unsub?.()
  }, [addToast])

  useEffect(() => {
    const unsub = ipc()?.on('walk-status', (data: unknown) => {
      const d = data as WalkStatus
      if (d) setWalkStatus(d)
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    const unsub = ipc()?.on('records-updated', () => {
      refreshRecords()
      refreshStats()
      refreshStreak()
      refreshWeekComparison()
    })
    return () => unsub?.()
  }, [refreshRecords, refreshStats, refreshStreak, refreshWeekComparison])

  return (
    <AppContext.Provider
      value={{
        config,
        records,
        stats,
        timerState,
        walkStatus,
        streakDays,
        weekComparison,
        refreshConfig,
        saveConfig,
        refreshRecords,
        refreshStats,
        refreshStreak,
        refreshWeekComparison,
        clearAllData,
        addToast
      }}
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
