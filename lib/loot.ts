import { TMDBShow, getGenreName } from './tmdb'

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
  popularity: number
}

export interface TierData {
  S: number[]
  A: number[]
  B: number[]
  C: number[]
  D: number[]
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
    popularity: show.popularity,
  }
}

export const TIER_STYLES: Record<Tier, { bg: string; text: string; shadow: string; label: string; border: string }> = {
  S: { bg: 'bg-rose-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(244,63,94,0.6)]', label: 'S-Tier', border: 'border-rose-500/40' },
  A: { bg: 'bg-orange-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(249,115,22,0.6)]', label: 'A-Tier', border: 'border-orange-500/40' },
  B: { bg: 'bg-yellow-400', text: 'text-black', shadow: 'shadow-[0_0_18px_rgba(234,179,8,0.5)]', label: 'B-Tier', border: 'border-yellow-400/40' },
  C: { bg: 'bg-emerald-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(16,185,129,0.5)]', label: 'C-Tier', border: 'border-emerald-500/40' },
  D: { bg: 'bg-blue-500', text: 'text-white', shadow: 'shadow-[0_0_18px_rgba(59,130,246,0.5)]', label: 'D-Tier', border: 'border-blue-500/40' },
}
const TIER_STORAGE_KEY = 'tierlist-tiers'
const SHOWS_STORAGE_KEY = 'tierlist-shows'

export function saveTiers(tiers: TierData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(tiers))
}

export function loadTiers(): TierData | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(TIER_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveShows(shows: Record<number, LootShow>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SHOWS_STORAGE_KEY, JSON.stringify(shows))
}

export function loadShows(): Record<number, LootShow> | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SHOWS_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TIER_STORAGE_KEY)
  localStorage.removeItem(SHOWS_STORAGE_KEY)
}

export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']

