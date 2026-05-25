import { NavLink } from 'react-router-dom'

export default function Navigation() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 text-center py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
    }`

  return (
    <nav className="flex border-b border-[var(--color-border)] bg-[var(--color-surface-card)] pt-8">
      <NavLink to="/" className={linkClass} end>
        📊 统计
      </NavLink>
      <NavLink to="/history" className={linkClass}>
        📅 记录
      </NavLink>
      <NavLink to="/settings" className={linkClass}>
        ⚙️ 设置
      </NavLink>
    </nav>
  )
}
