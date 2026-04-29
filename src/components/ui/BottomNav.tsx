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
}

export function BottomNav({ active, onChange, unsortedCount = 0 }: Props) {
  const TABS: TabDef[] = [
    { id: 'discover', Icon: Compass },
    { id: 'collection', Icon: Package },
    { id: 'rankings', Icon: Trophy, badge: unsortedCount > 0 ? '!' : null },
    { id: 'profile', Icon: User },
  ]

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[390px] bg-[#14141c]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 grid grid-cols-4 gap-1 shadow-[0_16px_40px_rgba(0,0,0,0.75)] z-40">
      {TABS.map(({ id, Icon, badge }) => {
        const isActive = active === id
        const numericBadge = typeof badge === 'number' ? Math.min(badge, 99) : badge
        const isAlertBadge = badge === '!'

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`relative h-14 rounded-xl grid place-items-center transition-all duration-200 ${
              isActive ? 'bg-white/10' : 'hover:bg-white/[0.06]'
            }`}
            aria-label={id}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.4 : 2.1}
              className={`transition-colors duration-300 ${
                isActive
                  ? 'text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.55)]'
                  : 'text-zinc-400'
              }`}
            />
            {isActive && (
              <div className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-[#4ade80]/95 shadow-[0_0_8px_rgba(74,222,128,0.75)]" />
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
