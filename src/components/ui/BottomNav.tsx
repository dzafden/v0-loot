import { Compass, Package, Trophy, User, type LucideIcon } from 'lucide-react'

export type Tab = 'discover' | 'collection' | 'rankings' | 'profile'

interface TabDef {
  id: Tab
  Icon: LucideIcon
  badge?: number | string | null
}

interface Props {
  active: Tab
  onChange: (t: Tab) => void
  unsortedCount?: number
  subdued?: boolean
}

export function BottomNav({ active, onChange, unsortedCount = 0, subdued = false }: Props) {
  const TABS: TabDef[] = [
    { id: 'discover', Icon: Compass },
    { id: 'collection', Icon: Package },
    { id: 'rankings', Icon: Trophy, badge: unsortedCount > 0 ? '!' : null },
    { id: 'profile', Icon: User },
  ]

  return (
    <nav className={`fixed left-1/2 -translate-x-1/2 rounded-full border border-white/[0.07] grid grid-cols-4 gap-1 shadow-[0_18px_54px_rgba(0,0,0,0.65)] z-40 transition-all duration-300 ${subdued ? 'bottom-3 w-[64%] max-w-[250px] bg-black/16 p-1 opacity-45 backdrop-blur-xl' : 'bottom-5 w-[78%] max-w-[320px] bg-black/28 p-1.5 opacity-100 backdrop-blur-2xl'}`}>
      {TABS.map(({ id, Icon, badge }) => {
        const isActive = active === id
        const numericBadge = typeof badge === 'number' ? Math.min(badge, 99) : badge
        const isAlertBadge = badge === '!'

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`relative ${subdued ? 'h-10' : 'h-12'} rounded-full grid place-items-center transition-all duration-300 ${
              isActive ? 'text-white' : 'hover:bg-white/[0.05]'
            }`}
            aria-label={id}
          >
            {isActive && (
              <span className="absolute inset-1 rounded-full bg-white/[0.08] shadow-[0_0_28px_rgba(245,196,83,0.24)]" />
            )}
            <Icon
              size={21}
              strokeWidth={isActive ? 2.4 : 2.1}
              className={`relative z-10 transition-colors duration-300 ${
                isActive
                  ? 'text-[#f5c453] drop-shadow-[0_0_12px_rgba(245,196,83,0.5)]'
                  : 'text-white/38'
              }`}
            />
            {isActive && (
              <div className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[#f5c453]/95 shadow-[0_0_10px_rgba(245,196,83,0.75)]" />
            )}
            {badge && !isActive && (
              <div
                className={`absolute top-1.5 right-2 ${
                  isAlertBadge
                    ? 'h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#14141c]'
                    : 'min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full ring-2 ring-[#14141c] flex items-center justify-center text-[10px] font-black text-white'
                }`}
              >
                {!isAlertBadge ? numericBadge : null}
              </div>
            )}
          </button>
        )
      })}
    </nav>
  )
}
