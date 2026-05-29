import { app, BrowserWindow, ipcMain, screen, shell, globalShortcut } from 'electron'
import { execSync, spawn } from 'node:child_process'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { TimerEngine } from './timer-engine'
import { NotificationManager } from './notification-manager'
import { StoreService } from './store-service'
import { WindowManager } from './window-manager'
import { TrayManager } from './tray-manager'
import { IPCHandler } from './ipc-handler'
import { isWindowDestroyed, safeSend } from './utils'

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
let walkStartTime: number = 0
let walkCheckTimer: ReturnType<typeof setInterval> | null = null
let lastWalkReminderMin: number = 0

function clearRestAutoSkipTimer(): void {
  if (restAutoSkipTimer) {
    clearTimeout(restAutoSkipTimer)
    restAutoSkipTimer = null
  }
}

function startWalkCheck(): void {
  walkStartTime = Date.now()
  lastWalkReminderMin = 0
  if (walkCheckTimer) clearInterval(walkCheckTimer)
  walkCheckTimer = setInterval(() => {
    if (isQuitting || !walkStartTime) return
    if (restWindow && !isWindowDestroyed(restWindow) && !restWindow.isVisible()) {
      restWindow.show()
      restWindow.focus()
    }
    const elapsed = Math.floor((Date.now() - walkStartTime) / 60000)
    if (elapsed > 0 && elapsed % 20 === 0 && elapsed !== lastWalkReminderMin) {
      lastWalkReminderMin = elapsed
      if (Notification.isSupported()) {
        const n = new Notification({
          title: '🚶 走了好久啦！',
          body: `已经走了 ${elapsed} 分钟，回来了吗？点击打开主界面`,
          sound: true
        })
        n.on('click', () => {
          showMainWindow()
        })
        n.show()
      }
    }
  }, 10000)
}

function stopWalkCheck(): void {
  walkStartTime = 0
  lastWalkReminderMin = 0
  if (walkCheckTimer) {
    clearInterval(walkCheckTimer)
    walkCheckTimer = null
  }
}

function startRestAutoSkipTimer(): void {
  clearRestAutoSkipTimer()
  restAutoSkipTimer = setTimeout(() => {
    if (isQuitting) return
    if (restWindow && !isWindowDestroyed(restWindow) && restWindow.isVisible()) {
      notificationManager.dismissReminder(restWindow)
      timerEngine.resetWorkTimer()
      safeSend(mainWindow, 'action-toast', { message: '休息超时，已自动跳过' })
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
    safeSend(restWindow, 'show-rest-mode')
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
  stopWalkCheck()
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
    if (!isQuitting) {
      safeSend(mainWindow, 'timer-tick', state)
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
      safeSend(mainWindow, 'action-toast', { message: '已跳过本次休息' })
      return
    }

    if (data.waterChecked) {
      storeService.addRecord({ type: 'water', timestamp: Date.now() })
      safeSend(mainWindow, 'action-toast', { message: '🥤 已记录装个水' })
      safeSend(mainWindow, 'records-updated')
    }

    if (data.action === 'stand') {
      clearRestAutoSkipTimer()
      storeService.addRecord({ type: 'stand', timestamp: Date.now() })
      if (restWindow && !isWindowDestroyed(restWindow)) {
        notificationManager.dismissReminder(restWindow)
      }
      timerEngine.resetWorkTimer()
      safeSend(mainWindow, 'action-toast', { message: '✅ 已记录站一站' })
      safeSend(mainWindow, 'records-updated')
    } else if (data.action === 'walk') {
      clearRestAutoSkipTimer()
      timerEngine.pauseForWalk()
      startWalkCheck()
      safeSend(restWindow, 'walk-started')
      safeSend(mainWindow, 'walk-status', { isWalking: true, startTime: Date.now() })
      if (restWindow && !isWindowDestroyed(restWindow)) {
        restWindow.show()
        restWindow.focus()
      }
    }
  })

  ipcMain.on('display-sleep', () => {
    try {
      const child = spawn('pmset', ['displaysleepnow'], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env }
      })
      child.unref()
    } catch (e) {
      console.error('display-sleep spawn failed:', e)
      try {
        execSync('pmset displaysleepnow')
      } catch (e2) {
        console.error('display-sleep execSync failed:', e2)
      }
    }
  })

  ipcMain.on('walk-complete', (_event, durationSec: number) => {
    clearRestAutoSkipTimer()
    stopWalkCheck()
    const walkStartTime = Date.now() - durationSec * 1000
    storeService.addRecord({ type: 'walk', timestamp: walkStartTime, durationSec })
    timerEngine.resumeFromWalk()
    if (restWindow && !isWindowDestroyed(restWindow)) {
      notificationManager.dismissReminder(restWindow)
    }
    timerEngine.resetWorkTimer()
    safeSend(mainWindow, 'action-toast', { message: '🚶 已记录走一走' })
    safeSend(mainWindow, 'walk-status', { isWalking: false })
    safeSend(mainWindow, 'records-updated')
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
