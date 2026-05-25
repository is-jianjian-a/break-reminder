import { ipcMain, dialog, BrowserWindow } from 'electron'
import { StoreService } from './store-service'
import { AppConfig, ActionRecord } from '../shared/types'
import { isWindowDestroyed } from './utils'

export class IPCHandler {
  private mainWindow: BrowserWindow | null = null

  constructor(private storeService: StoreService) {
    this.registerHandlers()
  }

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  private notifyRecordsUpdated(): void {
    if (this.mainWindow && !isWindowDestroyed(this.mainWindow)) {
      this.mainWindow.webContents.send('records-updated')
    }
  }

  private registerHandlers(): void {
    ipcMain.handle('get-config', () => {
      return this.storeService.getConfig()
    })

    ipcMain.handle('save-config', (_event, config: AppConfig) => {
      this.storeService.saveConfig(config)
    })

    ipcMain.handle('get-records', () => {
      return this.storeService.getRecords()
    })

    ipcMain.handle('add-record', (_event, record) => {
      const result = this.storeService.addRecord(record)
      this.notifyRecordsUpdated()
      return result
    })

    ipcMain.handle('update-record', (_event, data: { id: string; updates: Partial<Pick<ActionRecord, 'durationSec'>> }) => {
      this.storeService.updateRecord(data.id, data.updates)
      this.notifyRecordsUpdated()
    })

    ipcMain.handle('add-water', () => {
      this.storeService.addRecord({ type: 'water', timestamp: Date.now() })
      this.notifyRecordsUpdated()
    })

    ipcMain.handle('get-stats', (_event, days: number) => {
      return this.storeService.getStats(days)
    })

    ipcMain.handle('get-streak-days', () => {
      return this.storeService.getStreakDays()
    })

    ipcMain.handle('get-week-comparison', () => {
      return this.storeService.getWeekComparison()
    })

    ipcMain.handle('delete-record', (_event, id: string) => {
      this.storeService.deleteRecord(id)
      this.notifyRecordsUpdated()
    })

    ipcMain.handle('clear-all-data', () => {
      this.storeService.clearAllData()
      this.notifyRecordsUpdated()
    })

    ipcMain.handle('export-data', async () => {
      const data = this.storeService.exportData()
      const result = await dialog.showSaveDialog({
        title: '导出数据',
        defaultPath: 'break-reminder-data.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (!result.canceled && result.filePath) {
        const fs = await import('fs/promises')
        await fs.writeFile(result.filePath, data, 'utf-8')
        return true
      }
      return false
    })
  }
}
