import { TMDBShow, getGenreName, getPosterUrl } from './tmdb'

export type Rarity = 'legendary' | 'epic' | 'rare' | 'common'
export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'

export interface LootShow {
  id: number
  title: string
  posterPath: string | null
  backdropPath: string | null
  year: string
  genre: string
  rating: number
  overview: string
  rarity: Rarity
  popularity: number
}

export interface TierData {
  S: number[]
  A: number[]
  B: number[]
  C: number[]
  D: number[]
}

// Assign rarity based on popularity & rating
export function assignRarity(show: TMDBShow): Rarity {
  const score = show.vote_average * 10 + show.popularity / 10
  if (show.vote_average >= 8.5 || show.popularity > 1000) return 'legendary'
  if (show.vote_average >= 7.5 || show.popularity > 500) return 'epic'
  if (show.vote_average >= 6.5 || show.popularity > 200) return 'rare'
  return 'common'
}

export function tmdbToLoot(show: TMDBShow): LootShow {
  return {
    id: show.id,
    title: show.name,
    posterPath: show.poster_path,
    backdropPath: show.backdrop_path,
    year: show.first_air_date?.slice(0, 4) ?? '—',
    genre: show.genre_ids?.[0] ? getGenreName(show.genre_ids[0]) : 'Drama',
    rating: show.vote_average,
    overview: show.overview,
    rarity: assignRarity(show),
    popularity: show.popularity,
  }
}

export const RARITIES: Record<Rarity, {
  id: Rarity
  name: string
  border: string
  ring: string
  text: string
  bg: string
  glow: string
  gradient: string
  badge: string
}> = {
  legendary: {
    id: 'legendary',
    name: 'Legendary',
    border: 'border-yellow-400',
    ring: 'ring-yellow-400/70',
    text: 'text-yellow-400',
    bg: 'bg-yellow-400',
    glow: 'shadow-[0_0_28px_rgba(250,204,21,0.55)]',
    gradient: 'from-yellow-400/30 via-yellow-400/10 to-transparent',
    badge: 'bg-yellow-400 text-black',
  },
  epic: {
    id: 'epic',
    name: 'Epic',
    border: 'border-purple-500',
    ring: 'ring-purple-500/70',
    text: 'text-purple-400',
    bg: 'bg-purple-500',
    glow: 'shadow-[0_0_28px_rgba(168,85,247,0.55)]',
    gradient: 'from-purple-500/30 via-purple-500/10 to-transparent',
    badge: 'bg-purple-500 text-white',
  },
  rare: {
    id: 'rare',
    name: 'Rare',
    border: 'border-blue-400',
    ring: 'ring-blue-400/70',
    text: 'text-blue-400',
    bg: 'bg-blue-400',
    glow: 'shadow-[0_0_24px_rgba(96,165,250,0.5)]',
    gradient: 'from-blue-400/25 via-blue-400/10 to-transparent',
    badge: 'bg-blue-400 text-white',
  },
  common: {
    id: 'common',
    name: 'Common',
    border: 'border-zinc-500',
    ring: 'ring-zinc-500/50',
    text: 'text-zinc-400',
    bg: 'bg-zinc-500',
    glow: 'shadow-[0_0_14px_rgba(113,113,122,0.35)]',
    gradient: 'from-zinc-500/20 via-zinc-500/5 to-transparent',
    badge: 'bg-zinc-600 text-white',
  },
}

export const TIER_STYLES: Record<Tier, { bg: string; text: string; shadow: string; label: string }> = {
  S: { bg: 'bg-rose-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(244,63,94,0.6)]', label: 'S-Tier' },
  A: { bg: 'bg-orange-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(249,115,22,0.6)]', label: 'A-Tier' },
  B: { bg: 'bg-yellow-400', text: 'text-black', shadow: 'shadow-[0_0_18px_rgba(234,179,8,0.5)]', label: 'B-Tier' },
  C: { bg: 'bg-emerald-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(16,185,129,0.5)]', label: 'C-Tier' },
  D: { bg: 'bg-blue-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(59,130,246,0.5)]', label: 'D-Tier' },
}

export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']
