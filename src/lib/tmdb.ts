// TMDB API client — user provides their own key in app settings.

const TMDB_BASE = 'https://api.themoviedb.org/3'
export const TMDB_IMG = 'https://image.tmdb.org/t/p'

const API_KEY_STORAGE = 'loot:tmdb-api-key'

export function getTmdbKey(): string {
  const stored = localStorage.getItem(API_KEY_STORAGE)
  if (stored) return stored
  // Fallback: build-time env var (set in .env.local as VITE_TMDB_API_KEY)
  return (import.meta.env.VITE_TMDB_API_KEY as string | undefined) ?? ''
}

export function setTmdbKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim())
}

export function hasTmdbKey(): boolean {
  return getTmdbKey().length > 0
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = getTmdbKey()
  if (!key) throw new Error('TMDB API key not set')
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', key)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export interface TmdbSearchResult {
  id: number
  name: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  genre_ids?: number[]
  vote_average?: number
  popularity?: number
}

// Display-shape used by Discover carousels and search results.
// Persistence stays on the `Show` type (see ../types).
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

const GENRES: Record<number, string> = {
  10759: 'Action',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War',
  37: 'Western',
  27: 'Horror',
  10749: 'Romance',
  53: 'Thriller',
  12: 'Adventure',
  14: 'Fantasy',
}

export function getGenreName(id: number): string {
  return GENRES[id] ?? 'Drama'
}

export function tmdbToLoot(raw: TmdbSearchResult): LootShow {
  return {
    id: raw.id,
    title: raw.name,
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    year: raw.first_air_date?.slice(0, 4) ?? '—',
    genre: raw.genre_ids?.[0] ? getGenreName(raw.genre_ids[0]) : 'Drama',
    rating: raw.vote_average ?? 0,
    overview: raw.overview ?? '',
    popularity: raw.popularity ?? 0,
  }
}

export async function searchShows(query: string) {
  const data = await tmdb<{ results: TmdbSearchResult[] }>('/search/tv', { query })
  return data.results
}

// ── Curated lists ───────────────────────────────────────────────────────────

async function listFromTmdb(path: string, params: Record<string, string> = {}) {
  const data = await tmdb<{ results: TmdbSearchResult[] }>(path, params)
  return data.results.slice(0, 20)
}

export const getTrendingShows = () => listFromTmdb('/trending/tv/week')
export const getTopRatedShows = () => listFromTmdb('/tv/top_rated')
export const getPopularShows = () => listFromTmdb('/tv/popular')
export const getAiringToday = () => listFromTmdb('/tv/airing_today')

export const getShowsByGenre = (genreId: number) =>
  listFromTmdb('/discover/tv', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  })

export const getNetworkShows = (networkId: number) =>
  listFromTmdb('/discover/tv', {
    with_networks: String(networkId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '20',
  })

// ── Discover feed (combined fetch + module-level TTL cache) ────────────────

export interface DiscoverFeed {
  trending: LootShow[]
  topRated: LootShow[]
  popular: LootShow[]
  airingToday: LootShow[]
  crime: LootShow[]
  scifi: LootShow[]
  animation: LootShow[]
  mystery: LootShow[]
  netflix: LootShow[]
  hbo: LootShow[]
  apple: LootShow[]
  amazon: LootShow[]
}

export type DiscoverCategoryKey =
  | 'trending'
  | 'airingToday'
  | 'topRated'
  | 'popular'
  | 'crime'
  | 'scifi'
  | 'animation'
  | 'mystery'
  | 'netflix'
  | 'hbo'
  | 'apple'
  | 'amazon'

const FEED_TTL_MS = 5 * 60_000
let feedCache: { data: DiscoverFeed; ts: number } | null = null
let inflight: Promise<DiscoverFeed> | null = null

export function getCachedDiscoverFeed(): DiscoverFeed | null {
  if (!feedCache) return null
  if (Date.now() - feedCache.ts >= FEED_TTL_MS) return null
  return feedCache.data
}

export async function getDiscoverFeed(): Promise<DiscoverFeed> {
  if (feedCache && Date.now() - feedCache.ts < FEED_TTL_MS) return feedCache.data
  if (inflight) return inflight
  inflight = (async () => {
    const [trending, topRated, popular, airingToday, crime, scifi, animation, mystery, netflix, hbo, apple, amazon] =
      await Promise.all([
        getTrendingShows(),
        getTopRatedShows(),
        getPopularShows(),
        getAiringToday(),
        getShowsByGenre(80),
        getShowsByGenre(10765),
        getShowsByGenre(16),
        getShowsByGenre(9648),
        getNetworkShows(213),
        getNetworkShows(49),
        getNetworkShows(2552),
        getNetworkShows(1024),
      ])
    const data: DiscoverFeed = {
      trending: trending.map(tmdbToLoot),
      topRated: topRated.map(tmdbToLoot),
      popular: popular.map(tmdbToLoot),
      airingToday: airingToday.map(tmdbToLoot),
      crime: crime.map(tmdbToLoot),
      scifi: scifi.map(tmdbToLoot),
      animation: animation.map(tmdbToLoot),
      mystery: mystery.map(tmdbToLoot),
      netflix: netflix.map(tmdbToLoot),
      hbo: hbo.map(tmdbToLoot),
      apple: apple.map(tmdbToLoot),
      amazon: amazon.map(tmdbToLoot),
    }
    feedCache = { data, ts: Date.now() }
    return data
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export async function getDiscoverCategoryPage(
  key: DiscoverCategoryKey,
  page = 1,
): Promise<{ results: LootShow[]; totalPages: number }> {
  const p = String(page)
  let data: { results: TmdbSearchResult[]; total_pages: number }

  switch (key) {
    case 'trending':
      data = await tmdb('/trending/tv/week', { page: p })
      break
    case 'airingToday':
      data = await tmdb('/tv/airing_today', { page: p })
      break
    case 'topRated':
      data = await tmdb('/tv/top_rated', { page: p })
      break
    case 'popular':
      data = await tmdb('/tv/popular', { page: p })
      break
    case 'crime':
      data = await tmdb('/discover/tv', {
        page: p,
        with_genres: '80',
        sort_by: 'popularity.desc',
        'vote_count.gte': '50',
      })
      break
    case 'scifi':
      data = await tmdb('/discover/tv', {
        page: p,
        with_genres: '10765',
        sort_by: 'popularity.desc',
        'vote_count.gte': '50',
      })
      break
    case 'animation':
      data = await tmdb('/discover/tv', {
        page: p,
        with_genres: '16',
        sort_by: 'popularity.desc',
        'vote_count.gte': '50',
      })
      break
    case 'mystery':
      data = await tmdb('/discover/tv', {
        page: p,
        with_genres: '9648',
        sort_by: 'popularity.desc',
        'vote_count.gte': '50',
      })
      break
    case 'netflix':
      data = await tmdb('/discover/tv', {
        page: p,
        with_networks: '213',
        sort_by: 'popularity.desc',
        'vote_count.gte': '20',
      })
      break
    case 'hbo':
      data = await tmdb('/discover/tv', {
        page: p,
        with_networks: '49',
        sort_by: 'popularity.desc',
        'vote_count.gte': '20',
      })
      break
    case 'apple':
      data = await tmdb('/discover/tv', {
        page: p,
        with_networks: '2552',
        sort_by: 'popularity.desc',
        'vote_count.gte': '20',
      })
      break
    case 'amazon':
      data = await tmdb('/discover/tv', {
        page: p,
        with_networks: '1024',
        sort_by: 'popularity.desc',
        'vote_count.gte': '20',
      })
      break
    default:
      data = await tmdb('/tv/popular', { page: p })
  }

  return {
    results: data.results.map(tmdbToLoot),
    totalPages: Math.max(1, data.total_pages ?? 1),
  }
}

export interface TmdbShowDetail extends TmdbSearchResult {
  number_of_seasons: number
  seasons: { season_number: number; episode_count: number; name: string }[]
  genres: { id: number; name: string }[]
}

export async function getShowDetail(id: number) {
  return tmdb<TmdbShowDetail>(`/tv/${id}`)
}

export async function getSeason(showId: number, seasonNumber: number) {
  return tmdb<{
    episodes: { episode_number: number; name: string; still_path?: string | null }[]
  }>(`/tv/${showId}/season/${seasonNumber}`)
}

export async function getCredits(showId: number) {
  return tmdb<{
    cast: {
      id: number
      name: string
      character: string
      profile_path: string | null
    }[]
  }>(`/tv/${showId}/credits`)
}

export function imgUrl(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342') {
  if (!path) return ''
  return `${TMDB_IMG}/${size}${path}`
}
