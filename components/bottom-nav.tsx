'use client'

import { Home, Package, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'shop' | 'locker' | 'rankings' | 'profile'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  lockerCount: number
  unsortedCount: number
}

const TABS: {
  id: TabId
  icon: React.ElementType
  label: string
}[] = [
  { id: 'shop', icon: Home, label: 'Shop' },
  { id: 'locker', icon: Package, label: 'Locker' },
  { id: 'rankings', icon: Trophy, label: 'Ranks' },
  { id: 'profile', icon: User, label: 'Profile' },
]

export function BottomNav({ activeTab, onTabChange, lockerCount, unsortedCount }: BottomNavProps) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[380px] z-40">
      <div className="bg-[#14141a]/90 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex justify-between items-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          const badge =
            tab.id === 'locker' ? lockerCount :
            tab.id === 'rankings' && unsortedCount > 0 ? unsortedCount :
            null

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-full transition-all duration-300 w-[62px] h-[56px]',
                isActive ? 'bg-white/10 -translate-y-2' : 'hover:bg-white/5 hover:-translate-y-0.5'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={isActive ? 26 : 22}
                className={cn(
                  'transition-all duration-300',
                  isActive
                    ? 'text-primary drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]'
                    : 'text-zinc-500'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />

              {/* Active dot */}
              {isActive && (
                <div className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(74,222,128,0.9)]" />
              )}

              {/* Badge */}
              {badge !== null && !isActive && (
                <div className={cn(
                  'absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full border-2 border-[#14141a] flex items-center justify-center text-[9px] font-black text-white',
                  tab.id === 'rankings' ? 'bg-rose-500' : 'bg-primary'
                )}>
                  {badge > 99 ? '99+' : badge}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
