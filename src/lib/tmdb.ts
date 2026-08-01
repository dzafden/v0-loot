// TMDB API client — user provides their own key in app settings.

import type { AnimationTradition, CardDescriptor, MediaType } from '../types'
import { scoreShowVibes } from './vibe-engine'
import { isSafeGrownUpAnimation } from './animation-taxonomy'
import { selectCardDescriptor } from './card-descriptors'

const TMDB_BASE = 'https://api.themoviedb.org/3'
export const TMDB_IMG = 'https://image.tmdb.org/t/p'
export const ANIMATION_GENRE_ID = 16
export type RetrievalMode = 'canon' | 'fresh'

const API_KEY_STORAGE = 'loot:tmdb-api-key'
const WATCH_REGION_STORAGE = 'loot:watch-region'
const WATCH_PROVIDER_CACHE_MS = 24 * 60 * 60_000

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

function inferredRegion() {
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const locale of locales) {
    const region = locale?.match(/[-_]([A-Z]{2})$/i)?.[1]
    if (region) return region.toUpperCase()
  }
  return 'US'
}

export function getWatchRegion() {
  return localStorage.getItem(WATCH_REGION_STORAGE) || inferredRegion()
}

export function setWatchRegion(region: string) {
  localStorage.setItem(WATCH_REGION_STORAGE, region.toUpperCase())
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
  vote_count?: number
  origin_country?: string[]
  original_language?: string
  mediaType?: MediaType
}

// Display-shape used by Discover carousels and search results.
// Persistence stays on the `Show` type (see ../types).
export interface LootShow {
  id: number
  title: string
  posterPath: string | null
  backdropPath: string | null
  year: string
  releaseDate?: string
  genre: string
  rating: number
  overview: string
  popularity: number
  rawGenres: string[]
  tradition: AnimationTradition
  mediaType: MediaType
  vibeIds: string[]
  vibeEvidence: Record<string, string[]>
  cardDescriptor?: CardDescriptor
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
  10765: 'Sci-Fi & Fantasy',
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

export function deriveTradition(
  originCountry: string[] = [],
  originalLanguage?: string,
): AnimationTradition {
  const countries = new Set(originCountry.map((country) => country.toUpperCase()))
  if (originalLanguage?.toLowerCase() === 'ja' || countries.has('JP')) return 'anime'
  if (['US', 'CA', 'GB', 'AU', 'IE', 'NZ'].some((country) => countries.has(country))) return 'western'
  if (['FR', 'DE', 'ES', 'IT', 'BE', 'NL', 'DK', 'SE', 'NO', 'PL', 'CZ'].some((country) => countries.has(country))) return 'euro'
  return 'other'
}

function withAnimationGenre(params: Record<string, string> = {}) {
  const requested = (params.with_genres ?? '').trim()
  const groups = requested
    .split(',')
    .map((group) => group.trim())
    .filter((group) => group && group !== String(ANIMATION_GENRE_ID))
  return {
    ...params,
    with_genres: [String(ANIMATION_GENRE_ID), ...groups].join(','),
  }
}

type RawTmdbListItem = Omit<TmdbSearchResult, 'name'> & {
  name?: string
  title?: string
  release_date?: string
  media_type?: 'tv' | 'movie' | 'person'
}

function normalizeListItem(raw: RawTmdbListItem, mediaType: MediaType): TmdbSearchResult {
  return {
    ...raw,
    name: raw.name ?? raw.title ?? 'Untitled',
    first_air_date: raw.first_air_date ?? raw.release_date,
    origin_country: raw.origin_country ?? [],
    mediaType,
  }
}

export function tmdbToLoot(raw: TmdbSearchResult): LootShow {
  const rawGenres = (raw.genre_ids ?? []).map(getGenreName)
  const tradition = deriveTradition(raw.origin_country, raw.original_language)
  const cardDescriptor = selectCardDescriptor({
    overview: raw.overview,
    genreNames: rawGenres,
    tradition,
  })
  const profile = scoreShowVibes({
    id: raw.id,
    title: raw.name,
    overview: raw.overview ?? '',
    genreNames: rawGenres,
    year: raw.first_air_date ? Number(raw.first_air_date.slice(0, 4)) : undefined,
    networkIds: [],
    keywords: [],
    popularity: raw.popularity,
  })
  const topVibes = profile.vibes.filter((vibe) => vibe.score >= 0.16).slice(0, 3)
  return {
    id: raw.id,
    title: raw.name,
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    year: raw.first_air_date?.slice(0, 4) ?? '—',
    releaseDate: raw.first_air_date,
    genre: rawGenres.find((genre) => genre !== 'Animation') ?? rawGenres[0] ?? 'Animation',
    rating: raw.vote_average ?? 0,
    overview: raw.overview ?? '',
    popularity: raw.popularity ?? 0,
    rawGenres,
    tradition,
    mediaType: raw.mediaType ?? 'tv',
    vibeIds: topVibes.map((vibe) => vibe.vibeId),
    vibeEvidence: Object.fromEntries(topVibes.map((vibe) => [vibe.vibeId, vibe.evidence])),
    cardDescriptor,
  }
}

function balanceTraditions(shows: LootShow[], limit = 20) {
  const buckets = new Map<AnimationTradition, LootShow[]>([
    ['anime', []], ['western', []], ['euro', []], ['other', []],
  ])
  shows.forEach((show) => buckets.get(show.tradition)?.push(show))
  const active = Array.from(buckets.values()).filter((bucket) => bucket.length)
  if (active.length < 2) return shows.slice(0, limit)
  const balanced: LootShow[] = []
  let cursor = 0
  while (balanced.length < limit && active.some((bucket) => bucket.length)) {
    const bucket = active[cursor % active.length]
    const next = bucket.shift()
    if (next) balanced.push(next)
    cursor += 1
  }
  return balanced
}

export async function searchShows(query: string) {
  const [tv, movies] = await Promise.all([
    tmdb<{ results: RawTmdbListItem[] }>('/search/tv', { query }),
    tmdb<{ results: RawTmdbListItem[] }>('/search/movie', { query }),
  ])
  return [
    ...tv.results.map((result) => normalizeListItem(result, 'tv')),
    ...movies.results.map((result) => normalizeListItem(result, 'movie')),
  ]
    .filter((result) => result.genre_ids?.includes(ANIMATION_GENRE_ID))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
}

// ── Curated lists ───────────────────────────────────────────────────────────

async function discoverList(
  mediaType: MediaType,
  params: Record<string, string> = {},
  limit = 20,
) {
  const data = await tmdb<{ results: RawTmdbListItem[] }>(`/discover/${mediaType}`, withAnimationGenre(params))
  return data.results.map((result) => normalizeListItem(result, mediaType)).slice(0, limit)
}

async function discoverPages(
  mediaType: MediaType,
  params: Record<string, string> = {},
  pages = 2,
) {
  const batches = await Promise.all(
    Array.from({ length: pages }, (_, index) => discoverList(mediaType, {
      ...params,
      page: String(index + 1),
    })),
  )
  return Array.from(
    new Map(batches.flat().map((show) => [show.id, show])).values(),
  )
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const daysAgo = (days: number) => isoDate(new Date(Date.now() - days * 86_400_000))

export const getTrendingShows = () => discoverList('tv', {
  sort_by: 'popularity.desc', 'first_air_date.gte': daysAgo(90), 'vote_count.gte': '20',
})
export const getTopRatedShows = () => discoverList('tv', {
  sort_by: 'vote_average.desc', 'vote_count.gte': '200',
})
export const getPopularShows = () => discoverList('tv', {
  sort_by: 'popularity.desc', 'vote_count.gte': '50',
})
export const getAiringToday = () => {
  const today = isoDate(new Date())
  return discoverList('tv', {
    sort_by: 'popularity.desc', 'air_date.gte': today, 'air_date.lte': today, 'vote_count.gte': '5',
  })
}

export const getFreshByNetworks = (networkIds: number[], page = 1) => discoverList('tv', {
  with_networks: networkIds.join('|'),
  sort_by: 'first_air_date.desc',
  'vote_count.gte': '5',
  page: String(page),
})

export const getFreshByKeyword = (keywordId: number, page = 1) => discoverList('tv', {
  with_keywords: String(keywordId),
  sort_by: 'first_air_date.desc',
  'vote_count.gte': '5',
  page: String(page),
})

export const getShowsByGenre = (genreId: number) =>
  discoverList('tv', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  })

export const getNetworkShows = (networkId: number) =>
  discoverList('tv', {
    with_networks: String(networkId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '20',
  })

export const getCompanyShows = (companyId: number) =>
  discoverList('tv', {
    with_companies: String(companyId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '5',
  })

// ── Discover feed (combined fetch + module-level TTL cache) ────────────────

export interface DiscoverFeed {
  freshStudios: LootShow[]
  newAnime: LootShow[]
  newWestern: LootShow[]
  adultAnimation: LootShow[]
  allAges: LootShow[]
  vibeCrate: LootShow[]
  animatedFilms: LootShow[]
  topRated: LootShow[]
}

export type DiscoverCategoryKey =
  | 'freshStudios'
  | 'newAnime'
  | 'newWestern'
  | 'adultAnimation'
  | 'allAges'
  | 'vibeCrate'
  | 'animatedFilms'
  | 'topRated'

const FEED_TTL_MS = 5 * 60_000
let feedCache: { data: DiscoverFeed; ts: number } | null = null
let inflight: Promise<DiscoverFeed> | null = null

export interface TmdbEpisodeSummary {
  id: number
  name: string
  overview?: string
  air_date?: string | null
  season_number: number
  episode_number: number
  still_path?: string | null
}

export interface AnimationScheduleEntry {
  show: LootShow
  episode?: TmdbEpisodeSummary | null
}

export interface AnimationScheduleDay {
  date: string
  entries: AnimationScheduleEntry[]
}

export interface AnimationTrailerFeature {
  show: LootShow
  video: TmdbVideoAsset
}

export interface AnimationTodayPulse {
  days: AnimationScheduleDay[]
  trending: LootShow[]
  generatedAt: number
  partial: boolean
}

const TODAY_PULSE_TTL_MS = 30 * 60_000
const TODAY_TRAILER_TTL_MS = 6 * 60 * 60_000
const TODAY_PULSE_STORAGE_KEY = 'loot:today-pulse:v3'
const TODAY_TRAILERS_STORAGE_KEY = 'loot:today-trailers:v1'
const TODAY_EPISODE_STORAGE_KEY = 'loot:today-episodes:v2'
type TodayCache<T> = { key: string; data: T; ts: number }
let todayPulseCache: TodayCache<AnimationTodayPulse> | null = null
let todayTrailersCache: TodayCache<AnimationTrailerFeature[]> | null = null
let todayPulseInflight: { key: string; request: Promise<AnimationTodayPulse> } | null = null
let todayTrailersInflight: { key: string; request: Promise<AnimationTrailerFeature[]> } | null = null
let todayEpisodeCache: TodayCache<Record<string, TmdbEpisodeSummary | null>> | null = null
const todayEpisodeInflight = new Map<string, Promise<TmdbEpisodeSummary | null>>()

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateKeyAfter(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function todayContext() {
  const date = localDateKey(new Date())
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const region = getWatchRegion()
  return { date, timezone, region, key: `${date}:${timezone}:${region}` }
}

function readTodayCache<T>(storageKey: string, contextKey: string): TodayCache<T> | null {
  try {
    const cached = JSON.parse(localStorage.getItem(storageKey) || 'null') as TodayCache<T> | null
    return cached?.key === contextKey ? cached : null
  } catch {
    return null
  }
}

function writeTodayCache<T>(storageKey: string, cached: TodayCache<T>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cached))
  } catch {
    // The in-memory cache still keeps the experience working when storage is full or unavailable.
  }
}

async function getAnimationScheduleForDate(date: string, timezone: string) {
  const raw = await discoverList('tv', {
    sort_by: 'popularity.desc',
    'air_date.gte': date,
    'air_date.lte': date,
    timezone,
  }, 12)
  return raw.map(tmdbToLoot)
}

function interleaveTrending(groups: LootShow[][]) {
  const items: LootShow[] = []
  const maxLength = Math.max(0, ...groups.map((group) => group.length))
  for (let index = 0; index < maxLength; index += 1) {
    groups.forEach((group) => {
      if (group[index]) items.push(group[index])
    })
  }
  return items
}

async function getTrendingAnimation() {
  const load = async (mediaType: MediaType, window: 'day' | 'week') => {
    const data = await tmdb<{ results: RawTmdbListItem[] }>(`/trending/${mediaType}/${window}`)
    return data.results
      .filter((result) => result.genre_ids?.includes(ANIMATION_GENRE_ID))
      .map((result) => tmdbToLoot(normalizeListItem(result, mediaType)))
  }
  const results = await Promise.allSettled([
    load('tv', 'day'),
    load('movie', 'day'),
    load('tv', 'week'),
    load('movie', 'week'),
  ])
  const [tvDay, movieDay, tvWeek, movieWeek] = results.map((result) => result.status === 'fulfilled' ? result.value : [])
  return uniqueLootShows([
    ...interleaveTrending([tvDay, movieDay]),
    ...interleaveTrending([tvWeek, movieWeek]),
  ])
}

function uniqueLootShows(shows: LootShow[]) {
  return Array.from(new Map(shows.map((show) => [`${show.mediaType}:${show.id}`, show])).values())
}

function rankVideos(videos: TmdbVideoAsset[]) {
  const typeRank: Record<string, number> = { Trailer: 4, Teaser: 3, Clip: 2, Featurette: 1 }
  return videos
    .filter((video) => video.site === 'YouTube' && typeRank[video.type])
    .sort((a, b) => {
      const officialDelta = Number(Boolean(b.official)) - Number(Boolean(a.official))
      if (officialDelta) return officialDelta
      const typeDelta = (typeRank[b.type] ?? 0) - (typeRank[a.type] ?? 0)
      if (typeDelta) return typeDelta
      return (b.published_at ?? '').localeCompare(a.published_at ?? '')
    })
}

export function getCachedAnimationTodayPulse() {
  const { key } = todayContext()
  if (todayPulseCache?.key === key) return todayPulseCache.data
  todayPulseCache = readTodayCache<AnimationTodayPulse>(TODAY_PULSE_STORAGE_KEY, key)
  return todayPulseCache?.data ?? null
}

export async function getAnimationTodayPulse(force = false): Promise<AnimationTodayPulse> {
  const context = todayContext()
  const stored = todayPulseCache?.key === context.key
    ? todayPulseCache
    : readTodayCache<AnimationTodayPulse>(TODAY_PULSE_STORAGE_KEY, context.key)
  if (!force && stored && Date.now() - stored.ts < TODAY_PULSE_TTL_MS) {
    todayPulseCache = stored
    return stored.data
  }
  if (todayPulseInflight?.key === context.key) return todayPulseInflight.request

  const request = (async () => {
    const dates = Array.from({ length: 7 }, (_, index) => dateKeyAfter(index))
    const [scheduleResults, trendingResult] = await Promise.all([
      Promise.allSettled(dates.map((date) => getAnimationScheduleForDate(date, context.timezone))),
      Promise.allSettled([getTrendingAnimation()]),
    ])

    const days: AnimationScheduleDay[] = dates.map((date, index) => ({
      date,
      entries: scheduleResults[index].status === 'fulfilled'
        ? scheduleResults[index].value.slice(0, 8).map((show) => ({ show }))
        : [],
    }))
    const trending = trendingResult[0].status === 'fulfilled' ? trendingResult[0].value.slice(0, 10) : []
    const data = {
      days,
      trending,
      generatedAt: Date.now(),
      partial: scheduleResults.some((result) => result.status === 'rejected') || trendingResult[0].status === 'rejected',
    }
    if (!days.some((day) => day.entries.length) && !trending.length) {
      throw new Error('Today in animation is temporarily unavailable')
    }
    todayPulseCache = { key: context.key, data, ts: Date.now() }
    writeTodayCache(TODAY_PULSE_STORAGE_KEY, todayPulseCache)
    return data
  })()
  todayPulseInflight = { key: context.key, request }

  try {
    return await request
  } finally {
    if (todayPulseInflight?.request === request) todayPulseInflight = null
  }
}

export function getCachedAnimationTodayTrailers() {
  const { key } = todayContext()
  if (todayTrailersCache?.key === key) return todayTrailersCache.data
  todayTrailersCache = readTodayCache<AnimationTrailerFeature[]>(TODAY_TRAILERS_STORAGE_KEY, key)
  return todayTrailersCache?.data ?? []
}

export async function getAnimationTodayTrailers(pulse: AnimationTodayPulse, force = false): Promise<AnimationTrailerFeature[]> {
  const context = todayContext()
  const stored = todayTrailersCache?.key === context.key
    ? todayTrailersCache
    : readTodayCache<AnimationTrailerFeature[]>(TODAY_TRAILERS_STORAGE_KEY, context.key)
  if (!force && stored && Date.now() - stored.ts < TODAY_TRAILER_TTL_MS) {
    todayTrailersCache = stored
    return stored.data
  }
  if (todayTrailersInflight?.key === context.key) return todayTrailersInflight.request

  const candidates = uniqueLootShows([
    ...pulse.trending,
    ...pulse.days.flatMap((day) => day.entries.map((entry) => entry.show)),
  ]).slice(0, 10)
  const request = Promise.allSettled(
    candidates.map(async (show) => ({ show, videos: rankVideos((await getShowVideos(show.id, show.mediaType)).results) })),
  ).then((results) => {
    const data = results
      .flatMap((result) => result.status === 'fulfilled' && result.value.videos[0]
        ? [{ show: result.value.show, video: result.value.videos[0] }]
        : [])
      .filter((feature, index, features) => features.findIndex((candidate) => candidate.video.key === feature.video.key) === index)
      .slice(0, 6)
    todayTrailersCache = { key: context.key, data, ts: Date.now() }
    writeTodayCache(TODAY_TRAILERS_STORAGE_KEY, todayTrailersCache)
    return data
  })
  todayTrailersInflight = { key: context.key, request }
  try {
    return await request
  } finally {
    if (todayTrailersInflight?.request === request) todayTrailersInflight = null
  }
}

function episodeCacheForContext(contextKey: string) {
  if (todayEpisodeCache?.key === contextKey && Date.now() - todayEpisodeCache.ts < TODAY_TRAILER_TTL_MS) {
    return todayEpisodeCache
  }
  todayEpisodeCache = readTodayCache<Record<string, TmdbEpisodeSummary | null>>(TODAY_EPISODE_STORAGE_KEY, contextKey)
  if (!todayEpisodeCache || Date.now() - todayEpisodeCache.ts >= TODAY_TRAILER_TTL_MS) {
    todayEpisodeCache = { key: contextKey, data: {}, ts: Date.now() }
  }
  return todayEpisodeCache
}

async function getAnimationScheduleEpisode(show: LootShow, date: string, force = false) {
  if (show.mediaType !== 'tv') return null
  const context = todayContext()
  const cache = episodeCacheForContext(context.key)
  const cacheKey = `${date}:${show.id}`
  const inflightKey = `${context.key}:${cacheKey}`
  if (!force && Object.prototype.hasOwnProperty.call(cache.data, cacheKey)) return cache.data[cacheKey]
  if (todayEpisodeInflight.has(inflightKey)) return todayEpisodeInflight.get(inflightKey)!

  const request = getShowDetail(show.id, 'tv')
    .then((detail) => {
      const scheduleTime = new Date(`${date}T12:00:00Z`).getTime()
      const episode = [detail.next_episode_to_air, detail.last_episode_to_air]
        .filter((candidate): candidate is TmdbEpisodeSummary => Boolean(candidate?.air_date))
        .map((candidate) => ({
          candidate,
          distance: Math.abs(new Date(`${candidate.air_date}T12:00:00Z`).getTime() - scheduleTime),
        }))
        .filter(({ distance }) => distance <= 24 * 60 * 60_000)
        .sort((a, b) => a.distance - b.distance)[0]?.candidate ?? null
      cache.data[cacheKey] = episode
      cache.ts = Date.now()
      writeTodayCache(TODAY_EPISODE_STORAGE_KEY, cache)
      return episode
    })
    .finally(() => todayEpisodeInflight.delete(inflightKey))
  todayEpisodeInflight.set(inflightKey, request)
  return request
}

export async function getAnimationScheduleDayEpisodes(day: AnimationScheduleDay, force = false): Promise<AnimationScheduleDay> {
  const results = await Promise.allSettled(
    day.entries.map(async (entry) => ({
      ...entry,
      episode: await getAnimationScheduleEpisode(entry.show, day.date, force),
    })),
  )
  return {
    ...day,
    entries: day.entries.map((entry, index) => (
      results[index].status === 'fulfilled' ? results[index].value : { ...entry, episode: null }
    )),
  }
}

export function getCachedDiscoverFeed(): DiscoverFeed | null {
  if (!feedCache) return null
  if (Date.now() - feedCache.ts >= FEED_TTL_MS) return null
  return feedCache.data
}

export async function getDiscoverFeed(): Promise<DiscoverFeed> {
  if (feedCache && Date.now() - feedCache.ts < FEED_TTL_MS) return feedCache.data
  if (inflight) return inflight
  inflight = (async () => {
    const recent = daysAgo(240)
    const [freshStudiosPrimary, freshStudiosExpanded, newAnimeRaw, newWesternRaw, grownUpNetworkRaw, grownUpKeywordRaw, allAgesRaw, animatedFilmsRaw, topRatedRaw] =
      await Promise.all([
        discoverPages('tv', { with_networks: '19|47|80', sort_by: 'first_air_date.desc', 'vote_count.gte': '5' }),
        discoverPages('tv', { with_networks: '56|213|49|453|1112', sort_by: 'first_air_date.desc', 'vote_count.gte': '5' }),
        discoverPages('tv', { with_origin_country: 'JP', sort_by: 'first_air_date.desc', 'first_air_date.gte': recent, 'vote_count.gte': '5' }),
        discoverPages('tv', { with_origin_country: 'US|GB|CA|AU', sort_by: 'first_air_date.desc', 'first_air_date.gte': recent, 'vote_count.gte': '5' }),
        discoverPages('tv', { with_networks: '19|47|80', sort_by: 'popularity.desc', 'vote_count.gte': '20' }),
        discoverPages('tv', { with_keywords: '161919', sort_by: 'popularity.desc', 'vote_count.gte': '20' }),
        discoverPages('tv', { with_genres: '10751', sort_by: 'popularity.desc', 'vote_count.gte': '20' }),
        discoverPages('movie', { sort_by: 'popularity.desc', 'vote_count.gte': '50' }),
        discoverPages('tv', { sort_by: 'vote_average.desc', 'vote_count.gte': '200' }),
      ])
    const freshStudiosRaw = Array.from(
      new Map([...freshStudiosPrimary, ...freshStudiosExpanded].map((show) => [show.id, show])).values(),
    )
    const map = (items: TmdbSearchResult[]) => items.map(tmdbToLoot)
    const grownUpRaw = Array.from(
      new Map([...grownUpNetworkRaw, ...grownUpKeywordRaw].map((show) => [show.id, show])).values(),
    ).filter(isSafeGrownUpAnimation)
    const basePool = map([...freshStudiosRaw, ...newAnimeRaw, ...newWesternRaw, ...grownUpRaw, ...allAgesRaw])
    const dayIndex = Math.floor(Date.now() / 86_400_000)
    const vibeIds = Array.from(new Set(basePool.flatMap((show) => show.vibeIds)))
    const viableVibes = vibeIds.filter((vibeId) => basePool.filter((show) => show.vibeIds.includes(vibeId)).length >= 10)
    const rotatingVibe = viableVibes.length ? viableVibes[dayIndex % viableVibes.length] : undefined
    const data: DiscoverFeed = {
      freshStudios: balanceTraditions(map(freshStudiosRaw), 40),
      newAnime: map(newAnimeRaw),
      newWestern: map(newWesternRaw),
      adultAnimation: balanceTraditions(map(grownUpRaw), 40),
      allAges: balanceTraditions(map(allAgesRaw), 40),
      vibeCrate: balanceTraditions(rotatingVibe ? basePool.filter((show) => show.vibeIds.includes(rotatingVibe)) : basePool, 40),
      animatedFilms: balanceTraditions(map(animatedFilmsRaw), 40),
      topRated: balanceTraditions(map(topRatedRaw), 40),
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
  let mediaType: MediaType = 'tv'
  let params: Record<string, string>
  const recent = daysAgo(240)

  switch (key) {
    case 'freshStudios':
      params = { with_networks: '19|47|80', sort_by: 'first_air_date.desc', 'vote_count.gte': '5' }
      break
    case 'newAnime':
      params = { with_origin_country: 'JP', sort_by: 'first_air_date.desc', 'first_air_date.gte': recent, 'vote_count.gte': '5' }
      break
    case 'newWestern':
      params = { with_origin_country: 'US|GB|CA|AU', sort_by: 'first_air_date.desc', 'first_air_date.gte': recent, 'vote_count.gte': '5' }
      break
    case 'adultAnimation':
      params = { with_networks: '19|47|80', sort_by: 'popularity.desc', 'vote_count.gte': '20' }
      break
    case 'allAges':
      params = { with_genres: '10751', sort_by: 'popularity.desc', 'vote_count.gte': '20' }
      break
    case 'vibeCrate':
      params = { with_networks: '19|47|80', sort_by: 'first_air_date.desc', 'vote_count.gte': '5' }
      break
    case 'animatedFilms':
      mediaType = 'movie'
      params = { sort_by: 'popularity.desc', 'vote_count.gte': '50' }
      break
    case 'topRated':
      params = { sort_by: 'vote_average.desc', 'vote_count.gte': '200' }
      break
    default:
      params = { sort_by: 'popularity.desc', 'vote_count.gte': '50' }
  }

  const data = await tmdb<{ results: RawTmdbListItem[]; total_pages: number }>(
    `/discover/${mediaType}`,
    withAnimationGenre({ ...params, page: p }),
  )

  return {
    results: data.results
      .filter((item) => key !== 'adultAnimation' || isSafeGrownUpAnimation(item))
      .map((item) => tmdbToLoot(normalizeListItem(item, mediaType))),
    totalPages: Math.max(1, data.total_pages ?? 1),
  }
}

export interface TmdbShowDetail extends TmdbSearchResult {
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  seasons?: { season_number: number; episode_count: number; name: string; poster_path?: string | null }[]
  genres: { id: number; name: string }[]
  overview?: string
  first_air_date?: string
  networks?: { id: number; name: string }[]
  created_by?: TmdbCreator[]
  production_companies?: TmdbProductionCompany[]
  tagline?: string
  runtime?: number
  release_date?: string
  next_episode_to_air?: TmdbEpisodeSummary | null
  last_episode_to_air?: TmdbEpisodeSummary | null
  belongs_to_collection?: {
    id: number
    name: string
    poster_path?: string | null
    backdrop_path?: string | null
  } | null
}

export interface TmdbCreator {
  id: number
  name: string
  profile_path: string | null
}

export interface TmdbProductionCompany {
  id: number
  name: string
  logo_path: string | null
  origin_country?: string
}

export interface TmdbCrewMember {
  id: number
  name: string
  department: string
  job: string
  profile_path: string | null
}

export interface TmdbImageAsset {
  file_path: string
  file_type?: string
  vote_average?: number
  width?: number
  height?: number
  iso_639_1?: string | null
}

export interface TmdbVideoAsset {
  id: string
  key: string
  name: string
  site: string
  type: string
  official?: boolean
  published_at?: string
}

export interface TmdbAggregateCastMember {
  id: number
  name: string
  profile_path: string | null
  roles?: { character: string; episode_count?: number }[]
  total_episode_count?: number
}

export interface TmdbWatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
}

export interface WatchProviderResult {
  link?: string
  flatrate?: TmdbWatchProvider[]
  free?: TmdbWatchProvider[]
  ads?: TmdbWatchProvider[]
  rent?: TmdbWatchProvider[]
  buy?: TmdbWatchProvider[]
}

export async function getShowDetail(id: number, mediaType: MediaType = 'tv') {
  const raw = await tmdb<TmdbShowDetail & { title?: string; release_date?: string }>(`/${mediaType}/${id}`)
  return {
    ...raw,
    name: raw.name ?? raw.title ?? 'Untitled',
    first_air_date: raw.first_air_date ?? raw.release_date,
    seasons: raw.seasons ?? [],
    mediaType,
  }
}

/** Resolve one known TMDB ID into the display model used by discovery rails. */
export async function getLootShow(id: number, mediaType: MediaType): Promise<LootShow | null> {
  const detail = await getShowDetail(id, mediaType)
  const genreIds = detail.genres.map((genre) => genre.id)
  if (!genreIds.includes(ANIMATION_GENRE_ID)) return null
  return tmdbToLoot({
    ...detail,
    genre_ids: genreIds,
    mediaType,
  })
}

export async function getShowKeywords(showId: number, mediaType: MediaType = 'tv') {
  const data = await tmdb<{
    results?: { id: number; name: string }[]
    keywords?: { id: number; name: string }[]
  }>(`/${mediaType}/${showId}/keywords`)
  return { results: data.results ?? data.keywords ?? [] }
}

export async function searchKeywords(query: string) {
  const data = await tmdb<{ results: { id: number; name: string }[] }>('/search/keyword', { query })
  return data.results
}

export async function discoverShowsByMood(
  keywordIds: number[],
  genreIds: number[],
  page = 1,
) {
  const params: Record<string, string> = {
    sort_by: 'vote_average.desc',
    'vote_count.gte': '80',
    page: String(page),
  }
  if (keywordIds.length) params.with_keywords = keywordIds.join('|') // OR — match any
  if (genreIds.length) params.with_genres = genreIds.join('|')       // OR — match any
  const data = await tmdb<{ results: RawTmdbListItem[] }>('/discover/tv', withAnimationGenre(params))
  return { results: data.results.map((result) => normalizeListItem(result, 'tv')) }
}

export async function getShowImages(showId: number, mediaType: MediaType = 'tv') {
  return tmdb<{
    backdrops: TmdbImageAsset[]
    logos: TmdbImageAsset[]
    posters: TmdbImageAsset[]
  }>(`/${mediaType}/${showId}/images`, {
    include_image_language: 'en,null',
  })
}

export async function getShowVideos(showId: number, mediaType: MediaType = 'tv') {
  return tmdb<{ results: TmdbVideoAsset[] }>(`/${mediaType}/${showId}/videos`, {
    include_video_language: 'en,null',
  })
}

export async function getAggregateCredits(showId: number, mediaType: MediaType = 'tv') {
  if (mediaType === 'tv') return tmdb<{ cast: TmdbAggregateCastMember[] }>(`/tv/${showId}/aggregate_credits`)
  const data = await tmdb<{ cast: Array<TmdbAggregateCastMember & { character?: string }> }>(`/movie/${showId}/credits`)
  return {
    cast: data.cast.map((member) => ({
      ...member,
      roles: member.character ? [{ character: member.character }] : [],
    })),
  }
}

export async function getShowRecommendations(showId: number, page = 1, mediaType: MediaType = 'tv') {
  const data = await tmdb<{ results: RawTmdbListItem[] }>(`/${mediaType}/${showId}/recommendations`, {
    page: String(page),
  })
  return {
    results: data.results
      .map((result) => normalizeListItem(result, mediaType))
      .filter((result) => result.genre_ids?.includes(ANIMATION_GENRE_ID)),
  }
}

export async function getWatchProviderRegions() {
  const data = await tmdb<{
    results: { iso_3166_1: string; english_name: string; native_name?: string }[]
  }>('/watch/providers/regions')
  return data.results.sort((a, b) => a.english_name.localeCompare(b.english_name))
}

export async function getShowWatchProviders(showId: number, region = getWatchRegion(), mediaType: MediaType = 'tv') {
  const cacheKey = `loot:watch-providers:${region}:${mediaType}:${showId}`
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null') as { at: number; data: WatchProviderResult | null } | null
    if (cached && Date.now() - cached.at < WATCH_PROVIDER_CACHE_MS) return cached.data
  } catch {
    // Ignore malformed or unavailable storage and fetch normally.
  }

  const data = await tmdb<{ results: Record<string, WatchProviderResult> }>(`/${mediaType}/${showId}/watch/providers`)
  const result = data.results[region] || null
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data: result }))
  } catch {
    // Provider availability remains usable without persistent caching.
  }
  return result
}

export async function getSimilarShows(showId: number, page = 1, mediaType: MediaType = 'tv') {
  const data = await tmdb<{ results: RawTmdbListItem[] }>(`/${mediaType}/${showId}/similar`, {
    page: String(page),
  })
  return {
    results: data.results
      .map((result) => normalizeListItem(result, mediaType))
      .filter((result) => result.genre_ids?.includes(ANIMATION_GENRE_ID)),
  }
}

export interface TmdbMovieCollection {
  id: number
  name: string
  posterPath: string | null
  backdropPath: string | null
  results: TmdbSearchResult[]
}

export async function getMovieCollection(collectionId: number): Promise<TmdbMovieCollection> {
  const data = await tmdb<{
    id?: number
    name?: string
    poster_path?: string | null
    backdrop_path?: string | null
    parts?: RawTmdbListItem[]
  }>(`/collection/${collectionId}`)
  return {
    id: data.id ?? collectionId,
    name: data.name ?? 'Untitled collection',
    posterPath: data.poster_path ?? null,
    backdropPath: data.backdrop_path ?? null,
    results: (data.parts ?? [])
      .map((result) => normalizeListItem(result, 'movie'))
      .filter((result) => result.genre_ids?.includes(ANIMATION_GENRE_ID)),
  }
}

export async function getSeason(showId: number, seasonNumber: number) {
  return tmdb<{
    name?: string
    poster_path?: string | null
    episodes: { episode_number: number; name: string; overview?: string | null; still_path?: string | null }[]
  }>(`/tv/${showId}/season/${seasonNumber}`)
}

export async function getCredits(showId: number, mediaType: MediaType = 'tv') {
  return tmdb<{
    cast: {
      id: number
      name: string
      character: string
      profile_path: string | null
    }[]
    crew: TmdbCrewMember[]
  }>(`/${mediaType}/${showId}/credits`)
}

export function imgUrl(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342') {
  if (!path) return ''
  return `${TMDB_IMG}/${size}${path}`
}
