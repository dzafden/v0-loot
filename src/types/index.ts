// Core domain types for Loot

export type Genre =
  | 'Horror'
  | 'Comedy'
  | 'Drama'
  | 'Sci-Fi'
  | 'Action'
  | 'Romance'
  | 'Thriller'
  | 'Animation'
  | 'Documentary'
  | 'Default'

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'

export type OverlayKind =
  | 'none'
  | 'vignette'
  | 'holographic'
  | 'rarity-glow'
  | 'static-noise'

export interface Show {
  id: number // tmdb id
  name: string
  year?: number
  posterPath?: string | null
  backdropPath?: string | null
  overview?: string
  genres: Genre[] // normalized genre tags (best-effort)
  rawGenres?: string[]
  addedAt: number
  updatedAt: number
  // customization
  outlineColor?: string
  overlay?: OverlayKind
  // top 8
  top8Position?: number | null
}

export interface Collection {
  id: string
  name: string
  showIds: number[]
  createdAt: number
}

export interface EmojiCategory {
  id: string
  emoji: string
  label?: string
  showIds: number[]
  createdAt: number
}

export interface TierAssignment {
  showId: number // pk
  tier: Tier
  position: number // order within tier
  updatedAt: number
}

export interface EpisodeProgress {
  // composite key: `${showId}-${seasonNumber}-${episodeNumber}`
  key: string
  showId: number
  seasonNumber: number
  episodeNumber: number
  watched: boolean
  watchedAt?: number
}

export interface SeasonCache {
  // composite key: `${showId}-${seasonNumber}`
  key: string
  showId: number
  seasonNumber: number
  name?: string
  posterPath?: string | null
  episodes: { episode_number: number; name: string; still_path?: string | null }[]
  fetchedAt: number
}

export interface CastRole {
  id: string
  roleName: string // e.g. "Best Friend"
  showId: number
  characterName: string
  actorName: string
  personId?: number
  profilePath?: string | null
  createdAt: number
}
