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
    <nav className={`fixed left-1/2 -translate-x-1/2 rounded-full border border-white/[0.085] grid grid-cols-4 gap-1 shadow-[0_16px_44px_rgba(0,0,0,0.58)] z-40 transition-all duration-300 ${subdued ? 'bottom-3 w-[62%] max-w-[242px] bg-[rgba(10,11,14,0.78)] p-1 opacity-50 backdrop-blur-xl' : 'bottom-4 w-[68%] max-w-[276px] bg-[rgba(10,11,14,0.88)] p-1 opacity-100 backdrop-blur-2xl'}`}>
      {TABS.map(({ id, Icon, badge }) => {
        const isActive = active === id
        const numericBadge = typeof badge === 'number' ? Math.min(badge, 99) : badge
        const isAlertBadge = badge === '!'

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`relative ${subdued ? 'h-10' : 'h-11'} rounded-full grid place-items-center transition-all duration-300 ${
              isActive ? 'text-white' : 'hover:bg-white/[0.05]'
            }`}
            aria-label={id}
          >
            {isActive && (
              <span className="absolute inset-1 rounded-full bg-white/[0.075] ring-1 ring-inset ring-white/[0.035]" />
            )}
            <Icon
              size={21}
              strokeWidth={isActive ? 2.4 : 2.1}
              className={`relative z-10 transition-colors duration-300 ${
                isActive
                  ? 'text-white'
                  : 'text-white/50'
              }`}
            />
            {isActive && (
              <div className="absolute bottom-0 h-0.5 w-4 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
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
