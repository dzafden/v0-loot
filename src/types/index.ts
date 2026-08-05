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

export type MediaType = 'tv' | 'movie'
export type AnimationTradition = 'anime' | 'western' | 'euro' | 'other'

export interface CardDescriptor {
  id: string
  label: string
  confidence: number
  evidence: string[]
}

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
  /** Existing records are read as TV; every new record persists this explicitly. */
  mediaType: MediaType
  tradition?: AnimationTradition
  vibeIds?: string[]
  vibeEvidence?: Record<string, string[]>
  /** A high-confidence, factual hook for compact card surfaces. */
  cardDescriptor?: CardDescriptor
  seasonCount?: number
  episodeCount?: number
  status?: string
  /** Canonical TMDB movie collection membership, when one exists. */
  franchiseCollectionId?: number | null
  franchiseCollectionName?: string
  /** Verified authoring studios from Loot's curated TMDB company allowlist. */
  studioIds?: number[]
  addedAt: number
  updatedAt: number
  // customization
  outlineColor?: string
  overlay?: OverlayKind
  // top 8
  top8Position?: number | null
}

export interface FranchiseMember {
  id: number
  name: string
  posterPath?: string | null
  backdropPath?: string | null
  overview?: string
  releaseDate: string
  mediaType?: MediaType
}

export interface FranchiseDefinition {
  id: number
  name: string
  posterPath?: string | null
  backdropPath?: string | null
  memberIds: number[]
  members: FranchiseMember[]
  source: 'tmdb-collection' | 'tmdb-studio' | 'wikidata' | 'anilist'
  /** Provider id when `id` is namespaced for local persistence. */
  sourceId?: number
  /** Stable non-numeric provider key when the local numeric id is derived. */
  sourceKey?: string
  /** The boundary the user is completing: one direct series or a wider world with spin-offs. */
  scope?: 'series' | 'universe'
  tradition?: AnimationTradition
  collectible?: boolean
  updatedAt: number
}

export interface EarnedFranchiseAchievement {
  id: string
  definitionId: number
  criteriaVersion: string
  earnedAt: number
  definition: FranchiseDefinition
}

export interface DismissedCollection {
  id: string
  definitionId: number
  source: FranchiseDefinition['source']
  name: string
  watchedCountAtDismissal: number
  dismissedAt: number
  updatedAt: number
}

export interface Collection {
  id: string
  name: string
  showIds: number[]
  createdAt: number
}

export interface WatchlistShelf {
  id: string
  name: string
  showIds: number[]
  position?: number
  createdAt: number
  updatedAt: number
}

export interface DiscoverFeedback {
  showId: number
  name: string
  posterPath?: string | null
  dismissedAt: number
  hiddenUntil: number
  updatedAt: number
}

export interface RecommendationContext {
  anchorName: string
  anchorTier?: Tier
  sharedGenre?: string
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
  episodes: { episode_number: number; name: string; overview?: string | null; still_path?: string | null }[]
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
