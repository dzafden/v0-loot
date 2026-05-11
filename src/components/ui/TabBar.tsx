import { motion } from 'framer-motion'

export type Tab = 'library' | 'tier' | 'collections' | 'cast' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'library', label: 'Collection', icon: '📦' },
  { id: 'tier', label: 'Tiers', icon: '🏆' },
  { id: 'collections', label: 'Sets', icon: '📁' },
  { id: 'cast', label: 'Cast', icon: '🎭' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/95 to-[#0b0b0f]/0">
      <div className="rounded-2xl bg-zinc-900/85 border border-white/10 backdrop-blur flex items-stretch p-1 shadow-xl">
        {TABS.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] ${
                isActive ? 'text-white' : 'text-white/55'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl bg-white/10"
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                />
              )}
              <span className="relative text-xl leading-none">{t.icon}</span>
              <span className="relative mt-0.5 font-semibold">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
