import { EventEmitter } from 'events'
import { AppConfig, DEFAULT_CONFIG, WorkPeriod, TimerState } from '../shared/types'

export class TimerEngine extends EventEmitter {
  private workTimerMs: number = 0
  private intervalId: NodeJS.Timeout | null = null
  private isWorking: boolean = false
  private isWalking: boolean = false
  private config: AppConfig
  private lastStatus: 'green' | 'yellow' | 'red' = 'green'
  onTick: ((state: TimerState) => void) | null = null
  onStatusChange: ((status: 'green' | 'yellow' | 'red') => void) | null = null

  constructor(private getConfigFn: { getConfig: () => AppConfig }) {
    super()
    this.config = getConfigFn.getConfig() || DEFAULT_CONFIG
    this.start()
  }

  private start(): void {
    this.intervalId = setInterval(() => this.tick(), 1000)
  }

  private tick(): void {
    const now = new Date()
    const inWorkPeriod = this.isInWorkPeriod(now)

    if (inWorkPeriod) {
      if (!this.isWorking) {
        this.isWorking = true
      }
      if (!this.isWalking) {
        this.workTimerMs += 1000

        if (this.workTimerMs >= this.config.remindIntervalMin * 60 * 1000) {
          this.emit('remind')
          this.workTimerMs = 0
        }
      }
    } else {
      if (this.isWorking) {
        this.isWorking = false
        this.workTimerMs = 0
      }
    }

    this.onTick?.({
      workTimerMs: this.workTimerMs,
      isWorking: this.isWorking,
      isWalking: this.isWalking,
      remindIntervalMs: this.config.remindIntervalMin * 60 * 1000
    })

    let newStatus: 'green' | 'yellow' | 'red' = 'green'
    if (this.isWalking || !this.isWorking) {
      newStatus = 'green'
    } else if (this.workTimerMs >= (this.config.remindIntervalMin - 5) * 60 * 1000) {
      newStatus = 'yellow'
    }

    if (newStatus !== this.lastStatus) {
      this.lastStatus = newStatus
      this.onStatusChange?.(newStatus)
    }
  }

  private isInWorkPeriod(now: Date): boolean {
    const day = now.getDay()
    if (!this.config.enabledDays.includes(day)) return false

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const currentSeconds = currentMinutes * 60 + now.getSeconds()

    for (const period of this.config.workPeriods) {
      const startSec = this.timeToSeconds(period.start)
      const endSec = this.timeToSeconds(period.end)
      if (currentSeconds >= startSec && currentSeconds < endSec) {
        return true
      }
    }
    return false
  }

  private timeToSeconds(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 3600 + m * 60
  }

  resetWorkTimer(): void {
    this.workTimerMs = 0
  }

  pauseForWalk(): void {
    this.isWalking = true
  }

  resumeFromWalk(): void {
    this.isWalking = false
  }

  reloadConfig(): void {
    this.config = this.getConfigFn.getConfig() || DEFAULT_CONFIG
  }

  getWorkTimerMs(): number {
    return this.workTimerMs
  }

  getIsWorking(): boolean {
    return this.isWorking
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
