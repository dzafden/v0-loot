import { useAnimation, motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X, RefreshCw } from 'lucide-react'
import {
  type DiscoverCategoryKey,
  getDiscoverFeed,
  getCachedDiscoverFeed,
  getDiscoverCategoryPage,
  getSeason,
  getShowDetail,
  getTmdbKey,
  getShowRecommendations,
  hasTmdbKey,
  imgUrl,
  searchShows,
  tmdbToLoot,
  type DiscoverFeed,
  type LootShow,
} from '../../lib/tmdb'
import { cacheSeason, upsertShow } from '../../data/queries'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import type { Genre, SeasonCache, Show, Tier, TierAssignment } from '../../types'
import { cn } from '../../lib/utils'
import { SaveStateButton } from '../../components/ui/SaveStateButton'
import { CollectibleMediaCard } from '../../components/show/CollectibleMediaCard'

interface Props {
  onOpenSettings: () => void
  onOpenShow: (show: Show) => void
}

const FEED_KEYS: (keyof DiscoverFeed)[] = ['trending', 'airingToday', 'popular', 'netflix', 'crime', 'hbo', 'scifi', 'apple', 'animation', 'mystery', 'amazon', 'topRated']
const TIER_TASTE_WEIGHT: Record<Tier, number> = { S: 9, A: 6, B: 3, C: 1, D: -3 }
const TASTE_ANCHOR_LIMIT = 18
const ACTIVE_ANCHOR_COUNT = 8
const TASTE_REC_TTL_MS = 24 * 60 * 60_000
const DISCOVER_IMPRESSIONS_KEY = 'loot:discover-impressions:v1'
const DISCOVER_LIBRARY_SNAPSHOT_KEY = 'loot:discover-library-snapshot:v1'

const tasteRecCache = new Map<string, { data: LootShow[]; ts: number }>()
const tasteRecInflight = new Map<string, Promise<LootShow[]>>()

type DiscoverImpression = {
  count: number
  lastDay: string
  mutedUntil?: string
}
type DiscoverImpressions = Record<string, DiscoverImpression>
type DiscoverLibrarySnapshot = {
  ownedShows: Show[]
  tierAssignments: TierAssignment[]
  signature: string
  createdAt: number
}

type WatchDropMode = 'mixed' | 'rank' | 'top8' | 'watchlist'
type MoodKey = 'happy' | 'action' | 'slow' | 'love' | 'dark' | 'comfort' | 'funny' | 'tense' | 'sad' | 'weird'
type EpisodeModifier = 'sweet' | 'messy' | 'breakup' | 'violence' | 'betrayal' | 'family' | 'friendship' | 'party' | 'case' | 'work'

type EpisodeOption = {
  showId: number
  seasonNumber: number
  episodeNumber: number
  name: string
  overview?: string | null
  stillPath?: string | null
}

type EpisodePick = {
  show: Show
  episode: EpisodeOption
}

type MoodDefinition = {
  key: MoodKey
  label: string
  colors: string
  genreHints: string[]
  words: string[]
  related: EpisodeModifier[]
  avoid: EpisodeModifier[]
}

const WATCH_DROP_MOODS: MoodDefinition[] = [
  {
    key: 'happy',
    label: 'Happy',
    colors: 'from-[#ffe86f] via-[#ff9f6e] to-[#66f2b5]',
    genreHints: ['Comedy', 'Animation', 'Family'],
    words: ['happy', 'joy', 'fun', 'party', 'birthday', 'wedding', 'holiday', 'laugh', 'smile', 'win', 'good', 'best'],
    related: ['party', 'friendship', 'sweet'],
    avoid: ['breakup', 'betrayal', 'violence'],
  },
  {
    key: 'action',
    label: 'Action',
    colors: 'from-[#ff4f70] via-[#ffb13d] to-[#faff70]',
    genreHints: ['Action', 'Adventure', 'Thriller', 'Sci-Fi'],
    words: ['fight', 'war', 'battle', 'escape', 'run', 'chase', 'attack', 'mission', 'hero', 'hunt', 'storm', 'danger'],
    related: ['case', 'violence', 'betrayal'],
    avoid: ['sweet', 'family'],
  },
  {
    key: 'slow',
    label: 'Slow',
    colors: 'from-[#9ed8ff] via-[#c9b8ff] to-[#ffe0a3]',
    genreHints: ['Drama', 'Romance', 'Documentary'],
    words: ['quiet', 'night', 'home', 'alone', 'memory', 'past', 'visit', 'return', 'letter', 'story', 'dream'],
    related: ['family', 'sweet', 'friendship'],
    avoid: ['violence', 'party', 'case'],
  },
  {
    key: 'love',
    label: 'Love',
    colors: 'from-[#ff6aa2] via-[#ffb0d0] to-[#ffe269]',
    genreHints: ['Romance', 'Comedy', 'Drama'],
    words: ['love', 'date', 'kiss', 'heart', 'wedding', 'romance', 'crush', 'valentine', 'couple', 'relationship'],
    related: ['sweet', 'messy', 'breakup', 'family'],
    avoid: ['violence', 'betrayal'],
  },
  {
    key: 'dark',
    label: 'Dark',
    colors: 'from-[#6957ff] via-[#af4dff] to-[#ff4c7b]',
    genreHints: ['Horror', 'Thriller', 'Crime', 'Mystery'],
    words: ['death', 'murder', 'killer', 'ghost', 'blood', 'secret', 'dark', 'fear', 'nightmare', 'haunt', 'trial'],
    related: ['betrayal', 'violence', 'case'],
    avoid: ['sweet', 'party'],
  },
  {
    key: 'comfort',
    label: 'Comfort',
    colors: 'from-[#77f2c2] via-[#ffd36a] to-[#ff8d6b]',
    genreHints: ['Comedy', 'Animation', 'Family'],
    words: ['home', 'family', 'friends', 'holiday', 'thanksgiving', 'christmas', 'comfort', 'best', 'baby', 'reunion'],
    related: ['friendship', 'family', 'sweet'],
    avoid: ['violence', 'betrayal'],
  },
  {
    key: 'funny',
    label: 'Funny',
    colors: 'from-[#f7ff5c] via-[#55f7c4] to-[#65b3ff]',
    genreHints: ['Comedy', 'Animation'],
    words: ['funny', 'joke', 'laugh', 'party', 'prank', 'game', 'weird', 'office', 'date', 'best'],
    related: ['party', 'work', 'friendship'],
    avoid: ['violence', 'breakup'],
  },
  {
    key: 'tense',
    label: 'Tense',
    colors: 'from-[#ff3f3f] via-[#f6a23a] to-[#3138ff]',
    genreHints: ['Thriller', 'Crime', 'Mystery', 'Drama'],
    words: ['secret', 'lie', 'trial', 'hunt', 'case', 'danger', 'missing', 'dead', 'finale', 'escape', 'enemy'],
    related: ['case', 'betrayal', 'violence'],
    avoid: ['sweet', 'party'],
  },
  {
    key: 'sad',
    label: 'Sad',
    colors: 'from-[#7fb4ff] via-[#9c83ff] to-[#ffc4d6]',
    genreHints: ['Drama', 'Romance'],
    words: ['goodbye', 'death', 'lost', 'alone', 'cry', 'sad', 'grief', 'breakup', 'funeral', 'memory', 'last'],
    related: ['breakup', 'family', 'betrayal'],
    avoid: ['party', 'case'],
  },
  {
    key: 'weird',
    label: 'Weird',
    colors: 'from-[#5fffd4] via-[#b45cff] to-[#ffec5f]',
    genreHints: ['Sci-Fi', 'Mystery', 'Animation', 'Comedy'],
    words: ['weird', 'strange', 'dream', 'magic', 'alien', 'future', 'ghost', 'mystery', 'experiment', 'monster'],
    related: ['case', 'party', 'messy'],
    avoid: ['sweet'],
  },
]

const MODIFIER_WORDS: Record<EpisodeModifier, string[]> = {
  sweet: ['sweet', 'nice', 'kiss', 'heart', 'wedding', 'baby', 'love', 'best'],
  messy: ['mess', 'awkward', 'secret', 'lie', 'mistake', 'trouble', 'bad', 'fight'],
  breakup: ['breakup', 'break', 'goodbye', 'ex', 'lost', 'alone', 'last'],
  violence: ['fight', 'murder', 'killer', 'blood', 'war', 'battle', 'attack', 'dead', 'death'],
  betrayal: ['betrayal', 'betray', 'lie', 'secret', 'enemy', 'traitor'],
  family: ['family', 'father', 'mother', 'dad', 'mom', 'sister', 'brother', 'parent', 'baby'],
  friendship: ['friend', 'friends', 'buddy', 'best', 'team', 'group'],
  party: ['party', 'birthday', 'wedding', 'holiday', 'christmas', 'thanksgiving', 'dance'],
  case: ['case', 'murder', 'mystery', 'detective', 'clue', 'investigation', 'trial'],
  work: ['work', 'office', 'job', 'boss', 'staff', 'meeting', 'shift'],
}

const MODIFIER_LABELS: Record<EpisodeModifier, string> = {
  sweet: 'Sweet',
  messy: 'Messy',
  breakup: 'Breakup',
  violence: 'Violence',
  betrayal: 'Betrayal',
  family: 'Family',
  friendship: 'Friendship',
  party: 'Party',
  case: 'Case',
  work: 'Work',
}

const EPISODE_FALLBACKS = [
  'Pilot',
  'The One Tonight',
  'The Comfort Pick',
  'The Rewatch',
  'The Good One',
  'The Wild Card',
]

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededShuffle<T>(items: T[], seed: number) {
  const shuffled = [...items]
  let state = seed || 1
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = Math.imul(state ^ (state >>> 15), 1 | state)
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state)
    const next = ((state ^ (state >>> 14)) >>> 0) / 4294967296
    const j = Math.floor(next * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function readDiscoverImpressions(): DiscoverImpressions {
  try {
    const raw = localStorage.getItem(DISCOVER_IMPRESSIONS_KEY)
    return raw ? JSON.parse(raw) as DiscoverImpressions : {}
  } catch {
    return {}
  }
}

function createLibrarySnapshot(ownedShows: Show[], tierAssignments: TierAssignment[]): DiscoverLibrarySnapshot {
  return {
    ownedShows,
    tierAssignments,
    signature: librarySignature(ownedShows, tierAssignments),
    createdAt: Date.now(),
  }
}

function readLibrarySnapshot(): DiscoverLibrarySnapshot | null {
  try {
    const raw = sessionStorage.getItem(DISCOVER_LIBRARY_SNAPSHOT_KEY)
    return raw ? JSON.parse(raw) as DiscoverLibrarySnapshot : null
  } catch {
    return null
  }
}

function writeLibrarySnapshot(snapshot: DiscoverLibrarySnapshot) {
  try {
    sessionStorage.setItem(DISCOVER_LIBRARY_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // Session storage can be unavailable; Discover should still work with in-memory state.
  }
}

function recordDiscoverImpressions(ids: number[]) {
  const day = todayKey()
  const existing = readDiscoverImpressions()
  const next: DiscoverImpressions = { ...existing }
  let changed = false

  for (const id of new Set(ids.filter(Boolean))) {
    const key = String(id)
    const current = next[key]
    if (current?.lastDay === day) continue
    const count = (current?.count ?? 0) + 1
    next[key] = {
      count,
      lastDay: day,
      mutedUntil: count >= 4 ? daysFromNow(7) : current?.mutedUntil,
    }
    changed = true
  }

  if (!changed) return null
  try {
    localStorage.setItem(DISCOVER_IMPRESSIONS_KEY, JSON.stringify(next))
  } catch {
    // localStorage can be full or blocked; Discover should still work.
  }
  return next
}

function impressionPenalty(show: LootShow, impressions: DiscoverImpressions = {}) {
  const record = impressions[String(show.id)]
  if (!record) return 0
  if (record.mutedUntil && record.mutedUntil >= todayKey()) return 220
  return Math.min(120, record.count * 24)
}

function librarySignature(ownedShows: Show[], assignments: TierAssignment[]) {
  const tiers = new Map(assignments.map((assignment) => [assignment.showId, assignment.tier]))
  return ownedShows
    .map((show) => `${show.id}:${tiers.get(show.id) ?? ''}:${show.top8Position ?? ''}`)
    .sort()
    .join('|')
}

function buildTasteWeights(ownedShows: Show[], assignments: TierAssignment[]) {
  const tierByShow = new Map(assignments.map((assignment) => [assignment.showId, assignment.tier]))
  const weights = new Map<string, number>()
  for (const show of ownedShows) {
    const tier = tierByShow.get(show.id)
    const base = 1 + (tier ? TIER_TASTE_WEIGHT[tier] : 0) + (typeof show.top8Position === 'number' ? 4 : 0)
    const genres = [...(show.genres ?? []), ...(show.rawGenres ?? [])].filter(Boolean)
    for (const genre of genres) {
      weights.set(genre, (weights.get(genre) ?? 0) + base)
    }
  }
  return weights
}

function anchorScore(show: Show, tierByShow: Map<number, Tier>) {
  const tier = tierByShow.get(show.id)
  const tierScore = tier ? TIER_TASTE_WEIGHT[tier] * 5 : 4
  const top8Score = typeof show.top8Position === 'number' ? 34 - show.top8Position * 2 : 0
  const daysSinceAdd = Math.max(0, (Date.now() - show.addedAt) / 86_400_000)
  const recencyScore = Math.max(0, 10 - daysSinceAdd)
  return tierScore + top8Score + recencyScore
}

function pickTasteAnchors(ownedShows: Show[], assignments: TierAssignment[]) {
  const tierByShow = new Map(assignments.map((assignment) => [assignment.showId, assignment.tier]))
  const positiveTaste = ownedShows.filter((show) => tierByShow.get(show.id) !== 'D' && tierByShow.get(show.id) !== 'C')
  const sorted = (positiveTaste.length ? positiveTaste : ownedShows)
    .slice()
    .sort((a, b) => anchorScore(b, tierByShow) - anchorScore(a, tierByShow))
  const selected: Show[] = []
  const genreCounts = new Map<string, number>()

  for (const show of sorted) {
    const genre = show.genres?.[0] ?? show.rawGenres?.[0] ?? 'Default'
    if ((genreCounts.get(genre) ?? 0) >= 2) continue
    selected.push(show)
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)
    if (selected.length >= TASTE_ANCHOR_LIMIT) return selected
  }

  for (const show of sorted) {
    if (selected.some((picked) => picked.id === show.id)) continue
    selected.push(show)
    if (selected.length >= TASTE_ANCHOR_LIMIT) return selected
  }

  return selected
}

function rotateActiveAnchors(anchors: Show[], signature: string) {
  if (anchors.length <= ACTIVE_ANCHOR_COUNT) return anchors
  const seed = hashString(`${todayKey()}:${signature}`)
  const shuffled = seededShuffle(anchors, seed)
  return shuffled.slice(0, ACTIVE_ANCHOR_COUNT)
}

function tasteScore(show: LootShow, tasteWeights: Map<string, number>, recommendationBoost: Map<number, number> = new Map(), impressions: DiscoverImpressions = {}) {
  return (recommendationBoost.get(show.id) ?? 0)
    + (tasteWeights.get(show.genre) ?? 0) * 10
    + show.rating * 1.5
    + Math.log10(Math.max(1, show.popularity)) * 3
    - impressionPenalty(show, impressions)
}

function recommendationBoosts(shows: LootShow[]) {
  const boosts = new Map<number, number>()
  shows.forEach((show, index) => {
    boosts.set(show.id, Math.max(boosts.get(show.id) ?? 0, 90 - index * 2))
  })
  return boosts
}

function uniqueShows(shows: LootShow[]) {
  const seen = new Set<number>()
  return shows.filter((show) => {
    if (seen.has(show.id)) return false
    seen.add(show.id)
    return true
  })
}

function personalizeShows(
  shows: LootShow[],
  tasteWeights: Map<string, number>,
  ownedSet: Set<number>,
  options: { allowOwned?: boolean; featuredId?: number; recommendationBoost?: Map<number, number>; preserveOrder?: boolean; impressions?: DiscoverImpressions } = {},
) {
  const filtered = uniqueShows(shows)
    .filter((show) => show.id !== options.featuredId)
    .filter((show) => options.allowOwned || !ownedSet.has(show.id))
  if (options.preserveOrder) return filtered
  return filtered.sort((a, b) =>
    tasteScore(b, tasteWeights, options.recommendationBoost, options.impressions)
    - tasteScore(a, tasteWeights, options.recommendationBoost, options.impressions),
  )
}

function diversifyShows(shows: LootShow[], limit: number, maxPerGenre = 3) {
  const picked: LootShow[] = []
  const genreCounts = new Map<string, number>()
  for (const show of shows) {
    const count = genreCounts.get(show.genre) ?? 0
    if (count >= maxPerGenre) continue
    picked.push(show)
    genreCounts.set(show.genre, count + 1)
    if (picked.length >= limit) return picked
  }
  for (const show of shows) {
    if (picked.some((pickedShow) => pickedShow.id === show.id)) continue
    picked.push(show)
    if (picked.length >= limit) return picked
  }
  return picked
}

function canonRow(
  feed: DiscoverFeed,
  tasteWeights: Map<string, number>,
  ownedSet: Set<number>,
  recommendations: LootShow[],
  recommendationBoost: Map<number, number>,
  impressions: DiscoverImpressions,
  featuredId?: number,
) {
  return personalizeShows(
    [...recommendations, ...FEED_KEYS.flatMap((key) => feed[key])],
    tasteWeights,
    ownedSet,
    { featuredId, recommendationBoost, impressions },
  )
}

function discoverHero(
  feed: DiscoverFeed,
  tasteWeights: Map<string, number>,
  ownedSet: Set<number>,
  recommendations: LootShow[],
  recommendationBoost: Map<number, number>,
  impressions: DiscoverImpressions,
  seed: number,
) {
  const pool = [
    ...recommendations,
    ...feed.trending,
    ...feed.popular,
    ...feed.airingToday,
    ...feed.topRated,
    ...feed.netflix,
    ...feed.hbo,
    ...feed.apple,
  ]
  const ranked = diversifyShows(personalizeShows(pool, tasteWeights, ownedSet, { recommendationBoost, impressions }), 18, 3)
  const rotatingTop = seededShuffle(ranked.slice(0, 10), seed)
  return rotatingTop[0]
    ?? personalizeShows(pool, tasteWeights, ownedSet, { allowOwned: true, recommendationBoost, impressions })[0]
}

async function getTasteRecommendationPool(anchors: Show[]) {
  if (!anchors.length) return []
  const cacheKey = anchors.map((show) => show.id).join(',')
  const cached = tasteRecCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TASTE_REC_TTL_MS) return cached.data

  const inflight = tasteRecInflight.get(cacheKey)
  if (inflight) return inflight

  const request = Promise.all(
    anchors.map((anchor) =>
      getShowRecommendations(anchor.id, 1)
        .then((data) => data.results.map(tmdbToLoot))
        .catch(() => []),
    ),
  ).then((groups) => {
    const data = uniqueShows(groups.flat()).filter((show) => show.posterPath || show.backdropPath)
    tasteRecCache.set(cacheKey, { data, ts: Date.now() })
    return data
  })

  tasteRecInflight.set(cacheKey, request)
  try {
    return await request
  } finally {
    tasteRecInflight.delete(cacheKey)
  }
}

function showMoodText(show: Show) {
  return [
    show.name,
    show.overview,
    ...(show.genres ?? []),
    ...(show.rawGenres ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
}

function wordScore(text: string, words: string[]) {
  return words.reduce((score, word) => score + (text.includes(word.toLowerCase()) ? 1 : 0), 0)
}

function episodeText(show: Show, episode: EpisodeOption) {
  return `${show.name} ${show.overview ?? ''} ${(show.genres ?? []).join(' ')} ${(show.rawGenres ?? []).join(' ')} ${episode.name} ${episode.overview ?? ''}`.toLowerCase()
}

function modifierScore(text: string, modifiers: EpisodeModifier[]) {
  return modifiers.reduce((score, modifier) => score + wordScore(text, MODIFIER_WORDS[modifier]), 0)
}

function scoreEpisodeForMood(show: Show, episode: EpisodeOption, mood: MoodDefinition, include: EpisodeModifier[], exclude: EpisodeModifier[]) {
  const text = episodeText(show, episode)
  const genreScore = mood.genreHints.some((genre) => show.genres?.includes(genre as Genre) || show.rawGenres?.includes(genre)) ? 1.5 : 0
  return wordScore(text, mood.words) * 2 + genreScore + modifierScore(text, include) * 1.4 - modifierScore(text, exclude) * 2.8
}

function showSupportsMood(show: Show, mood: MoodDefinition, episodes: EpisodeOption[] = []) {
  if (episodes.length) {
    return episodes.some((episode) => scoreEpisodeForMood(show, episode, mood, [], mood.avoid) > 0.8)
  }
  const text = showMoodText(show)
  const genreMatch = mood.genreHints.some((genre) => show.genres?.includes(genre as Genre) || show.rawGenres?.includes(genre))
  return genreMatch || wordScore(text, mood.words) > 0
}

function cachedEpisodeOptions(showId: number, seasons: SeasonCache[]) {
  return seasons
    .filter((season) => season.showId === showId)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .flatMap((season) =>
      season.episodes.map((episode): EpisodeOption => ({
        showId,
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episode_number,
        name: episode.name || EPISODE_FALLBACKS[(showId + season.seasonNumber + episode.episode_number) % EPISODE_FALLBACKS.length],
        overview: episode.overview ?? null,
        stillPath: episode.still_path ?? null,
      })),
    )
}

function fallbackEpisode(show: Show, seed: number): EpisodeOption {
  const seasonNumber = (seed % 4) + 1
  const episodeNumber = ((seed >>> 3) % 12) + 1
  return {
    showId: show.id,
    seasonNumber,
    episodeNumber,
    name: EPISODE_FALLBACKS[seed % EPISODE_FALLBACKS.length],
    stillPath: null,
  }
}

async function loadEpisodeOptions(show: Show) {
  const cached = cachedEpisodeOptions(show.id, await db.seasonCache.where({ showId: show.id }).toArray())
  if (cached.length) return cached
  if (!getTmdbKey()) return [fallbackEpisode(show, hashString(show.name))]

  try {
    const detail = await getShowDetail(show.id)
    const realSeasons = detail.seasons
      .filter((season) => season.season_number !== 0 && season.episode_count > 0)
      .sort((a, b) => a.season_number - b.season_number)

    const loaded = await Promise.all(
      realSeasons.map(async (season) => {
        const data = await getSeason(show.id, season.season_number)
        await cacheSeason({
          key: `${show.id}-${season.season_number}`,
          showId: show.id,
          seasonNumber: season.season_number,
          name: data.name ?? season.name,
          posterPath: data.poster_path ?? season.poster_path ?? null,
          episodes: data.episodes.map((episode) => ({
            episode_number: episode.episode_number,
            name: episode.name,
            overview: episode.overview ?? null,
            still_path: episode.still_path ?? null,
          })),
          fetchedAt: Date.now(),
        })
        return data.episodes.map((episode): EpisodeOption => ({
          showId: show.id,
          seasonNumber: season.season_number,
          episodeNumber: episode.episode_number,
          name: episode.name || EPISODE_FALLBACKS[(show.id + season.season_number + episode.episode_number) % EPISODE_FALLBACKS.length],
          overview: episode.overview ?? null,
          stillPath: episode.still_path ?? null,
        }))
      }),
    )
    const episodes = loaded.flat()
    return episodes.length ? episodes : [fallbackEpisode(show, hashString(show.name))]
  } catch {
    return [fallbackEpisode(show, hashString(show.name))]
  }
}

function pickEpisode(
  show: Show,
  episodes: EpisodeOption[],
  mood: MoodDefinition,
  include: EpisodeModifier[],
  exclude: EpisodeModifier[],
  dealSeed: number,
) {
  const pool = episodes.length ? episodes : [fallbackEpisode(show, dealSeed)]
  const scored = pool
    .map((episode) => ({
      episode,
      score: scoreEpisodeForMood(show, episode, mood, include, exclude) + (hashString(`${dealSeed}:${show.id}:${episode.seasonNumber}:${episode.episodeNumber}`) % 100) / 250,
    }))
    .sort((a, b) => b.score - a.score)
  return scored[0]?.episode ?? fallbackEpisode(show, dealSeed)
}

function distinctSlotShows(sourcePools: Show[][], slotIndexes: number[]) {
  const used = new Set<number>()
  return sourcePools.map((pool, slot) => {
    if (!pool.length) return undefined
    const start = slotIndexes[slot] % pool.length
    for (let offset = 0; offset < pool.length; offset++) {
      const candidate = pool[(start + offset) % pool.length]
      if (used.has(candidate.id)) continue
      used.add(candidate.id)
      return candidate
    }
    const fallback = pool[start]
    used.add(fallback.id)
    return fallback
  })
}

export function Discover({ onOpenSettings, onOpenShow }: Props) {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [results, setResults] = useState<LootShow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [feed, setFeed] = useState<DiscoverFeed | null>(() => getCachedDiscoverFeed())
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<null | { key: DiscoverCategoryKey; title: string }>(null)
  const [categoryItems, setCategoryItems] = useState<LootShow[]>([])
  const [categoryPage, setCategoryPage] = useState(1)
  const [categoryTotalPages, setCategoryTotalPages] = useState(1)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [tasteRecommendations, setTasteRecommendations] = useState<LootShow[]>([])
  const [impressions] = useState<DiscoverImpressions>(() => readDiscoverImpressions())
  const [librarySnapshot, setLibrarySnapshot] = useState<DiscoverLibrarySnapshot | null>(() => readLibrarySnapshot())
  const [watchDropOpen, setWatchDropOpen] = useState(false)
  const pullStartY = useRef<number | null>(null)

  const keyOk = hasTmdbKey()

  const ownedShows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const tierAssignments = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const watchlistShows = useDexieQuery(['watchlistShows'], () => db.watchlistShows.toArray(), [], [])
  const watchlistShelves = useDexieQuery(['watchlistShelves'], () => db.watchlistShelves.toArray(), [], [])
  const seasonCache = useDexieQuery(['seasonCache'], () => db.seasonCache.toArray(), [], [])
  const liveOwnedIds = useMemo(() => ownedShows.map((s) => s.id), [ownedShows])
  const liveOwnedSet = useMemo(() => new Set(liveOwnedIds), [liveOwnedIds])
  const profileShows = librarySnapshot?.ownedShows ?? []
  const profileTierAssignments = librarySnapshot?.tierAssignments ?? []
  const profileOwnedIds = useMemo(() => profileShows.map((s) => s.id), [profileShows])
  const profileOwnedSet = useMemo(() => new Set(profileOwnedIds), [profileOwnedIds])
  const tasteWeights = useMemo(() => buildTasteWeights(profileShows, profileTierAssignments), [profileShows, profileTierAssignments])
  const tasteAnchors = useMemo(() => pickTasteAnchors(profileShows, profileTierAssignments), [profileShows, profileTierAssignments])
  const tasteSignature = librarySnapshot?.signature ?? ''
  const activeTasteAnchors = useMemo(() => rotateActiveAnchors(tasteAnchors, tasteSignature), [tasteAnchors, tasteSignature])
  const discoverSeed = useMemo(() => hashString(`${todayKey()}:${tasteSignature}`), [tasteSignature])
  const recommendationBoost = useMemo(() => recommendationBoosts(tasteRecommendations), [tasteRecommendations])

  useEffect(() => {
    if (librarySnapshot) return
    const timer = window.setTimeout(() => {
      const snapshot = createLibrarySnapshot(ownedShows, tierAssignments)
      writeLibrarySnapshot(snapshot)
      setLibrarySnapshot(snapshot)
    }, 260)
    return () => window.clearTimeout(timer)
  }, [librarySnapshot, ownedShows, tierAssignments])

  const refreshDiscoverMix = () => {
    const snapshot = createLibrarySnapshot(ownedShows, tierAssignments)
    writeLibrarySnapshot(snapshot)
    setLibrarySnapshot(snapshot)
    setTasteRecommendations([])
  }

  // Trending feed — fetched on mount, cached at module level for 5 min.
  useEffect(() => {
    if (!keyOk) return
    let cancelled = false
    if (!feed) setFeedLoading(true)
    setFeedError(null)
    getDiscoverFeed()
      .then((data) => {
        if (!cancelled) setFeed(data)
      })
      .catch((e) => {
        if (!cancelled) setFeedError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [keyOk])

  useEffect(() => {
    if (!keyOk || activeTasteAnchors.length === 0) {
      setTasteRecommendations((prev) => (prev.length === 0 ? prev : []))
      return
    }
    let cancelled = false
    getTasteRecommendationPool(activeTasteAnchors)
      .then((shows) => {
        if (!cancelled) setTasteRecommendations(shows.filter((show) => !profileOwnedSet.has(show.id)))
      })
      .catch(() => {
        if (!cancelled) setTasteRecommendations((prev) => (prev.length === 0 ? prev : []))
      })
    return () => {
      cancelled = true
    }
  }, [keyOk, activeTasteAnchors, profileOwnedSet])

  // Search debounce.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!keyOk) return
    if (!debouncedQ.trim()) {
      setResults([])
      setSearchError(null)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    setSearchError(null)
    searchShows(debouncedQ.trim())
      .then((res) => {
        if (!cancelled) setResults(res.map(tmdbToLoot))
      })
      .catch((e) => {
        if (!cancelled) setSearchError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQ, keyOk])

  useEffect(() => {
    if (!activeCategory || !keyOk) return
    let cancelled = false
    setCategoryLoading(true)
    getDiscoverCategoryPage(activeCategory.key, categoryPage)
      .then((data) => {
        if (cancelled) return
        setCategoryTotalPages(data.totalPages)
        setCategoryItems((prev) => (categoryPage === 1 ? data.results : [...prev, ...data.results]))
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeCategory, categoryPage, keyOk])

  useEffect(() => {
    if (!activeCategory || !sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry.isIntersecting || categoryLoading) return
        if (categoryPage >= categoryTotalPages) return
        setCategoryPage((p) => p + 1)
      },
      { rootMargin: '220px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [activeCategory, categoryLoading, categoryPage, categoryTotalPages])

  const heroShow = useMemo(
    () => feed ? discoverHero(feed, tasteWeights, profileOwnedSet, tasteRecommendations, recommendationBoost, impressions, discoverSeed) : undefined,
    [discoverSeed, feed, impressions, profileOwnedSet, recommendationBoost, tasteRecommendations, tasteWeights],
  )

  const handleImpressions = (ids: number[]) => {
    recordDiscoverImpressions(ids)
  }

  const openCategory = (key: DiscoverCategoryKey, title: string) => {
    setActiveCategory({ key, title })
    setCategoryItems([])
    setCategoryPage(1)
    setCategoryTotalPages(1)
  }

  const onDiscoverTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (window.scrollY > 8 || query.trim() || activeCategory) {
      pullStartY.current = null
      return
    }
    pullStartY.current = event.touches[0]?.clientY ?? null
  }

  const onDiscoverTouchEnd: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (pullStartY.current === null) return
    const endY = event.changedTouches[0]?.clientY ?? pullStartY.current
    if (endY - pullStartY.current > 76) setWatchDropOpen(true)
    pullStartY.current = null
  }

  return (
    <div className="relative flex flex-col min-h-full pb-28 overflow-hidden" onTouchStart={onDiscoverTouchStart} onTouchEnd={onDiscoverTouchEnd}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_50%_0%,rgba(245,196,83,0.16),transparent_22rem)]" aria-hidden />
      <div className="sticky top-0 z-30 bg-[#08070a]/45 backdrop-blur-2xl pt-4 pb-3 px-4 flex flex-col gap-3">
        <div className="relative group">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 group-focus-within:text-[#f5c453] transition-colors pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for shows..."
            disabled={!keyOk}
            className="w-full bg-black/26 border border-white/[0.08] rounded-full py-2.5 pl-9 pr-9 font-bold text-sm text-white placeholder:text-white/28 outline-none focus:border-[#f5c453]/55 focus:bg-black/42 transition-colors disabled:opacity-50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          {!query && librarySnapshot && (
            <button
              onClick={refreshDiscoverMix}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/28 hover:text-[#f5c453] active:scale-90 transition-colors"
              aria-label="Refresh Discover"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
        {!query && !activeCategory && (
          <button
            onClick={() => setWatchDropOpen(true)}
            className="group relative h-11 overflow-hidden rounded-[18px] bg-[#171018] text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.36)] active:scale-[0.985]"
            aria-label="Open Watch Drop"
          >
            <span className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,232,111,0.28),rgba(255,87,130,0.18),rgba(102,242,181,0.22))]" />
            <span className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/42 shadow-[0_0_18px_rgba(255,255,255,0.45)]" />
            <span className="relative z-10 flex h-full items-center justify-between px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/78">Pull for Watch Drop</span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-black/32 text-[16px] font-black text-white/80">⌄</span>
            </span>
          </button>
        )}
        {searchError && <p className="text-xs text-rose-300">{searchError}</p>}
      </div>

      <div className="relative z-10 flex-1 pt-1">
        {activeCategory ? (
          <CategoryGrid
            title={activeCategory.title}
            items={categoryItems}
            loading={categoryLoading}
            sentinelRef={sentinelRef}
            ownedIds={liveOwnedSet}
            onOpenShow={onOpenShow}
            onBack={() => setActiveCategory(null)}
          />
        ) : !keyOk ? (
          <NoKey onOpenSettings={onOpenSettings} />
        ) : query.trim() ? (
          <SearchResults loading={searchLoading} results={results} ownedIds={liveOwnedIds} onOpenShow={onOpenShow} />
        ) : feedError ? (
          <p className="px-5 py-10 text-center text-rose-300 text-sm">{feedError}</p>
        ) : feedLoading || !feed || !librarySnapshot ? (
          <SkeletonRows />
        ) : (
          <>
            <PortalHero show={heroShow} isOwned={heroShow ? liveOwnedSet.has(heroShow.id) : false} onOpenShow={onOpenShow} />
            <FeedRows
              feed={feed}
              ownedIds={liveOwnedIds}
              profileOwnedIds={profileOwnedIds}
              profileShows={profileShows}
              profileTierAssignments={profileTierAssignments}
              tasteRecommendations={tasteRecommendations}
              recommendationBoost={recommendationBoost}
              impressions={impressions}
              discoverSeed={discoverSeed}
              onImpressions={handleImpressions}
              onOpenCategory={openCategory}
              onOpenShow={onOpenShow}
              featuredId={heroShow?.id}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {watchDropOpen && (
          <WatchDropPanel
            ownedShows={ownedShows}
            tierAssignments={tierAssignments}
            watchlistShows={watchlistShows}
            watchlistShelves={watchlistShelves}
            onClose={() => setWatchDropOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

type WatchDropPath = 'rewatch' | 'discover'
type WatchDropResult = { kind: 'rewatch'; picks: EpisodePick[] } | { kind: 'discover'; show: LootShow }

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 }

function WatchDropPanel({
  ownedShows,
  tierAssignments,
  watchlistShows,
  watchlistShelves,
  onClose,
}: {
  ownedShows: Show[]
  tierAssignments: TierAssignment[]
  watchlistShows: Show[]
  watchlistShelves: { id: string; name: string; showIds: number[]; position?: number; createdAt: number }[]
  onClose: () => void
}) {
  const [path, setPath] = useState<WatchDropPath | null>(null)
  const [selected, setSelected] = useState<Show[]>([])
  const [query, setQuery] = useState('')
  const [activeMood, setActiveMood] = useState<MoodKey | null>(null)
  const [result, setResult] = useState<WatchDropResult | null>(null)
  const [loading, setLoading] = useState(false)

  const tierByShow = useMemo(() => new Map(tierAssignments.map((a) => [a.showId, a.tier])), [tierAssignments])

  const watchlistIds = useMemo(() => new Set(watchlistShows.map((s) => s.id)), [watchlistShows])

  // Rewatch: owned shows sorted by tier (S→A→B→C→D→unranked), then top8 bonus
  const rewatchList = useMemo(() =>
    [...ownedShows].sort((a, b) => {
      const ta = TIER_ORDER[tierByShow.get(a.id) ?? ''] ?? 5
      const tb = TIER_ORDER[tierByShow.get(b.id) ?? ''] ?? 5
      if (ta !== tb) return ta - tb
      return anchorScore(b, tierByShow) - anchorScore(a, tierByShow)
    }),
  [ownedShows, tierByShow])

  // Discover: watchlist first (these are your queued shows), then rest of library as taste anchors
  const discoverList = useMemo(() => [
    ...watchlistShows,
    ...ownedShows.filter((s) => !watchlistIds.has(s.id)),
  ], [watchlistShows, ownedShows, watchlistIds])

  const sourceList = path === 'rewatch' ? rewatchList : discoverList

  const filteredList = useMemo(() => {
    if (!query.trim()) return sourceList
    const q = query.toLowerCase()
    return sourceList.filter((s) => s.name.toLowerCase().includes(q))
  }, [sourceList, query])

  const mood = WATCH_DROP_MOODS.find((m) => m.key === activeMood) ?? null

  const toggleShow = (show: Show) => {
    setResult(null)
    setSelected((prev) => {
      if (prev.some((s) => s.id === show.id)) return prev.filter((s) => s.id !== show.id)
      if (prev.length >= 3) return prev
      return [...prev, show]
    })
  }

  const handleGo = async () => {
    if (selected.length === 0 || loading) return
    setLoading(true)
    try {
      if (path === 'rewatch') {
        const seed = hashString(`${Date.now()}:${selected.map((s) => s.id).join(':')}:${activeMood ?? 'none'}`)
        const moodDef = mood ?? WATCH_DROP_MOODS[0]
        const pools = await Promise.all(selected.map(loadEpisodeOptions))
        const picks: EpisodePick[] = selected.map((show, i) => ({
          show,
          episode: pickEpisode(show, pools[i], moodDef, [], [], seed + i * 997),
        }))
        setResult({ kind: 'rewatch', picks })
      } else {
        const ownedIds = new Set(ownedShows.map((s) => s.id))
        const groups = await Promise.all(
          selected.map((s) =>
            getShowRecommendations(s.id)
              .then((r) => r.results.map(tmdbToLoot))
              .catch(() => [] as LootShow[]),
          ),
        )
        // Interleave results from each anchor so all anchors are represented
        const merged: LootShow[] = []
        const maxLen = Math.max(...groups.map((g) => g.length))
        for (let i = 0; i < maxLen; i++) {
          for (const group of groups) {
            if (group[i]) merged.push(group[i])
          }
        }
        const seen = new Set<number>()
        const candidates = merged.filter((s) => {
          if (seen.has(s.id) || ownedIds.has(s.id)) return false
          seen.add(s.id)
          return true
        })
        // If mood selected, prefer candidates whose overview matches
        const scored = mood
          ? candidates.map((s) => ({
              s,
              score: wordScore(`${s.title} ${s.overview} ${s.genre}`.toLowerCase(), mood.words)
                + (mood.genreHints.some((g) => s.genre === g) ? 3 : 0),
            })).sort((a, b) => b.score - a.score).map((x) => x.s)
          : candidates
        setResult({ kind: 'discover', show: scored[0] ?? candidates[0] })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (result) { setResult(null); return }
    if (path) { setPath(null); setSelected([]); setQuery(''); setActiveMood(null); return }
    onClose()
  }

  // Deterministic poster scatter for the canvas
  const canvasPosters = useMemo(() => {
    const pool = seededShuffle([...ownedShows].filter((s) => s.posterPath), hashString('canvas-v1')).slice(0, 32)
    return pool.map((show, i) => {
      const s = hashString(`p:${show.id}:${i}`)
      const s2 = hashString(`q:${show.id}:${i}`)
      return {
        show,
        left: 2 + (s % 84),
        top: -12 + (s2 % 110),
        rot: -22 + (s % 44),
        w: 62 + (s % 48),
        zIndex: (s % 6) + 1,
        blur: s % 5 === 0 ? 1.5 : 0,
        opacity: 0.55 + (s % 4) * 0.12,
        animY: 7 + (s % 13),
        animDur: 3.2 + (s % 32) / 10,
        animDelay: (s2 % 38) / 10,
      }
    })
  }, [ownedShows])

  return (
    <motion.div
      initial={{ y: '-104%', opacity: 0.7 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '-104%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 210, damping: 26 }}
      className="fixed inset-x-0 top-0 z-50 mx-auto h-svh w-full max-w-md overflow-hidden bg-[#060508]"
    >
      <div className="absolute inset-0 loot-noise opacity-40" />

      {/* ── Mode select ─────────────────────────────────── */}
      {!path && (
        <>
          {/* Floating poster canvas */}
          <div className="absolute inset-0 overflow-hidden">
            {canvasPosters.map(({ show, left, top, rot, w, zIndex, blur, opacity, animY, animDur, animDelay }) => (
              <motion.div
                key={show.id}
                className="absolute overflow-hidden rounded-[10px] shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
                style={{
                  left: `${left}%`, top: `${top}%`,
                  width: w, height: w * 1.5,
                  zIndex, rotate: rot,
                  filter: blur ? `blur(${blur}px)` : undefined,
                  opacity,
                  willChange: 'transform',
                }}
                animate={{ y: [0, -animY, 0] }}
                transition={{ repeat: Infinity, duration: animDur, delay: animDelay, ease: 'easeInOut' }}
              >
                <img src={imgUrl(show.posterPath!, 'w185')} alt="" className="h-full w-full object-cover" />
              </motion.div>
            ))}
          </div>

          {/* Deep gradient — vignette + bottom fog so buttons read clearly */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,transparent_0%,rgba(6,5,8,0.72)_55%,rgba(6,5,8,0.96)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#060508] via-[#060508]/90 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#060508]/80 to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute left-4 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-[22px] leading-none text-white/60 ring-1 ring-white/10 active:scale-90"
          >×</button>

          {/* Bottom zone — thumb-reachable */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-12 pt-6">
            <p className="mb-5 text-[34px] font-black leading-[1.05] tracking-[-0.03em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
              What are you<br />looking for?
            </p>
            <div className="flex flex-col gap-3">
              {([
                { key: 'rewatch' as const, title: 'Rewatch', sub: 'Pick an episode from shows you love', colors: 'from-[#ffe86f] via-[#ffb86f] to-[#ff7eb3]' },
                { key: 'discover' as const, title: 'Find Something New', sub: 'Get a recommendation based on your taste', colors: 'from-[#59f5c6] via-[#7b8eff] to-[#d96fff]' },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPath(opt.key)}
                  className="relative overflow-hidden rounded-[20px] py-4 px-5 text-left shadow-[0_18px_44px_rgba(0,0,0,0.6),0_3px_0_rgba(0,0,0,0.5)] active:scale-[0.98]"
                >
                  <span className={cn('absolute inset-0 bg-gradient-to-br', opt.colors)} />
                  <span className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.45),transparent_48%,rgba(0,0,0,0.18))]" />
                  <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/18 rounded-b-[20px]" />
                  <span className="relative z-10 block text-[20px] font-black text-black leading-none">{opt.title}</span>
                  <span className="relative z-10 mt-0.5 block text-[12px] font-semibold text-black/60">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Picker + result ──────────────────────────────── */}
      {path && (
        <div className="relative z-10 flex h-full flex-col">
          {/* Subtle bg */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,232,111,0.1),transparent_22rem),radial-gradient(circle_at_80%_30%,rgba(89,245,198,0.08),transparent_18rem)]" />

          {/* Header */}
          <div className="relative flex items-center gap-3 px-4 pt-4 pb-3">
            <button
              onClick={handleBack}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[22px] leading-none text-white/70 ring-1 ring-white/10 active:scale-90"
            >‹</button>
            <div className="flex-1 text-center text-[13px] font-black uppercase tracking-[0.18em] text-white/40">
              {path === 'rewatch' ? 'Rewatch' : 'Find Something New'}
            </div>
            <div className="h-9 w-9" />
          </div>

          {!result && (
            <div className="flex flex-1 flex-col min-h-0 px-4">

              {/* Selected chips */}
              {selected.length > 0 && (
                <div className="mb-3 flex gap-2">
                  {selected.map((show) => (
                    <button
                      key={show.id}
                      onClick={() => toggleShow(show)}
                      className="relative h-14 overflow-hidden rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.5)] active:scale-95"
                      style={{ width: 40 }}
                    >
                      {show.posterPath && <img src={imgUrl(show.posterPath, 'w185')} alt="" className="h-full w-full object-cover" />}
                      <div className="absolute inset-0 bg-black/30" />
                      <span className="absolute inset-0 flex items-center justify-center text-[18px] font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">×</span>
                    </button>
                  ))}
                  {selected.length < 3 && (
                    <div className="h-14 w-10 rounded-[10px] border-2 border-dashed border-white/15 flex items-center justify-center text-white/20 text-xl">+</div>
                  )}
                </div>
              )}

              {/* Search */}
              <div className="mb-3 flex items-center gap-2 rounded-[14px] bg-white/[0.07] px-3 ring-1 ring-white/[0.08]">
                <Search size={14} className="shrink-0 text-white/35" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 bg-transparent py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none"
                />
                {query && <button onClick={() => setQuery('')} className="text-white/35"><X size={14} /></button>}
              </div>

              {/* Poster grid */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {filteredList.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-white/30">No shows found</p>
                )}
                <div className="grid grid-cols-3 gap-2 pb-2">
                  {filteredList.map((show) => {
                    const tier = tierByShow.get(show.id)
                    const isSelected = selected.some((s) => s.id === show.id)
                    const inWatchlist = watchlistIds.has(show.id)
                    const tierColors: Record<string, string> = { S: 'bg-[#ffd700] text-black', A: 'bg-white/85 text-black', B: 'bg-white/40 text-white', C: 'bg-white/20 text-white/70', D: 'bg-white/10 text-white/40' }
                    const tierRings: Record<string, string> = { S: 'ring-[1.5px] ring-[#ffd700]/70', A: 'ring-[1px] ring-white/35' }
                    return (
                      <button
                        key={show.id}
                        onClick={() => toggleShow(show)}
                        className={cn(
                          'relative aspect-[2/3] overflow-hidden rounded-[12px] bg-white/[0.05] active:scale-[0.96]',
                          !isSelected && tier && tierRings[tier],
                          isSelected && 'ring-2 ring-white/90 shadow-[0_0_0_2px_rgba(255,255,255,0.15)]',
                        )}
                      >
                        {show.posterPath
                          ? <img src={imgUrl(show.posterPath, 'w185')} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          : <div className="absolute inset-0 bg-white/[0.06] flex items-end p-1.5"><span className="text-[9px] text-white/40 leading-tight">{show.name}</span></div>
                        }

                        {/* Tier badge */}
                        {tier && (
                          <span className={cn('absolute top-1.5 left-1.5 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-black', tierColors[tier] ?? 'bg-white/20 text-white/60')}>
                            {tier}
                          </span>
                        )}

                        {/* Watchlist dot (discover mode) */}
                        {path === 'discover' && inWatchlist && !isSelected && (
                          <span className="absolute top-1.5 right-1.5 z-20 h-2.5 w-2.5 rounded-full bg-[#59f5c6] shadow-[0_0_6px_rgba(89,245,198,0.8)]" />
                        )}

                        {/* Selected overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
                            <span className="text-[28px] font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">✓</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

            {/* Mood row — shown after at least one show selected */}
            {selected.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 pb-1">
                {WATCH_DROP_MOODS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveMood(activeMood === item.key ? null : item.key)}
                    className={cn(
                      'relative h-7 overflow-hidden rounded-[10px] px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-black',
                      'shadow-[0_4px_10px_rgba(0,0,0,0.3),0_2px_0_rgba(0,0,0,0.5)] ring-1 ring-white/20 active:scale-95',
                      activeMood === item.key ? 'scale-[1.08]' : 'opacity-55',
                    )}
                  >
                    <span className={cn('absolute inset-0 bg-gradient-to-br', item.colors)} />
                    <span className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.5),transparent_44%)]" />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={() => void handleGo()}
              disabled={selected.length === 0 || loading}
              className="relative mt-3 mb-2 h-14 w-full overflow-hidden rounded-[22px] shadow-[0_18px_48px_rgba(0,0,0,0.35),0_3px_0_rgba(0,0,0,0.45)] disabled:opacity-35 active:scale-[0.984]"
            >
              {mood
                ? <><span className={cn('absolute inset-0 bg-gradient-to-r', mood.colors)} /><span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-50%,rgba(255,255,255,0.75),transparent_58%)]" /></>
                : <><span className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-white/20" /><span className="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-[22px]" /></>
              }
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/18 rounded-b-[22px]" />
              <span className={cn('relative z-10 text-[15px] font-black uppercase tracking-[0.2em]', mood ? 'text-black' : 'text-white/80')}>
                {loading ? '…' : path === 'rewatch' ? 'Pick an Episode' : 'Find a Show'}
              </span>
            </button>
          </div>
        )}

          {/* Result */}
          {result && (
          <div className="flex flex-1 flex-col min-h-0 px-4">
            {result.kind === 'rewatch' && (
              <div className="flex flex-1 flex-col gap-3 min-h-0 overflow-y-auto pb-4">
                {result.picks.map(({ show, episode }) => (
                  <EpisodeResultCard key={show.id} show={show} episode={episode} />
                ))}
              </div>
            )}

            {result.kind === 'discover' && result.show && (
              <div className="flex flex-1 flex-col min-h-0">
                <DiscoverResultCard show={result.show} onAdded={() => setResult(null)} />
              </div>
            )}

            {result.kind === 'discover' && !result.show && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-[14px] text-white/40">Nothing new found — try different anchors</p>
              </div>
            )}

            <button
              onClick={() => void handleGo()}
              disabled={loading}
              className="relative mt-3 mb-2 h-12 w-full overflow-hidden rounded-[18px] bg-white/[0.07] shadow-[0_8px_22px_rgba(0,0,0,0.3),0_2px_0_rgba(0,0,0,0.45)] ring-1 ring-white/10 active:scale-[0.984] disabled:opacity-40"
            >
              <span className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.08),transparent_55%)]" />
              <span className="relative z-10 flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-[0.18em] text-white/70">
                <RefreshCw size={14} />
                Try Again
              </span>
            </button>
          </div>
        )}

      </div>
      )}
    </motion.div>
  )
}

function EpisodeResultCard({ show, episode }: { show: Show; episode: EpisodeOption }) {
  const [art, setArt] = useState<LandscapeArt | null>(() => landscapeArtCache.get(show.id) ?? null)
  useEffect(() => {
    if (art) return
    let cancelled = false
    getLandscapeArt(show.id)
      .then((next) => { if (!cancelled) setArt(next) })
      .catch(() => { if (!cancelled) setArt({ logoPath: null, tagline: '' }) })
    return () => { cancelled = true }
  }, [art, show.id])

  const heroSrc = episode.stillPath
    ? imgUrl(episode.stillPath, 'w780')
    : show.backdropPath
      ? imgUrl(show.backdropPath, 'w780')
      : show.posterPath ? imgUrl(show.posterPath, 'w342') : null

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-[#10080e] shadow-[0_16px_42px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.07]" style={{ minHeight: 160 }}>
      {heroSrc && <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/15" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        {art?.logoPath
          ? <img src={imgUrl(art.logoPath, 'w300')} alt={show.name} className="mb-2 max-h-7 max-w-[60%] object-contain object-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]" />
          : <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">{show.name}</p>
        }
        <div className="text-[clamp(20px,5vw,26px)] font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)]">
          S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')}
        </div>
        <div className="mt-0.5 text-[12px] font-semibold text-white/80">{episode.name}</div>
        {episode.overview && (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-white/50">{episode.overview}</p>
        )}
      </div>
    </div>
  )
}

function DiscoverResultCard({ show, onAdded }: { show: LootShow; onAdded: () => void }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAdd = async () => {
    if (adding || added) return
    setAdding(true)
    try {
      await upsertShow(show)
      setAdded(true)
      setTimeout(onAdded, 800)
    } finally {
      setAdding(false)
    }
  }

  const heroSrc = show.backdropPath ? imgUrl(show.backdropPath, 'w780') : show.posterPath ? imgUrl(show.posterPath, 'w342') : null

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden rounded-[20px] bg-[#10080e] shadow-[0_20px_52px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.07]">
      {heroSrc && <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">{show.year}</span>
          <span className="text-[10px] text-white/25">·</span>
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/40">{show.genre}</span>
          {show.rating > 0 && <>
            <span className="text-[10px] text-white/25">·</span>
            <span className="text-[10px] font-black text-[#f5c453]/80">{show.rating.toFixed(1)}</span>
          </>}
        </div>
        <div className="mb-2 text-[clamp(22px,5.5vw,28px)] font-black leading-tight tracking-[-0.03em] text-white">{show.title}</div>
        {show.overview && (
          <p className="mb-4 line-clamp-3 text-[12px] leading-relaxed text-white/55">{show.overview}</p>
        )}
        <button
          onClick={() => void handleAdd()}
          disabled={adding || added}
          className="relative h-12 w-full overflow-hidden rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_0_rgba(0,0,0,0.5)] active:scale-[0.984] disabled:opacity-60"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-[#59f5c6] via-[#7b8eff] to-[#d96fff]" />
          <span className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.4),transparent_50%)]" />
          <span className="absolute inset-x-0 bottom-0 h-[2.5px] bg-black/18 rounded-b-[16px]" />
          <span className="relative z-10 text-[13px] font-black uppercase tracking-[0.18em] text-black">
            {added ? 'Added ✓' : adding ? 'Adding…' : '+ Add to Library'}
          </span>
        </button>
      </div>
    </div>
  )
}

function WatchSlot({
  show,
  pick,
  slot,
  poolSize,
  onPrev,
  onNext,
  onTouchStart,
  onTouchEnd,
}: {
  show?: Show
  pick?: EpisodePick
  slot: number
  poolSize: number
  onPrev: () => void
  onNext: () => void
  onTouchStart: (x: number) => void
  onTouchEnd: (x: number) => void
}) {
  const [art, setArt] = useState<LandscapeArt | null>(() => show ? (landscapeArtCache.get(show.id) ?? null) : null)
  useEffect(() => {
    if (!show || art) return
    let cancelled = false
    getLandscapeArt(show.id)
      .then((next) => { if (!cancelled) setArt(next) })
      .catch(() => { if (!cancelled) setArt({ logoPath: null, tagline: '' }) })
    return () => { cancelled = true }
  }, [art, show])

  if (!show) {
    return <div className="flex-1 rounded-[18px] bg-white/[0.04] ring-1 ring-white/[0.06]" />
  }

  const heroSrc = pick?.episode.stillPath
    ? imgUrl(pick.episode.stillPath, 'w780')
    : show.backdropPath
      ? imgUrl(show.backdropPath, 'w780')
      : show.posterPath
        ? imgUrl(show.posterPath, 'w342')
        : null

  return (
    <motion.div
      key={show.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: slot * 0.04, type: 'spring', stiffness: 280, damping: 24 }}
      onTouchStart={(event) => onTouchStart(event.touches[0]?.clientX ?? 0)}
      onTouchEnd={(event) => onTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      style={{ touchAction: 'pan-y' }}
      className="relative flex-1 overflow-hidden rounded-[18px] bg-[#10080e] shadow-[0_16px_42px_rgba(0,0,0,0.52)] ring-1 ring-white/[0.07]"
    >
      {heroSrc && (
        <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-82" />
      )}
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/18 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-black/12" />

      {/* Swipe arrows — only when multiple shows, no episode picked */}
      {poolSize > 1 && !pick && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/72 ring-1 ring-white/10 active:scale-90 text-lg leading-none"
            aria-label="Previous show"
          >‹</button>
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/72 ring-1 ring-white/10 active:scale-90 text-lg leading-none"
            aria-label="Next show"
          >›</button>
        </>
      )}

      {/* Content — bottom-left */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3">
        {/* Show logo or name */}
        {art?.logoPath ? (
          <img
            src={imgUrl(art.logoPath, 'w300')}
            alt={show.name}
            className="mb-1.5 max-h-8 max-w-[68%] object-contain object-left drop-shadow-[0_6px_16px_rgba(0,0,0,0.95)]"
          />
        ) : (
          <p className="mb-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/55">{show.name}</p>
        )}

        {/* Episode — shown after Deal */}
        {pick && (
          <>
            <div className="text-[clamp(18px,5vw,22px)] font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_6px_16px_rgba(0,0,0,0.9)]">
              S{String(pick.episode.seasonNumber).padStart(2, '0')}E{String(pick.episode.episodeNumber).padStart(2, '0')}
            </div>
            <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-white/75">{pick.episode.name}</div>
          </>
        )}
      </div>
    </motion.div>
  )
}

function ShowLogo({ show, compact = false }: { show: Show; compact?: boolean }) {
  const [art, setArt] = useState<LandscapeArt | null>(() => landscapeArtCache.get(show.id) ?? null)
  useEffect(() => {
    if (art) return
    let cancelled = false
    getLandscapeArt(show.id)
      .then((next) => { if (!cancelled) setArt(next) })
      .catch(() => { if (!cancelled) setArt({ logoPath: null, tagline: '' }) })
    return () => { cancelled = true }
  }, [art, show.id])

  if (art?.logoPath) {
    return <img src={imgUrl(art.logoPath, 'w500')} alt={show.name} className={cn('object-contain object-left drop-shadow-[0_8px_18px_rgba(0,0,0,0.9)]', compact ? 'max-h-7 max-w-[92px]' : 'max-h-9 max-w-[104px]')} />
  }
  return <div className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-white/62">{show.name}</div>
}

function DropSourceLabel({ kind, shows }: { kind: 'rank' | 'top8' | 'watchlist'; shows: Show[] }) {
  const label = kind === 'rank' ? 'Rank' : kind === 'top8' ? 'Top 8' : 'Watchlist'
  return (
    <div className="relative w-[78px] shrink-0 overflow-hidden rounded-[18px] shadow-[0_16px_32px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.08]">
      <div className="absolute inset-0 overflow-hidden rounded-[18px]">
        {kind === 'rank' ? (
          <div className="absolute inset-0 bg-[linear-gradient(155deg,#ff4e7a,#ffe76a_48%,#68ffc6)]">
            <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.38),transparent_40%,rgba(0,0,0,0.22))]" />
            {(['S', 'A', 'B'] as const).map((tier, index) => (
              <span
                key={tier}
                className="absolute font-black text-black/55 select-none"
                style={{
                  left: `${12 + index * 18}%`,
                  top: `${8 + index * 22}%`,
                  fontSize: `${52 - index * 7}px`,
                  transform: `rotate(${-10 + index * 10}deg)`,
                  textShadow: '0 3px 0 rgba(0,0,0,0.18)',
                }}
              >
                {tier}
              </span>
            ))}
          </div>
        ) : kind === 'top8' ? (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1230] to-[#080510]">
            <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(120,80,255,0.28),transparent_52%)]" />
            {/* Vertical cascade of posters, each offset down and slightly rotated */}
            {shows.slice(0, 5).map((show, index) => (
              <span
                key={show.id}
                className="absolute overflow-hidden rounded-[8px] bg-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.65)] ring-1 ring-white/25"
                style={{
                  width: 48,
                  height: 68,
                  left: '50%',
                  top: `${10 + index * 14}%`,
                  transform: `translateX(calc(-50% + ${(index % 2 === 0 ? -1 : 1) * (4 + index * 2)}px)) rotate(${(index % 2 === 0 ? -1 : 1) * (3 + index * 1.5)}deg)`,
                  zIndex: 5 - index,
                }}
              >
                {show.posterPath ? <img src={imgUrl(show.posterPath, 'w185')} alt="" className="h-full w-full object-cover" /> : null}
              </span>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0e1c1a] to-[#06080a]">
            <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(80,220,180,0.18),transparent_52%)]" />
            {/* Scattered vertical pile — 3 posters loosely stacked */}
            {shows.slice(0, 3).map((show, index) => (
              <span
                key={show.id}
                className="absolute overflow-hidden rounded-[8px] bg-white/[0.12] shadow-[0_10px_22px_rgba(0,0,0,0.7)] ring-1 ring-white/25"
                style={{
                  width: 44,
                  height: 62,
                  left: `calc(50% - 22px + ${(index - 1) * 8}px)`,
                  top: `${18 + index * 22}%`,
                  transform: `rotate(${(index - 1) * 11}deg)`,
                  zIndex: index === 1 ? 3 : index,
                }}
              >
                {show.posterPath ? <img src={imgUrl(show.posterPath, 'w185')} alt="" className="h-full w-full object-cover" /> : null}
              </span>
            ))}
          </div>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-transparent" />
      </div>
      <span className="absolute bottom-2.5 inset-x-0 z-10 text-center text-[9px] font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_5px_12px_rgba(0,0,0,0.9)]">{label}</span>
    </div>
  )
}

function DropSourceButton({ kind, active, shows, onClick }: { kind: 'rank' | 'top8' | 'watchlist'; active: boolean; shows: Show[]; onClick: () => void }) {
  const label = kind === 'rank' ? 'Rank' : kind === 'top8' ? 'Top 8' : 'Watchlist'
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative h-[clamp(72px,12svh,88px)] overflow-visible rounded-[22px] bg-[#151018] text-left',
        'shadow-[0_16px_32px_rgba(0,0,0,0.48),0_4px_0_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]',
        'ring-1 ring-white/[0.08] active:scale-[0.97] active:shadow-[0_4px_12px_rgba(0,0,0,0.48),0_1px_0_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]',
        active && 'ring-2 ring-white/70 shadow-[0_16px_32px_rgba(0,0,0,0.48),0_4px_0_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_2px_rgba(255,255,255,0.7)]',
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[22px]">
        {kind === 'rank' ? (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ff4e7a,#ffe76a_48%,#68ffc6)]">
            <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.38),transparent_40%,rgba(0,0,0,0.22))]" />
            {(['S', 'A', 'B'] as const).map((tier, index) => (
              <span key={tier} className="absolute font-black text-black/60" style={{ left: `${6 + index * 29}%`, top: `${4 + index * 14}%`, fontSize: `${52 - index * 6}px`, transform: `rotate(${-14 + index * 14}deg)`, textShadow: '0 3px 0 rgba(0,0,0,0.18)' }}>{tier}</span>
            ))}
          </div>
        ) : kind === 'top8' ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1230] to-[#080510]">
            <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(120,80,255,0.22),transparent_52%)]" />
            {shows.slice(0, 8).map((show, index) => {
              const col = index % 4
              const row = Math.floor(index / 4)
              return (
                <span
                  key={show.id}
                  className="absolute overflow-hidden rounded-[8px] bg-white/10 shadow-[0_6px_14px_rgba(0,0,0,0.5)] ring-1 ring-white/20"
                  style={{
                    width: 28, height: 40,
                    left: 6 + col * 24,
                    top: row === 0 ? 6 : 34,
                    transform: `rotate(${-8 + (index % 4) * 4}deg) translateY(${row === 1 ? -2 : 0}px)`,
                    zIndex: index,
                  }}
                >
                  {show.posterPath ? <img src={imgUrl(show.posterPath, 'w185')} alt="" className="h-full w-full object-cover" /> : null}
                </span>
              )
            })}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#12181a] to-[#06080a]">
            <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(80,200,180,0.14),transparent_52%)]" />
            {shows.slice(0, 5).map((show, index) => (
              <span
                key={show.id}
                className="absolute overflow-hidden rounded-[9px] bg-white/10 shadow-[0_8px_18px_rgba(0,0,0,0.55)] ring-1 ring-white/20"
                style={{
                  width: 34, height: 48,
                  left: '50%',
                  top: 8,
                  transformOrigin: 'bottom center',
                  transform: `translateX(calc(-50% + ${(index - 2) * 18}px)) rotate(${(index - 2) * 9}deg)`,
                  zIndex: index === 2 ? 10 : 5 - Math.abs(index - 2),
                }}
              >
                {show.posterPath ? <img src={imgUrl(show.posterPath, 'w185')} alt="" className="h-full w-full object-cover" /> : null}
              </span>
            ))}
          </div>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/16 to-transparent" />
      </div>
      <span className="absolute bottom-3 left-3 right-3 z-10 text-[11px] font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_5px_12px_rgba(0,0,0,0.8)]">{label}</span>
    </button>
  )
}

function ModifierChip({ label, selected, danger = false, onClick }: { label: string; selected: boolean; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 shrink-0 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.06em] ring-1 transition-transform active:scale-95',
        selected
          ? danger
            ? 'bg-rose-300 text-black ring-rose-100/80'
            : 'bg-emerald-200 text-black ring-emerald-100/80'
          : 'bg-white/[0.08] text-white/62 ring-white/[0.08]',
      )}
    >
      {label}
    </button>
  )
}

function PortalHero({ show, isOwned, onOpenShow }: { show?: LootShow; isOwned: boolean; onOpenShow: (show: Show) => void }) {
  const [adding, setAdding] = useState(false)
  const [shine, setShine] = useState(false)
  const [art, setArt] = useState<LandscapeArt | null>(() => show ? landscapeArtCache.get(show.id) ?? null : null)
  const controls = useAnimation()

  useEffect(() => {
    if (!show) return
    const cached = landscapeArtCache.get(show.id)
    if (cached) {
      setArt(cached)
      return
    }
    setArt(null)
    let cancelled = false
    getLandscapeArt(show.id)
      .then((next) => {
        if (!cancelled) setArt(next)
      })
      .catch(() => {
        if (!cancelled) setArt({ logoPath: null, tagline: '' })
      })
    return () => {
      cancelled = true
    }
  }, [show])

  if (!show) return null

  const bg = show.backdropPath
    ? imgUrl(show.backdropPath, 'original')
    : show.posterPath
      ? imgUrl(show.posterPath, 'w500')
      : ''
  const copy = art?.tagline || ''

  const handleAdd = async () => {
    if (isOwned || adding) return
    setAdding(true)
    try {
      await persistShow(show)
      setShine(true)
      void controls.start({
        scale: [1, 1.018, 0.995, 1],
        transition: { duration: 0.48, times: [0, 0.35, 0.72, 1] },
      })
      setTimeout(() => setShine(false), 760)
    } finally {
      setAdding(false)
    }
  }

  return (
    <motion.section
      animate={controls}
      onClick={() => onOpenShow(lootToShow(show))}
      className="relative mx-3 mb-8 h-[430px] overflow-hidden rounded-[34px] bg-black shadow-[0_26px_80px_rgba(0,0,0,0.72)] loot-vignette"
      style={{ animation: 'loot-rise 520ms ease both' }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenShow(lootToShow(show))
      }}
    >
      {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/18 to-black/92" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/22 to-transparent" />
      <div className="absolute -left-16 top-20 h-56 w-56 rounded-full bg-[#f5c453]/18 blur-3xl" style={{ animation: 'loot-breathe 6s ease-in-out infinite' }} />
      <AnimatePresence>{shine && <ShineOverlay key="hero-shine" />}</AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 z-10 p-6 pr-20">
        <p className="mb-4 text-[10px] font-black uppercase tracking-[0.32em] text-[#f5c453]/90">Signal</p>
        {art?.logoPath ? (
          <img
            src={imgUrl(art.logoPath, 'w500')}
            alt={show.title}
            className="mb-5 max-h-[92px] max-w-[78%] object-contain object-left drop-shadow-[0_10px_24px_rgba(0,0,0,0.9)]"
          />
        ) : (
          <h2 className="mb-5 max-w-[80%] text-5xl font-black leading-[0.84] tracking-[-0.12em] text-balance drop-shadow-[0_10px_24px_rgba(0,0,0,0.9)]">
            {show.title}
          </h2>
        )}
        {copy && (
          <p className="max-w-[255px] text-lg font-medium leading-[1.05] text-white/82 text-balance">
            {copy}
          </p>
        )}
      </div>

      <div className="absolute bottom-6 right-5 z-20">
        <AddButton isOwned={isOwned} adding={adding} onAdd={handleAdd} size="lg" />
      </div>
    </motion.section>
  )
}

function CategoryGrid({
  title,
  items,
  loading,
  sentinelRef,
  ownedIds,
  onOpenShow,
  onBack,
}: {
  title: string
  items: LootShow[]
  loading: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  ownedIds: Set<number>
  onOpenShow: (show: Show) => void
  onBack: () => void
}) {
  const [showFloatingBack, setShowFloatingBack] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    const onScroll = () => setShowFloatingBack(window.scrollY > 140)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0]
    touchStartX.current = t.clientX
    touchStartY.current = t.clientY
  }

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartX.current
    const dy = Math.abs(t.clientY - touchStartY.current)
    const startedAtLeftEdge = touchStartX.current <= 24
    if (startedAtLeftEdge && dx > 70 && dy < 40) onBack()
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div className="px-4 pb-8" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 bg-[#08070a]/70 backdrop-blur-2xl mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="h-9 px-3 rounded-full bg-white/[0.07] text-white/80 text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
          <div className="w-[72px]" aria-hidden />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((show) => (
          <PortraitCard key={`${title}-${show.id}`} show={show} isOwned={ownedIds.has(show.id)} onOpenShow={onOpenShow} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-7 h-7 border-2 border-[#f5c453] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {showFloatingBack && (
        <button
          onClick={onBack}
          className="fixed bottom-24 left-4 h-10 px-4 rounded-full bg-[#14141c]/95 border border-white/15 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.5)] z-40"
        >
          <ChevronLeft size={14} /> Back
        </button>
      )}
    </div>
  )
}

function NoKey({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="px-5 py-16 text-center">
      <p className="text-sm text-white/75">Add a TMDB API key in Settings to discover shows.</p>
      <button
        onClick={onOpenSettings}
        className="mt-4 rounded-xl bg-white text-black px-4 h-10 text-sm font-semibold"
      >
        Open Settings
      </button>
    </div>
  )
}

function SearchResults({
  loading,
  results,
  ownedIds,
  onOpenShow,
}: {
  loading: boolean
  results: LootShow[]
  ownedIds: number[]
  onOpenShow: (show: Show) => void
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#f5c453] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40 px-4">
        <Search size={40} className="mb-3 text-zinc-500" />
        <p className="font-black uppercase tracking-widest text-sm">No matches</p>
      </div>
    )
  }
  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-2 gap-4">
        {results.map((show) => (
          <PortraitCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} onOpenShow={onOpenShow} />
        ))}
      </div>
    </div>
  )
}

function FeedRows({
  feed,
  ownedIds,
  profileOwnedIds,
  profileShows,
  profileTierAssignments,
  tasteRecommendations,
  recommendationBoost,
  impressions,
  discoverSeed,
  onImpressions,
  onOpenCategory,
  onOpenShow,
  featuredId,
}: {
  feed: DiscoverFeed
  ownedIds: number[]
  profileOwnedIds: number[]
  profileShows: Show[]
  profileTierAssignments: TierAssignment[]
  tasteRecommendations: LootShow[]
  recommendationBoost: Map<number, number>
  impressions: DiscoverImpressions
  discoverSeed: number
  onImpressions: (ids: number[]) => void
  onOpenCategory: (key: DiscoverCategoryKey, title: string) => void
  onOpenShow: (show: Show) => void
  featuredId?: number
}) {
  const profileOwnedSet = useMemo(() => new Set(profileOwnedIds), [profileOwnedIds])
  const tasteWeights = useMemo(() => buildTasteWeights(profileShows, profileTierAssignments), [profileShows, profileTierAssignments])
  const sourceRow = (key: keyof DiscoverFeed, options: { preserveOrder?: boolean } = {}) => {
    const fresh = personalizeShows(feed[key], tasteWeights, profileOwnedSet, {
      featuredId,
      preserveOrder: options.preserveOrder,
    })
    const fallback = fresh.length >= 4
      ? fresh
      : personalizeShows(feed[key], tasteWeights, profileOwnedSet, {
        allowOwned: true,
        featuredId,
        preserveOrder: options.preserveOrder,
      })
    return fallback.slice(0, 10)
  }
  const personalized = useMemo(() => {
    const diverse = diversifyShows(canonRow(feed, tasteWeights, profileOwnedSet, tasteRecommendations, recommendationBoost, impressions, featuredId), 24, 3)
    return seededShuffle(diverse.slice(0, 18), discoverSeed + 17).slice(0, 12)
  }, [discoverSeed, feed, featuredId, impressions, profileOwnedSet, recommendationBoost, tasteRecommendations, tasteWeights])

  useEffect(() => {
    onImpressions([...(featuredId ? [featuredId] : []), ...personalized.slice(0, 8).map((show) => show.id)])
  }, [featuredId, onImpressions, personalized])

  return (
    <>
      <CarouselRow title="For Your Taste" categoryKey="popular" shows={personalized} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Trending This Week" categoryKey="trending" shows={sourceRow('trending', { preserveOrder: true })} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Airing Today" categoryKey="airingToday" shows={sourceRow('airingToday', { preserveOrder: true })} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Trending Now" categoryKey="popular" shows={sourceRow('popular', { preserveOrder: true })} ownedIds={ownedIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="On Netflix" categoryKey="netflix" shows={sourceRow('netflix')} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Crime" categoryKey="crime" shows={sourceRow('crime')} ownedIds={ownedIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="On HBO" categoryKey="hbo" shows={sourceRow('hbo')} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Sci-Fi & Fantasy" categoryKey="scifi" shows={sourceRow('scifi')} ownedIds={ownedIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="On Apple TV+" categoryKey="apple" shows={sourceRow('apple')} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Animation" categoryKey="animation" shows={sourceRow('animation')} ownedIds={ownedIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Mystery" categoryKey="mystery" shows={sourceRow('mystery')} ownedIds={ownedIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="On Amazon Prime" categoryKey="amazon" shows={sourceRow('amazon')} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      <CarouselRow title="Top Rated All Time" categoryKey="topRated" shows={sourceRow('topRated')} ownedIds={ownedIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
    </>
  )
}

function SkeletonRows() {
  return (
    <div className="px-4 flex flex-col gap-8">
      {[true, false, false, true, false].map((isLandscape, i) => (
        <div key={i}>
          <div className="h-3 w-28 bg-white/10 rounded-full animate-pulse mb-3" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: isLandscape ? 2 : 4 }).map((_, j) => (
              <div
                key={j}
                className={cn(
                  'flex-shrink-0 rounded-[20px] bg-white/5 animate-pulse',
                  isLandscape ? 'w-[280px] aspect-[16/9]' : 'w-[130px] aspect-[2/3]',
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CarouselRow({
  title,
  categoryKey,
  shows,
  ownedIds,
  landscape = false,
  onOpenCategory,
  onOpenShow,
}: {
  title: string
  categoryKey: DiscoverCategoryKey
  shows: LootShow[]
  ownedIds: number[]
  landscape?: boolean
  onOpenCategory: (key: DiscoverCategoryKey, title: string) => void
  onOpenShow: (show: Show) => void
}) {
  if (shows.length === 0) return null
  return (
    <div className="mb-9">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-black tracking-[0.2em] text-[11px] uppercase text-white/54">{title}</h2>
        <button
          onClick={() => onOpenCategory(categoryKey, title)}
          className="text-white/28 hover:text-white transition-colors"
          aria-label={`Open ${title}`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 px-4">
        {shows.map((show) =>
          landscape ? (
            <LandscapeCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} onOpenShow={onOpenShow} />
          ) : (
            <PortraitCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} variant="carousel" onOpenShow={onOpenShow} />
          ),
        )}
        <button
          onClick={() => onOpenCategory(categoryKey, title)}
          className={cn(
            'flex-shrink-0 snap-center rounded-[24px] bg-white/[0.035] text-white/62 hover:bg-white/[0.07] transition-colors',
            landscape ? 'w-[220px] aspect-[16/9]' : 'w-[130px] aspect-[2/3]',
          )}
        >
          <div className="w-full h-full grid place-items-center">
            <ChevronRight size={18} />
          </div>
        </button>
      </div>
    </div>
  )
}

async function persistShow(show: LootShow) {
  await upsertShow(lootToShow(show))
}

function lootToShow(show: LootShow): Show {
  const yr = show.year && show.year !== '—' ? Number(show.year) : undefined
  // Use genre from the discover feed directly — avoids an extra API round-trip
  // that could silently fail and make the add appear to do nothing.
  const genreStr = show.genre as Genre
  return {
    id: show.id,
    name: show.title,
    year: yr,
    posterPath: show.posterPath,
    backdropPath: show.backdropPath,
    overview: show.overview,
    genres: genreStr ? [genreStr] : [],
    rawGenres: genreStr ? [genreStr] : [],
    addedAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ── Shared "collect" button — iOS App Store / Spotify pattern ────────────────
//
// Three-part interaction:
//   1. whileTap scale squish   — immediate physical feedback, no delay
//   2. AnimatePresence icon morph — + → spinner → ✓ via spring, not CSS transition
//   3. Burst ring               — border div that scale+fades outward on success
//   4. Haptic                   — navigator.vibrate success rhythm

function AddButton({
  isOwned,
  adding,
  onAdd,
  onSuccess,
  onError,
  size = 'sm',
}: {
  isOwned: boolean
  adding: boolean
  onAdd: (e: React.MouseEvent) => Promise<void>
  onSuccess?: () => void
  onError?: () => void
  size?: 'sm' | 'lg'
}) {
  return (
    <SaveStateButton
      saved={isOwned}
      saving={adding}
      onSave={onAdd}
      onSuccess={onSuccess}
      onError={onError}
      size={size === 'lg' ? 'lg' : 'sm'}
      shape={size === 'lg' ? 'round' : 'soft'}
      ariaLabel={isOwned ? 'In collection' : 'Add to collection'}
    />
  )
}

// Diagonal shine sweep — the "loot card claimed" pattern from trading card games.
// A white gradient bar sweeps left-to-right once across the card on success.
function ShineOverlay() {
  return (
    <motion.div
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: 0.45 }}
    >
      <motion.div
        className="absolute inset-y-0 w-2/5 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
        initial={{ left: '-45%' }}
        animate={{ left: '130%' }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </motion.div>
  )
}

type LandscapeArt = {
  logoPath: string | null
  tagline: string
}

type TmdbLogoAsset = {
  file_path: string
  vote_average?: number
  iso_639_1?: string | null
}

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const landscapeArtCache = new Map<number, LandscapeArt>()
const landscapeArtInflight = new Map<number, Promise<LandscapeArt>>()

function bestLogo(items: TmdbLogoAsset[] = []) {
  return [...items]
    .filter((item) => item.iso_639_1 === 'en' || item.iso_639_1 === null)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]?.file_path ?? null
}

async function getLandscapeArt(showId: number): Promise<LandscapeArt> {
  const cached = landscapeArtCache.get(showId)
  if (cached) return cached

  const existing = landscapeArtInflight.get(showId)
  if (existing) return existing

  const request = (async () => {
    const key = getTmdbKey()
    const url = new URL(`${TMDB_API_BASE}/tv/${showId}`)
    url.searchParams.set('api_key', key)
    url.searchParams.set('append_to_response', 'images')
    url.searchParams.set('include_image_language', 'en,null')

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`TMDB landscape art failed: ${res.status}`)

    const data = (await res.json()) as {
      tagline?: string
      images?: { logos?: TmdbLogoAsset[] }
    }
    const art = {
      logoPath: bestLogo(data.images?.logos ?? []),
      tagline: data.tagline?.trim() ?? '',
    }
    landscapeArtCache.set(showId, art)
    return art
  })()

  landscapeArtInflight.set(showId, request)
  try {
    return await request
  } finally {
    landscapeArtInflight.delete(showId)
  }
}

function PortraitCard({
  show,
  isOwned,
  onOpenShow,
  variant = 'grid',
}: {
  show: LootShow
  isOwned: boolean
  onOpenShow: (show: Show) => void
  variant?: 'grid' | 'carousel'
}) {
  const [adding, setAdding] = useState(false)
  const [shine, setShine] = useState(false)
  const cardControls = useAnimation()

  const handleAdd = async () => {
    if (isOwned || adding) return
    setAdding(true)
    try {
      await persistShow(show)
    } finally {
      setAdding(false)
    }
  }

  const handleSuccess = () => {
    setShine(true)
    void cardControls.start({
      scale: [1, 1.04, 0.98, 1],
      transition: { duration: 0.38, times: [0, 0.3, 0.65, 1] },
    })
    setTimeout(() => setShine(false), 700)
  }

  return (
    <motion.div
      animate={cardControls}
      onClick={() => onOpenShow(lootToShow(show))}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenShow(lootToShow(show))
      }}
      className={cn(
        'relative cursor-pointer transition-transform duration-300 active:scale-[0.98]',
        variant === 'carousel' ? 'flex-shrink-0 snap-center w-[130px] aspect-[2/3]' : 'aspect-[2/3]',
      )}
    >
      <CollectibleMediaCard
        id={show.id}
        title={show.title}
        imagePath={show.posterPath}
        addSlot={<AddButton isOwned={isOwned} adding={adding} onAdd={handleAdd} onSuccess={handleSuccess} size="sm" />}
        shineSlot={<AnimatePresence>{shine && <ShineOverlay key="shine" />}</AnimatePresence>}
        meta={variant === 'grid' && show.year !== '—' ? <span className="text-[10px] font-bold text-white/52">{show.year}</span> : undefined}
        children={variant === 'carousel' ? <></> : undefined}
      />
    </motion.div>
  )
}

function LandscapeCard({ show, isOwned, onOpenShow }: { show: LootShow; isOwned: boolean; onOpenShow: (show: Show) => void }) {
  const [adding, setAdding] = useState(false)
  const [shine, setShine] = useState(false)
  const [art, setArt] = useState<LandscapeArt | null>(() => landscapeArtCache.get(show.id) ?? null)
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const cardControls = useAnimation()

  const handleAdd = async () => {
    if (isOwned || adding) return
    setAdding(true)
    try {
      await persistShow(show)
    } finally {
      setAdding(false)
    }
  }

  const handleSuccess = () => {
    setShine(true)
    void cardControls.start({
      scale: [1, 1.03, 0.99, 1],
      transition: { duration: 0.38, times: [0, 0.3, 0.65, 1] },
    })
    setTimeout(() => setShine(false), 700)
  }

  const bg = show.backdropPath
    ? imgUrl(show.backdropPath, 'w500')
    : show.posterPath
      ? imgUrl(show.posterPath, 'w342')
      : ''
  useEffect(() => {
    const node = cardRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      { rootMargin: '320px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible || art) return
    let cancelled = false
    getLandscapeArt(show.id)
      .then((next) => {
        if (!cancelled) setArt(next)
      })
      .catch(() => {
        if (!cancelled) setArt({ logoPath: null, tagline: '' })
      })
    return () => {
      cancelled = true
    }
  }, [art, isVisible, show.id])

  return (
    <motion.div
      ref={cardRef}
      animate={cardControls}
      onClick={() => onOpenShow(lootToShow(show))}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenShow(lootToShow(show))
      }}
      className="relative group cursor-pointer flex-shrink-0 snap-center rounded-[28px] overflow-hidden bg-[#151117] shadow-[0_20px_52px_rgba(0,0,0,0.46)] w-[300px] aspect-[1.9/1] transition-transform duration-300 active:scale-[0.98]"
    >
      <CollectibleMediaCard
        id={show.id}
        title={show.title}
        imageUrl={bg}
        logoPath={art?.logoPath}
        landscape
        addSlot={<AddButton isOwned={isOwned} adding={adding} onAdd={handleAdd} onSuccess={handleSuccess} size="lg" />}
        shineSlot={<AnimatePresence>{shine && <ShineOverlay key="shine" />}</AnimatePresence>}
        meta={art?.tagline ? (
          <p className="max-w-[190px] text-[13px] font-semibold leading-[1.05] text-white/76 line-clamp-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
            {art.tagline}
          </p>
        ) : (
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
            {show.year !== '—' ? show.year : show.genre}
          </p>
        )}
      />
    </motion.div>
  )
}
