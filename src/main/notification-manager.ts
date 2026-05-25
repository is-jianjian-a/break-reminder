import { BrowserWindow, Notification } from 'electron'
import { AppConfig } from '../shared/types'
import { isWindowDestroyed } from './utils'

export class NotificationManager {
  private weakTimeout: NodeJS.Timeout | null = null
  private isReminding: boolean = false
  private destroyed: boolean = false
  onRemindStatusChange: ((status: 'green' | 'yellow' | 'red') => void) | null = null
  onShowRestWindow: (() => void) | null = null

  startWeakReminder(
    mainWindow: BrowserWindow | null,
    restWindow: BrowserWindow | null,
    config: AppConfig
  ): void {
    if (this.destroyed) return
    if (this.isReminding) {
      this.dismissReminder(restWindow)
    }
    this.isReminding = true
    this.onRemindStatusChange?.('red')

    if (Notification.isSupported()) {
      const notification = new Notification({
        title: '⏰ 该休息一下啦！',
        body: '你已经工作了一段时间，起来活动活动吧',
        sound: config.soundEnabled
      })

      notification.on('click', () => {
        if (this.destroyed) return
        this.clearWeakTimeout()
        if (this.onShowRestWindow) {
          this.onShowRestWindow()
        } else {
          this.showRestWindow(restWindow)
        }
      })

      notification.show()
    }

    this.weakTimeout = setTimeout(() => {
      if (this.destroyed) return
      if (this.onShowRestWindow) {
        this.onShowRestWindow()
      } else {
        this.showRestWindow(restWindow)
      }
    }, config.weakToStrongDelaySec * 1000)
  }

  private sendShowRestMode(restWindow: BrowserWindow): void {
    const send = () => {
      if (isWindowDestroyed(restWindow)) return
      restWindow.webContents.send('show-rest-mode')
    }
    if (restWindow.webContents.isLoading()) {
      restWindow.webContents.once('did-finish-load', send)
    } else {
      send()
    }
  }

  private showRestWindow(restWindow: BrowserWindow | null): void {
    if (!restWindow || isWindowDestroyed(restWindow)) return
    restWindow.center()
    restWindow.show()
    restWindow.focus()
    this.sendShowRestMode(restWindow)
  }

  showRestWindowDirectly(restWindow: BrowserWindow | null): void {
    this.showRestWindow(restWindow)
  }

  dismissReminder(restWindow: BrowserWindow | null): void {
    this.isReminding = false
    this.clearWeakTimeout()
    this.onRemindStatusChange?.('green')
    if (restWindow && !isWindowDestroyed(restWindow)) {
      restWindow.hide()
    }
  }

  private clearWeakTimeout(): void {
    if (this.weakTimeout) {
      clearTimeout(this.weakTimeout)
      this.weakTimeout = null
    }
  }

  destroy(): void {
    this.destroyed = true
    this.clearWeakTimeout()
    this.isReminding = false
  }
}
