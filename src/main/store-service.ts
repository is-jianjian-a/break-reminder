import ElectronStore from 'electron-store'
import { randomUUID } from 'crypto'
import { AppConfig, ActionRecord, DailyStats, DEFAULT_CONFIG } from '../shared/types'

interface StoreSchema {
  config: AppConfig
  records: ActionRecord[]
}

const Store = (ElectronStore as unknown as { default: typeof ElectronStore }).default || ElectronStore

export class StoreService {
  private store: InstanceType<typeof ElectronStore<StoreSchema>>

  constructor() {
    this.store = new (Store as new (opts: ElectronStore.Options<StoreSchema>) => InstanceType<typeof ElectronStore<StoreSchema>>)({
      name: 'break-reminder',
      defaults: {
        config: DEFAULT_CONFIG,
        records: []
      }
    })
  }

  getConfig(): AppConfig {
    const config = this.store.get('config', DEFAULT_CONFIG)
    if (!config.enabledDays) {
      config.enabledDays = DEFAULT_CONFIG.enabledDays
    }
    return config
  }

  saveConfig(config: AppConfig): void {
    this.store.set('config', config)
  }

  getRecords(): ActionRecord[] {
    return this.store.get('records', [])
  }

  addRecord(record: Omit<ActionRecord, 'id'>): ActionRecord {
    const newRecord: ActionRecord = {
      id: randomUUID(),
      ...record
    }
    const records = this.getRecords()
    records.push(newRecord)
    this.store.set('records', records)
    return newRecord
  }

  getStats(days: number): DailyStats[] {
    const records = this.getRecords()
    const now = new Date()
    const stats: DailyStats[] = []

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayRecords = records.filter((r) => {
        const recordDate = new Date(r.timestamp).toISOString().split('T')[0]
        return recordDate === dateStr
      })

      stats.push({
        date: dateStr,
        standCount: dayRecords.filter((r) => r.type === 'stand').length,
        walkCount: dayRecords.filter((r) => r.type === 'walk').length,
        walkDurationSec: dayRecords
          .filter((r) => r.type === 'walk')
          .reduce((sum, r) => sum + (r.durationSec || 0), 0),
        waterCount: dayRecords.filter((r) => r.type === 'water').length
      })
    }

    return stats
  }

  getStreakDays(): number {
    const records = this.getRecords()
    const now = new Date()
    let streak = 0

    for (let i = 0; ; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const hasRecord = records.some((r) => {
        const recordDate = new Date(r.timestamp).toISOString().split('T')[0]
        return recordDate === dateStr
      })

      if (hasRecord) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  getWeekComparison(): {
    thisWeek: { stand: number; walk: number; walkDuration: number; water: number }
    lastWeek: { stand: number; walk: number; walkDuration: number; water: number }
  } {
    const records = this.getRecords()
    const now = new Date()

    const getRangeStats = (startOffset: number, endOffset: number) => {
      const rangeRecords = records.filter((r) => {
        const recordDate = new Date(r.timestamp)
        const start = new Date(now)
        start.setDate(start.getDate() - startOffset)
        start.setHours(0, 0, 0, 0)
        const end = new Date(now)
        end.setDate(end.getDate() - endOffset)
        end.setHours(23, 59, 59, 999)
        return recordDate >= start && recordDate <= end
      })

      return {
        stand: rangeRecords.filter((r) => r.type === 'stand').length,
        walk: rangeRecords.filter((r) => r.type === 'walk').length,
        walkDuration: rangeRecords.filter((r) => r.type === 'walk').reduce((sum, r) => sum + (r.durationSec || 0), 0),
        water: rangeRecords.filter((r) => r.type === 'water').length
      }
    }

    return {
      thisWeek: getRangeStats(6, 0),
      lastWeek: getRangeStats(13, 7)
    }
  }

  updateRecord(id: string, updates: Partial<Pick<ActionRecord, 'durationSec'>>): void {
    const records = this.getRecords()
    const index = records.findIndex((r) => r.id === id)
    if (index !== -1) {
      records[index] = { ...records[index], ...updates }
      this.store.set('records', records)
    }
  }

  deleteRecord(id: string): void {
    const records = this.getRecords().filter((r) => r.id !== id)
    this.store.set('records', records)
  }

  clearAllData(): void {
    this.store.set('records', [])
  }

  exportData(): string {
    return JSON.stringify(
      {
        config: this.getConfig(),
        records: this.getRecords()
      },
      null,
      2
    )
  }
}
