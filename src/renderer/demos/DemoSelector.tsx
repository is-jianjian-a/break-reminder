import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DemoSelector() {
  const navigate = useNavigate()

  const demos = [
    { id: 1, name: '版本 A - 经典深色玻璃', desc: '深色背景 + 半透明白玻璃' },
    { id: 2, name: '版本 B - 半透明浅色', desc: '浅色背景 + 半透明白玻璃' },
    { id: 3, name: '版本 C - 模糊强玻璃', desc: '高模糊 + 渐变阴影' },
    { id: 4, name: '版本 D - 简洁玻璃', desc: '轻薄玻璃 + 简洁边框' },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text)]">🎨 磨玻璃效果 Demo</h2>
        <button
          onClick={() => navigate('/')}
          className="text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          返回
        </button>
      </div>

      <div className="space-y-3">
        {demos.map((demo) => (
          <button
            key={demo.id}
            onClick={() => navigate(`/demo/${demo.id}`)}
            className="w-full text-left bg-[var(--color-surface-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)] hover:border-indigo-400 transition-all"
          >
            <div className="text-sm font-semibold text-[var(--color-text)]">{demo.name}</div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">{demo.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
