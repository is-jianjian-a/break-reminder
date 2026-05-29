import { BrowserWindow } from 'electron'

export function isWindowDestroyed(win: BrowserWindow | null): boolean {
  if (!win) return true
  const v = win.isDestroyed
  if (typeof v === 'function') return v.call(win)
  return !!v
}

export function safeSend(win: BrowserWindow | null, channel: string, ...args: unknown[]): void {
  if (!win || isWindowDestroyed(win)) return
  try {
    win.webContents.send(channel, ...args)
  } catch {
    // Render frame may be disposed before WebFrameMain could be accessed
  }
}
