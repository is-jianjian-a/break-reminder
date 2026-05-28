import { BrowserWindow, shell, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { isWindowDestroyed } from './utils'

export class WindowManager {
  createMainWindow(isQuitting: () => boolean): BrowserWindow {
    const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

    const mainWindow = new BrowserWindow({
      width: 560,
      height: screenHeight,
      show: false,
      resizable: false,
      frame: false,
      transparent: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    mainWindow.on('close', (e) => {
      if (isQuitting()) return
      e.preventDefault()
      mainWindow.hide()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return mainWindow
  }

  createRestWindow(isQuitting: () => boolean): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    const restWindow = new BrowserWindow({
      width,
      height,
      show: false,
      resizable: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: false,
      vibrancy: 'under-window',
      hasShadow: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    restWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    restWindow.setBounds({ x: 0, y: 0, width, height })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      restWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/rest')
    } else {
      restWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/rest' })
    }

    restWindow.on('close', (e) => {
      if (isQuitting()) return
      e.preventDefault()
      restWindow.hide()
    })

    return restWindow
  }
}
