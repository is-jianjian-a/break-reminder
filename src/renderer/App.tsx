import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import Navigation from './components/Navigation'
import DemoSelector from './demos/DemoSelector'
import Demo1 from './demos/Demo1'
import Demo2 from './demos/Demo2'
import Demo3 from './demos/Demo3'
import Demo4 from './demos/Demo4'
import Demo5 from './demos/Demo5'

function AppContent() {
  const navigate = useNavigate()
  const handleQuit = () => {
    window.electron?.ipcRenderer.send('quit-app')
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-surface)]">
      <div className="h-6 flex-shrink-0 flex items-center justify-end px-3" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className="text-[10px] text-[var(--color-text-secondary)] opacity-50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>v1.10</span>
      </div>
      <div className="flex-shrink-0 flex justify-center -mt-1">
        <svg width="12" height="6" viewBox="0 0 12 6" className="fill-[var(--color-surface-card)]">
          <path d="M0 6 L6 0 L12 6 Z" />
        </svg>
      </div>
      <Navigation />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/demo" element={<DemoSelector />} />
          <Route path="/demo/1" element={<Demo1 />} />
          <Route path="/demo/2" element={<Demo2 />} />
          <Route path="/demo/3" element={<Demo3 />} />
          <Route path="/demo/4" element={<Demo4 />} />
          <Route path="/demo/5" element={<Demo5 />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <div className="flex-shrink-0 p-3 border-t border-[var(--color-border)] space-y-2">
        <button
          onClick={() => navigate('/demo')}
          className="w-full py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
        >
          🎨 Demo 磨玻璃效果预览
        </button>
        <button
          onClick={handleQuit}
          className="w-full py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          退出 Break Reminder
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
