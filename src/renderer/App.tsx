import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import Navigation from './components/Navigation'

export default function App() {
  const handleQuit = () => {
    window.electron?.ipcRenderer.send('quit-app')
  }

  return (
    <AppProvider>
      <div className="flex flex-col h-screen bg-[var(--color-surface)]">
        <div className="h-6 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
        <Navigation />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <div className="flex-shrink-0 p-3 border-t border-[var(--color-border)]">
          <button
            onClick={handleQuit}
            className="w-full py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            退出 Break Reminder
          </button>
        </div>
      </div>
    </AppProvider>
  )
}
