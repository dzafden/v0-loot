const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = 'd4b75df0c793d9efa8f4db9c94430c60'
export const TMDB_IMG = 'https://image.tmdb.org/t/p'

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface TMDBShow {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  vote_average: number
  first_air_date: string
  genre_ids: number[]
  popularity: number
  origin_country: string[]
}

export interface TMDBShowDetails extends TMDBShow {
  genres: { id: number; name: string }[]
  number_of_seasons: number
  number_of_episodes: number
  status: string
  networks: { id: number; name: string; logo_path: string }[]
  episode_run_time: number[]
  tagline: string
  homepage: string
}

export interface TMDBSeason {
  id: number
  name: string
  season_number: number
  episode_count: number
  poster_path: string | null
  air_date: string
  overview: string
}

// ── Genre map ─────────────────────────────────────────────────────────────────

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

// ── Image helpers ─────────────────────────────────────────────────────────────

export function getPosterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' = 'w500'): string {
  if (!path) return '/placeholder-poster.jpg'
  return `${TMDB_IMG}/${size}${path}`
}

export function getBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'): string {
  if (!path) return ''
  return `${TMDB_IMG}/${size}${path}`
}

// ── Core fetcher ──────────────────────────────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${endpoint}`)
  url.searchParams.set('api_key', TMDB_KEY)
  url.searchParams.set('language', 'en-US')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), { next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status} ${endpoint}`)
  return res.json()
}

// ── Curated lists ─────────────────────────────────────────────────────────────

export async function getTrendingShows(): Promise<TMDBShow[]> {
  const data = await tmdbFetch<{ results: TMDBShow[] }>('/trending/tv/week')
  return data.results.slice(0, 20)
}

export async function getTopRatedShows(): Promise<TMDBShow[]> {
  const data = await tmdbFetch<{ results: TMDBShow[] }>('/tv/top_rated')
  return data.results.slice(0, 20)
}

export async function getPopularShows(): Promise<TMDBShow[]> {
  const data = await tmdbFetch<{ results: TMDBShow[] }>('/tv/popular')
  return data.results.slice(0, 20)
}

export async function getAiringToday(): Promise<TMDBShow[]> {
  const data = await tmdbFetch<{ results: TMDBShow[] }>('/tv/airing_today')
  return data.results.slice(0, 20)
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export async function getShowsByGenre(genreId: number): Promise<TMDBShow[]> {
  const data = await tmdbFetch<{ results: TMDBShow[] }>('/discover/tv', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  })
  return data.results.slice(0, 20)
}

export async function getNetworkShows(networkId: number): Promise<TMDBShow[]> {
  const data = await tmdbFetch<{ results: TMDBShow[] }>('/discover/tv', {
    with_networks: String(networkId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '20',
  })
  return data.results.slice(0, 20)
}

// ── Details & search ──────────────────────────────────────────────────────────

export async function getShowDetails(id: number): Promise<TMDBShowDetails> {
  return tmdbFetch<TMDBShowDetails>(`/tv/${id}`, { append_to_response: 'external_ids' })
}

export async function searchShows(query: string): Promise<TMDBShow[]> {
  if (!query.trim()) return []
  const data = await tmdbFetch<{ results: TMDBShow[] }>('/search/tv', { query })
  return data.results.slice(0, 20)
}