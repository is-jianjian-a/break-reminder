import { app, BrowserWindow, ipcMain, screen, shell, globalShortcut } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { TimerEngine } from './timer-engine'
import { NotificationManager } from './notification-manager'
import { StoreService } from './store-service'
import { WindowManager } from './window-manager'
import { TrayManager } from './tray-manager'
import { IPCHandler } from './ipc-handler'
import { isWindowDestroyed } from './utils'

let mainWindow: BrowserWindow | null = null
let restWindow: BrowserWindow | null = null
let timerEngine: TimerEngine
let notificationManager: NotificationManager
let storeService: StoreService
let windowManager: WindowManager
let trayManager: TrayManager
let ipcHandler: IPCHandler
let isQuitting = false
let restAutoSkipTimer: ReturnType<typeof setTimeout> | null = null

function clearRestAutoSkipTimer(): void {
  if (restAutoSkipTimer) {
    clearTimeout(restAutoSkipTimer)
    restAutoSkipTimer = null
  }
}

function startRestAutoSkipTimer(): void {
  clearRestAutoSkipTimer()
  restAutoSkipTimer = setTimeout(() => {
    if (isQuitting) return
    if (restWindow && !isWindowDestroyed(restWindow) && restWindow.isVisible()) {
      notificationManager.dismissReminder(restWindow)
      timerEngine.resetWorkTimer()
      if (mainWindow && !isWindowDestroyed(mainWindow)) {
        mainWindow.webContents.send('action-toast', { message: '休息超时，已自动跳过' })
      }
    }
    restAutoSkipTimer = null
  }, 5 * 60 * 1000)
}

function getRestWindow(): BrowserWindow {
  if (restWindow && !isWindowDestroyed(restWindow)) {
    return restWindow
  }
  restWindow = windowManager.createRestWindow(() => isQuitting)
  return restWindow
}

function triggerRestNow(): void {
  const rw = getRestWindow()
  rw.show()
  rw.focus()
  if (storeService.getConfig().soundEnabled) { shell.beep() }
  const sendRestMode = () => {
    if (!isWindowDestroyed(restWindow)) {
      restWindow!.webContents.send('show-rest-mode')
    }
  }
  if (rw.webContents.isLoading()) {
    rw.webContents.once('did-finish-load', sendRestMode)
  } else {
    sendRestMode()
  }
  startRestAutoSkipTimer()
}

function triggerRemindNow(): void {
  const mw = !isWindowDestroyed(mainWindow) ? mainWindow : null
  const rw = !isWindowDestroyed(restWindow) ? restWindow : null
  notificationManager.startWeakReminder(mw, rw, storeService.getConfig())
}

function showMainWindow(): void {
  if (mainWindow && !isWindowDestroyed(mainWindow)) {
    positionMainWindow()
    mainWindow.show()
    mainWindow.focus()
  }
}

function positionMainWindow(): void {
  if (!trayManager || !mainWindow) return
  const trayBounds = trayManager.getBounds()
  if (!trayBounds) return
  const windowBounds = mainWindow.getBounds()
  const display = screen.getPrimaryDisplay().workAreaSize
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
  const y = Math.round(trayBounds.y + trayBounds.height + 6)
  const clampedX = Math.max(0, Math.min(x, display.width - windowBounds.width))
  mainWindow.setPosition(clampedX, y)
}

app.on('before-quit', () => {
  isQuitting = true
  globalShortcut.unregisterAll()
  clearRestAutoSkipTimer()
  timerEngine?.destroy()
  notificationManager?.destroy()
  trayManager?.destroy()
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.break-reminder.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  storeService = new StoreService()
  windowManager = new WindowManager()
  notificationManager = new NotificationManager()
  ipcHandler = new IPCHandler(storeService)

  mainWindow = windowManager.createMainWindow(() => isQuitting)
  restWindow = windowManager.createRestWindow(() => isQuitting)

  ipcHandler.setMainWindow(mainWindow)

  trayManager = new TrayManager(mainWindow, showMainWindow)

  timerEngine = new TimerEngine(storeService)

  const shortcutKey = storeService.getConfig().shortcutKey || 'CmdOrCtrl+Shift+B'
  try {
    globalShortcut.register(shortcutKey, () => {
      triggerRestNow()
    })
  } catch {}

  timerEngine.onStatusChange = (_status) => {
  }
  notificationManager.onRemindStatusChange = (_status) => {
  }
  notificationManager.onShowRestWindow = () => {
    triggerRestNow()
  }

  timerEngine.onTick = (state) => {
    if (!isQuitting && mainWindow && !isWindowDestroyed(mainWindow)) {
      mainWindow.webContents.send('timer-tick', state)
    }
  }

  timerEngine.on('remind', () => {
    if (isQuitting) return
    const mw = !isWindowDestroyed(mainWindow) ? mainWindow : null
    const rw = !isWindowDestroyed(restWindow) ? restWindow : null
    notificationManager.startWeakReminder(mw, rw, storeService.getConfig())
  })

  mainWindow.on('blur', () => {
    if (isQuitting) return
    if (mainWindow && !isWindowDestroyed(mainWindow) && mainWindow.isVisible()) {
      mainWindow.hide()
    }
  })

  ipcMain.on('rest-action', (_event, data: { action: string; waterChecked: boolean }) => {
    if (data.action === 'skip') {
      clearRestAutoSkipTimer()
      if (restWindow && !isWindowDestroyed(restWindow)) {
        notificationManager.dismissReminder(restWindow)
      }
      timerEngine.resetWorkTimer()
      if (mainWindow && !isWindowDestroyed(mainWindow)) {
        mainWindow.webContents.send('action-toast', { message: '已跳过本次休息' })
      }
      return
    }

    if (data.waterChecked) {
      storeService.addRecord({ type: 'water', timestamp: Date.now() })
      if (mainWindow && !isWindowDestroyed(mainWindow)) {
        mainWindow.webContents.send('action-toast', { message: '🥤 已记录装个水' })
        mainWindow.webContents.send('records-updated')
      }
    }

    if (data.action === 'stand') {
      clearRestAutoSkipTimer()
      storeService.addRecord({ type: 'stand', timestamp: Date.now() })
      if (restWindow && !isWindowDestroyed(restWindow)) {
        notificationManager.dismissReminder(restWindow)
      }
      timerEngine.resetWorkTimer()
      if (mainWindow && !isWindowDestroyed(mainWindow)) {
        mainWindow.webContents.send('action-toast', { message: '✅ 已记录站一站' })
        mainWindow.webContents.send('records-updated')
      }
    } else if (data.action === 'walk') {
      timerEngine.pauseForWalk()
      if (restWindow && !isWindowDestroyed(restWindow)) {
        restWindow.webContents.send('walk-started')
      }
      if (mainWindow && !isWindowDestroyed(mainWindow)) {
        mainWindow.webContents.send('walk-status', { isWalking: true, startTime: Date.now() })
      }
    }
  })

  ipcMain.on('walk-complete', (_event, durationSec: number) => {
    clearRestAutoSkipTimer()
    storeService.addRecord({ type: 'walk', timestamp: Date.now(), durationSec })
    timerEngine.resumeFromWalk()
    if (restWindow && !isWindowDestroyed(restWindow)) {
      notificationManager.dismissReminder(restWindow)
    }
    timerEngine.resetWorkTimer()
    if (mainWindow && !isWindowDestroyed(mainWindow)) {
      mainWindow.webContents.send('action-toast', { message: '🚶 已记录走一走' })
      mainWindow.webContents.send('walk-status', { isWalking: false })
      mainWindow.webContents.send('records-updated')
    }
  })

  ipcMain.on('open-main-window', () => {
    showMainWindow()
  })

  ipcMain.on('trigger-rest-now', () => {
    triggerRestNow()
  })

  ipcMain.on('trigger-remind-now', () => {
    triggerRemindNow()
  })

  ipcMain.on('reload-config', () => {
    timerEngine.reloadConfig()
    const newShortcut = storeService.getConfig().shortcutKey || 'CmdOrCtrl+Shift+B'
    globalShortcut.unregisterAll()
    try {
      globalShortcut.register(newShortcut, () => {
        triggerRestNow()
      })
    } catch {}
  })

  ipcMain.on('quit-app', () => {
    app.quit()
  })

  app.on('activate', () => {
    showMainWindow()
  })
})

app.on('window-all-closed', () => {
})
