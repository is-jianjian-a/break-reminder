import { BrowserWindow } from 'electron'

export function isWindowDestroyed(win: BrowserWindow | null): boolean {
  if (!win) return true
  const v = win.isDestroyed
  if (typeof v === 'function') return v.call(win)
  return !!v
}
