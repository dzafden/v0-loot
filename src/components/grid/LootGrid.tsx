import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { EmojiCategory, Show } from '../../types'
import { LootCard } from '../card/LootCard'
import { getRarity } from '../../lib/rarity'

interface Props {
  shows: Show[]
  emojiByShow?: Map<number, EmojiCategory[]>
  progressByShow?: Map<number, { watched: number; total: number }>
  tierByShow?: Map<number, 'S' | 'A' | 'B' | 'C' | 'D'>
  onTap?: (s: Show) => void
  onLongPress?: (s: Show, anchor: { x: number; y: number }) => void
  empty?: ReactNode
}

export function LootGrid({
  shows,
  emojiByShow,
  progressByShow,
  tierByShow,
  onTap,
  onLongPress,
  empty,
}: Props) {
  if (!shows.length) {
    return empty ? <>{empty}</> : null
  }

  return (
    <motion.div
      layout
      className="grid gap-x-3 gap-y-5 px-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {shows.map((show) => (
          <motion.div key={show.id} layout className="min-w-0">
            <LootCard
              show={show}
              rarity={getRarity(show, tierByShow?.get(show.id) ?? null, false)}
              emojiBadges={emojiByShow?.get(show.id)}
              episodeProgress={progressByShow?.get(show.id)}
              tier={tierByShow?.get(show.id) ?? null}
              onTap={onTap}
              onLongPress={onLongPress}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
