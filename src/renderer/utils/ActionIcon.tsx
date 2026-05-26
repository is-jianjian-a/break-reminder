import { PersonStanding, Footprints, Droplets, type LucideProps } from 'lucide-react'
import { ActionType } from '../../shared/types'

const ICON_MAP: Record<ActionType, React.ComponentType<LucideProps>> = {
  stand: PersonStanding,
  walk: Footprints,
  water: Droplets
}

const ICON_COLORS: Record<ActionType, string> = {
  stand: 'text-indigo-500',
  walk: 'text-emerald-500',
  water: 'text-amber-500'
}

export function ActionIcon({ type, size = 16, className = '' }: { type: ActionType; size?: number; className?: string }) {
  const Icon = ICON_MAP[type]
  return <Icon size={size} className={`${ICON_COLORS[type]} ${className}`} />
}

export { ICON_MAP, ICON_COLORS }
