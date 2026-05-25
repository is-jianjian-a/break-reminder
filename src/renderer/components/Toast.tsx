import { useEffect, useState } from 'react'

interface ToastItem {
  id: number
  message: string
  icon: string
}

let toastId = 0

const iconMap: Record<string, string> = {
  '站一站': '🧍',
  '走一走': '🚶',
  '装个水': '🥤',
  '喝水': '🥤',
  '跳过': '⏭️',
  '超时': '⏰',
}

function getIcon(message: string): string {
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (message.includes(keyword)) {
      return icon
    }
  }
  return '✅'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (message: string) => {
    const id = ++toastId
    const icon = getIcon(message)
    setToasts((prev) => [...prev, { id, message, icon }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, removeToast }
}

export function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: number) => void }) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-card)] text-[var(--color-text)] rounded-xl shadow-lg border border-[var(--color-border)] text-sm font-medium animate-fade-in cursor-pointer hover:shadow-xl hover:scale-102 transition-all duration-200"
        >
          <span className="text-lg">{toast.icon}</span>
          <span>{toast.message}</span>
          <span className="ml-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">×</span>
        </div>
      ))}
    </div>
  )
}
