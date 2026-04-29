import type { Show, Tier } from '../types'

export type Rarity = 'legendary' | 'epic' | 'rare' | 'common'

export interface RarityStyle {
  id: Rarity
  name: string
  ring: string
  glow: string
  text: string
  bg: string
  hex: string
}

export const RARITIES: Record<Rarity, RarityStyle> = {
  legendary: {
    id: 'legendary',
    name: 'Legendary',
    ring: 'ring-yellow-400',
    glow: 'shadow-[0_0_24px_rgba(250,204,21,0.55)]',
    text: 'text-yellow-400',
    bg: 'bg-yellow-400',
    hex: '#facc15',
  },
  epic: {
    id: 'epic',
    name: 'Epic',
    ring: 'ring-purple-500',
    glow: 'shadow-[0_0_22px_rgba(168,85,247,0.55)]',
    text: 'text-purple-400',
    bg: 'bg-purple-500',
    hex: '#a855f7',
  },
  rare: {
    id: 'rare',
    name: 'Rare',
    ring: 'ring-blue-400',
    glow: 'shadow-[0_0_20px_rgba(96,165,250,0.55)]',
    text: 'text-blue-400',
    bg: 'bg-blue-400',
    hex: '#60a5fa',
  },
  common: {
    id: 'common',
    name: 'Common',
    ring: 'ring-zinc-500',
    glow: 'shadow-[0_0_14px_rgba(161,161,170,0.35)]',
    text: 'text-zinc-300',
    bg: 'bg-zinc-500',
    hex: '#71717a',
  },
}

export const TIER_STYLE: Record<Tier, string> = {
  S: 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]',
  A: 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]',
  B: 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]',
  C: 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]',
  D: 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]',
}

const EPIC_GENRES = new Set(['Animation', 'Sci-Fi', 'Action', 'Fantasy', 'Science Fiction'])
const RARE_GENRES = new Set(['Drama', 'Thriller', 'Horror', 'Mystery', 'Crime'])

/**
 * Compute the visual rarity of a show.
 * Priority:
 *   1. Top 8 OR S-tier → legendary
 *   2. A-tier OR epic genre → epic
 *   3. B/C-tier OR rare genre → rare
 *   4. otherwise → common
 */
export function getRarity(
  show: Show,
  tier?: Tier | null,
  isTop8?: boolean,
): Rarity {
  if (isTop8 || tier === 'S') return 'legendary'
  if (tier === 'A') return 'epic'
  if (tier === 'B' || tier === 'C') return 'rare'

  const g = show.genres ?? show.rawGenres ?? []
  if (g.some((x) => EPIC_GENRES.has(x))) return 'epic'
  if (g.some((x) => RARE_GENRES.has(x))) return 'rare'
  return 'common'
}

export function rarityStyle(r: Rarity): RarityStyle {
  return RARITIES[r]
}
