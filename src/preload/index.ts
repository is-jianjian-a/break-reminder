import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        'get-config',
        'save-config',
        'get-records',
        'add-record',
        'get-stats',
        'get-streak-days',
        'get-week-comparison',
        'delete-record',
        'clear-all-data',
        'export-data',
        'update-record',
        'add-water'
      ]
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args)
      }
      return Promise.reject(new Error(`Invalid IPC channel: ${channel}`))
    },
    send: (channel: string, ...args: unknown[]) => {
      const validChannels = ['rest-action', 'walk-complete', 'open-main-window', 'trigger-rest-now', 'trigger-remind-now', 'reload-config', 'quit-app', 'display-sleep']
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args)
      }
    },
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const validChannels = ['show-rest-mode', 'walk-started', 'timer-tick', 'walk-status', 'action-toast', 'records-updated']
      if (validChannels.includes(channel)) {
        const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
          callback(...args)
        ipcRenderer.on(channel, subscription)
        return () => ipcRenderer.removeListener(channel, subscription)
      }
      return () => {}
    }
  }
})
