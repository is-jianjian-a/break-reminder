export type ActionType = 'stand' | 'walk' | 'water'

export interface WorkPeriod {
  id: string
  start: string
  end: string
}

export interface AppConfig {
  workPeriods: WorkPeriod[]
  remindIntervalMin: number
  weakToStrongDelaySec: number
  soundEnabled: boolean
  enabledDays: number[]
}

export interface ActionRecord {
  id: string
  type: ActionType
  timestamp: number
  durationSec?: number
}

export const DEFAULT_CONFIG: AppConfig = {
  workPeriods: [
    { id: '1', start: '09:00', end: '12:30' },
    { id: '2', start: '14:00', end: '18:00' },
    { id: '3', start: '19:00', end: '20:30' }
  ],
  remindIntervalMin: 30,
  weakToStrongDelaySec: 60,
  soundEnabled: true,
  enabledDays: [1, 2, 3, 4, 5]
}

export interface DailyStats {
  date: string
  standCount: number
  walkCount: number
  walkDurationSec: number
  waterCount: number
}

export const ACTION_LABELS: Record<ActionType, string> = {
  stand: '站一站',
  walk: '走一走',
  water: '装个水'
}

export interface TimerState {
  workTimerMs: number
  isWorking: boolean
  isWalking: boolean
  remindIntervalMs: number
}

export const ACTION_ICONS: Record<ActionType, string> = {
  stand: '🧍',
  walk: '🚶',
  water: '🥤'
}
