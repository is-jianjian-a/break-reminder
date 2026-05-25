import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { WorkPeriod } from '../../shared/types'

export default function Settings() {
  const { config, saveConfig, clearAllData } = useApp()
  const [localConfig, setLocalConfig] = useState(config)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await saveConfig(localConfig)
    timerEngineReloadConfig()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const timerEngineReloadConfig = () => {
    window.electron?.ipcRenderer.send('reload-config')
  }

  const addPeriod = () => {
    const newPeriod: WorkPeriod = {
      id: Date.now().toString(),
      start: '09:00',
      end: '12:00'
    }
    setLocalConfig({ ...localConfig, workPeriods: [...localConfig.workPeriods, newPeriod] })
  }

  const removePeriod = (id: string) => {
    setLocalConfig({
      ...localConfig,
      workPeriods: localConfig.workPeriods.filter((p) => p.id !== id)
    })
  }

  const updatePeriod = (id: string, field: 'start' | 'end', value: string) => {
    setLocalConfig({
      ...localConfig,
      workPeriods: localConfig.workPeriods.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    })
  }

  const handleClear = async () => {
    const confirmed = window.confirm('确定要清除所有数据吗？此操作不可恢复。')
    if (confirmed) {
      await clearAllData()
    }
  }

  const handleExport = async () => {
    try {
      await window.electron?.ipcRenderer.invoke('export-data')
    } catch {}
  }

  return (
    <div className="p-5 space-y-6">
      <h2 className="text-lg font-bold text-[var(--color-text)]">⚙️ 设置</h2>

      <div className="bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)] space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">提醒日</h3>
        <div className="flex gap-1.5">
          {['日', '一', '二', '三', '四', '五', '六'].map((label, i) => (
            <button
              key={i}
              onClick={() => {
                const days = localConfig.enabledDays?.includes(i)
                  ? localConfig.enabledDays.filter((d) => d !== i)
                  : [...(localConfig.enabledDays || []), i]
                setLocalConfig({ ...localConfig, enabledDays: days.sort() })
              }}
              className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                localConfig.enabledDays?.includes(i)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)] space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">工作时段</h3>
        {localConfig.workPeriods.map((period) => (
          <div key={period.id} className="flex items-center gap-2">
            <input
              type="time"
              value={period.start}
              onChange={(e) => updatePeriod(period.id, 'start', e.target.value)}
              className="border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-[var(--color-surface-card)] text-[var(--color-text)]"
            />
            <span className="text-[var(--color-text-secondary)]">—</span>
            <input
              type="time"
              value={period.end}
              onChange={(e) => updatePeriod(period.id, 'end', e.target.value)}
              className="border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-[var(--color-surface-card)] text-[var(--color-text)]"
            />
            <button
              onClick={() => removePeriod(period.id)}
              className="text-red-400 hover:text-red-600 text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addPeriod}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          + 添加时段
        </button>
      </div>

      <div className="bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--color-text)]">提醒间隔</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="5"
              max="120"
              value={localConfig.remindIntervalMin}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, remindIntervalMin: Number(e.target.value) })
              }
              className="w-16 border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-[var(--color-surface-card)] text-[var(--color-text)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">分钟</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--color-text)]">弱→强等待</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="10"
              max="300"
              value={localConfig.weakToStrongDelaySec}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, weakToStrongDelaySec: Number(e.target.value) })
              }
              className="w-16 border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-[var(--color-surface-card)] text-[var(--color-text)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">秒</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--color-text)]">声音提醒</label>
          <button
            onClick={() =>
              setLocalConfig({ ...localConfig, soundEnabled: !localConfig.soundEnabled })
            }
            className={`relative w-10 h-5 rounded-full transition-colors ${
              localConfig.soundEnabled ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                localConfig.soundEnabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--color-text)]">快捷键</label>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-text-secondary)] font-mono">
              {localConfig.shortcutKey || 'CmdOrCtrl+Shift+B'}
            </kbd>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-white font-medium transition-all shadow-md ${
          saved ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {saved ? '✓ 已保存' : '保存设置'}
      </button>

      <div className="flex gap-3">
        <button
          onClick={handleExport}
          className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          导出数据
        </button>
        <button
          onClick={handleClear}
          className="flex-1 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          清除所有数据
        </button>
      </div>
    </div>
  )
}
