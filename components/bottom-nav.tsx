'use client'

import { Compass, Package, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'discover' | 'collection' | 'rankings' | 'profile'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  collectionCount: number
  unsortedCount: number
}

const TABS: {
  id: TabId
  icon: React.ElementType
  label: string
}[] = [
  { id: 'discover',   icon: Compass,  label: 'Discover'   },
  { id: 'collection', icon: Package,  label: 'Collection' },
  { id: 'rankings',   icon: Trophy,   label: 'Rankings'   },
  { id: 'profile',    icon: User,     label: 'Profile'    },
]

export function BottomNav({ activeTab, onTabChange, collectionCount, unsortedCount }: BottomNavProps) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[380px] z-40">
      <div className="bg-[#1a1a24]/95 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex justify-between items-center shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          const badge =
            tab.id === 'collection' ? (collectionCount > 0 ? collectionCount : null) :
            tab.id === 'rankings' && unsortedCount > 0 ? '!' :
            null

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative p-3 rounded-full flex flex-col items-center justify-center transition-all duration-300 flex-1 h-14',
                isActive ? 'bg-white/10' : 'hover:bg-white/5'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={isActive ? 24 : 20}
                className={cn(
                  'transition-all duration-300',
                  isActive
                    ? 'text-primary drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]'
                    : 'text-zinc-500'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />

              {badge !== null && !isActive && (
                <div className={cn(
                  'absolute top-1 right-1/4 min-w-4 h-4 px-1 rounded-full border-2 border-[#1a1a24] flex items-center justify-center text-[9px] font-black text-white',
                  tab.id === 'rankings' ? 'bg-red-500' : 'bg-primary text-primary-foreground'
                )}>
                  {badge}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
