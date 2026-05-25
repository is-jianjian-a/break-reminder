import { Tray, nativeImage, BrowserWindow } from 'electron'
import { isWindowDestroyed } from './utils'

function createTrayIcon(): nativeImage {
  const size = 22
  const buf = Buffer.alloc(size * size * 4, 0)
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.32

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4

      if (dist <= outerR && dist >= innerR) {
        const alpha = dist > outerR - 1 ? Math.round(255 * Math.max(0, 1 - (dist - outerR + 1))) : 255
        buf[i] = 0
        buf[i + 1] = 0
        buf[i + 2] = 0
        buf[i + 3] = alpha
      }
    }
  }

  const handLen = innerR * 0.7
  for (let t = -1; t <= 1; t++) {
    for (let d = 0; d <= handLen; d++) {
      const px = Math.round(cx + t)
      const py = Math.round(cy - d)
      if (px >= 0 && px < size && py >= 0 && py < size) {
        const i = (py * size + px) * 4
        buf[i] = 0
        buf[i + 1] = 0
        buf[i + 2] = 0
        buf[i + 3] = 255
      }
    }
  }

  const handLen2 = innerR * 0.5
  for (let t = -1; t <= 1; t++) {
    for (let d = 0; d <= handLen2; d++) {
      const px = Math.round(cx + d)
      const py = Math.round(cy + t)
      if (px >= 0 && px < size && py >= 0 && py < size) {
        const i = (py * size + px) * 4
        buf[i] = 0
        buf[i + 1] = 0
        buf[i + 2] = 0
        buf[i + 3] = 255
      }
    }
  }

  const dotR = 1.5
  for (let dy = -dotR; dy <= dotR; dy++) {
    for (let dx = -dotR; dx <= dotR; dx++) {
      if (dx * dx + dy * dy <= dotR * dotR) {
        const px = Math.round(cx + dx)
        const py = Math.round(cy + dy)
        if (px >= 0 && px < size && py >= 0 && py < size) {
          const i = (py * size + px) * 4
          buf[i] = 0
          buf[i + 1] = 0
          buf[i + 2] = 0
          buf[i + 3] = 255
        }
      }
    }
  }

  const img = nativeImage.createFromBuffer(buf, { width: size, height: size })
  return img
}

export class TrayManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  private onShowMainWindow: () => void

  constructor(
    mainWindow: BrowserWindow | null,
    onShowMainWindow: () => void
  ) {
    this.mainWindow = mainWindow
    this.onShowMainWindow = onShowMainWindow
    this.createTray()
  }

  private createTray(): void {
    const icon = createTrayIcon()
    const templateIcon = icon.resize({ width: 16, height: 16 })
    templateIcon.setTemplateImage(true)
    this.tray = new Tray(templateIcon)
    this.tray.setToolTip('Break Reminder - 点击打开')

    this.tray.on('click', () => {
      this.toggleWindow()
    })
  }

  private toggleWindow(): void {
    if (!this.mainWindow || isWindowDestroyed(this.mainWindow)) return
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide()
    } else {
      this.onShowMainWindow()
    }
  }

  updateMainWindow(mainWindow: BrowserWindow | null): void {
    this.mainWindow = mainWindow
  }

  getBounds(): Electron.Rectangle | null {
    if (!this.tray) return null
    return this.tray.getBounds()
  }

  updateIcon(_status: 'green' | 'yellow' | 'red'): void {
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
