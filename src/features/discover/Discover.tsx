import { useAnimation, motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Play, RefreshCw, Search, X } from 'lucide-react'
import {
  type DiscoverCategoryKey,
  getDiscoverFeed,
  getCachedDiscoverFeed,
  getDiscoverCategoryPage,
  getAnimationTodayPulse,
  getAnimationTodayTrailers,
  getAnimationTrailerFeedBatch,
  getAnimationScheduleDayEpisodes,
  getCachedAnimationTodayPulse,
  getCachedAnimationTodayTrailers,
  getSeason,
  getShowDetail,
  getShowKeywords,
  getShowWatchProviders,
  getWatchRegion,
  getTmdbKey,
  getShowRecommendations,
  getSimilarShows,
  getMovieCollection,
  searchKeywords,
  discoverShowsByMood,
  hasTmdbKey,
  imgUrl,
  searchShows,
  tmdbToLoot,
  type DiscoverFeed,
  type AnimationTodayPulse,
  type AnimationScheduleDay,
  type AnimationTrailerFeature,
  type LootShow,
} from '../../lib/tmdb'
import { activeDiscoverFeedback, cacheSeason, upsertShow, addToWatchlistShelf, ensureDefaultWatchlistShelves } from '../../data/queries'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import type { CardDescriptor, DismissedCollection, FranchiseDefinition, Genre, RecommendationContext, SeasonCache, Show, Tier, TierAssignment } from '../../types'
import { cn } from '../../lib/utils'
import { CollectibleMediaCard } from '../../components/show/CollectibleMediaCard'
import { FeedSaveActions } from '../../components/show/FeedSaveActions'
import { ImdbBadge } from '../../components/ui/ImdbBadge'
import { useImdbRating } from '../../lib/imdbRatings'
import { ColorAwareRail } from '../../components/ui/ColorAwareRail'
import { getVibeSubtitle, getVibeTitle } from '../../lib/vibe-engine'
import { pickAnimationKey } from '../../engine/genre-animations'
import { getSecondaryAnimationGenre } from '../../lib/animation-taxonomy'
import { dominantColor } from '../../lib/dominantColor'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { selectCardDescriptor } from '../../lib/card-descriptors'
import {
  dismissOnboardingFollowup,
  loadOnboardingRelatedTitleGroups,
  ONBOARDING_FOLLOWUP_EVENT,
  ONBOARDING_FOLLOWUP_STORAGE_KEY,
  rankOnboardingFollowupCandidates,
  readOnboardingFollowup,
  type OnboardingFollowupState,
  type RelatedTitleGroup,
} from '../onboarding/onboardingFollowup'
import { StudioDirectoryBrowser } from '../studios/StudioDirectoryBrowser'
import { StudioFeedRail } from '../studios/StudioFeedRail'

interface Props {
  onOpenSettings: () => void
  onOpenShow: (show: Show, context?: RecommendationContext) => void
}

const FEED_KEYS: (keyof DiscoverFeed)[] = ['freshStudios', 'newAnime', 'newWestern', 'adultAnimation', 'allAges', 'vibeCrate', 'animatedFilms', 'topRated']
const HOME_FEED_KEYS: (keyof DiscoverFeed)[] = ['freshStudios', 'newAnime', 'vibeCrate', 'animatedFilms', 'topRated']
const TIER_TASTE_WEIGHT: Record<Tier, number> = { S: 9, A: 6, B: 3, C: 1, D: -3 }
const TASTE_ANCHOR_LIMIT = 18
const ACTIVE_ANCHOR_COUNT = 8
const TASTE_REC_TTL_MS = 24 * 60 * 60_000
const DISCOVER_IMPRESSIONS_KEY = 'loot:discover-impressions:v1'
const DISCOVER_LIBRARY_SNAPSHOT_KEY = 'loot:discover-library-snapshot:v1'
const DISCOVER_ROTATION_KEY = 'loot:discover-rotation:v1'
const DISCOVER_FRESHNESS_WINDOW_MS = 6 * 60 * 60_000
const WATCH_DROP_ENABLED = false
const cardDescriptorEnrichmentCache = new Map<string, Promise<CardDescriptor | undefined>>()

function isStudioDirectoryHistoryState(value: unknown) {
  return Boolean(value && typeof value === 'object' && 'lootStudioDirectory' in value && value.lootStudioDirectory === true)
}

function studioDirectoryTargetFromHistory(value: unknown) {
  if (!value || typeof value !== 'object' || !('lootStudioDirectory' in value) || value.lootStudioDirectory !== true || !('lootStudioId' in value)) return null
  return typeof value.lootStudioId === 'number' ? value.lootStudioId : null
}

function enrichCardDescriptor(show: LootShow): Promise<CardDescriptor | undefined> {
  const key = `${show.mediaType}:${show.id}`
  const cached = cardDescriptorEnrichmentCache.get(key)
  if (cached) return cached

  const request = getShowKeywords(show.id, show.mediaType)
    .then((keywords) => selectCardDescriptor({
      overview: show.overview,
      keywords: keywords.results.map((keyword) => keyword.name),
      genreNames: show.rawGenres,
      tradition: show.tradition,
    }))
    .catch(() => show.cardDescriptor)
  cardDescriptorEnrichmentCache.set(key, request)
  return request
}

function useEnrichedCardDescriptor(show: LootShow, isVisible: boolean) {
  const [descriptor, setDescriptor] = useState<CardDescriptor | undefined>(() => show.cardDescriptor)

  useEffect(() => {
    if (!isVisible || !hasTmdbKey() || descriptor?.confidence === 1) return
    let cancelled = false
    void enrichCardDescriptor(show).then((next) => {
      if (!cancelled && next && (next.id !== descriptor?.id || next.label !== descriptor.label)) {
        setDescriptor(next)
      }
    })
    return () => { cancelled = true }
  }, [descriptor, isVisible, show])

  return descriptor
}
// Maps genre name strings (as used in MoodDefinition.genreHints) to TMDB genre IDs
const GENRE_NAME_TO_ID: Record<string, number> = {
  Action: 10759, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
  Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, Horror: 27,
  Kids: 10762, Mystery: 9648, Romance: 10749, 'Sci-Fi': 10765, Thriller: 53, War: 10768,
}

// Human-readable keyword terms per mood — resolved to TMDB keyword IDs at call time
// Using specific, commonly-tagged TMDB terms for best match rate
const MOOD_KEYWORD_TERMS: Record<string, string[]> = {
  happy:   ['friendship', 'optimism', 'feel-good'],
  action:  ['heist', 'mercenary', 'chase'],
  slow:    ['slow burn', 'introspection', 'melancholy'],
  love:    ['romance', 'love triangle', 'forbidden love'],
  dark:    ['murder', 'serial killer', 'psychological thriller'],
  comfort: ['small town', 'slice of life', 'cozy'],
  funny:   ['satire', 'workplace comedy', 'parody'],
  tense:   ['conspiracy', 'suspense', 'cat and mouse'],
  sad:     ['grief', 'tragedy', 'loss'],
  weird:   ['supernatural', 'time travel', 'surreal'],
}

// In-memory cache: keyword name → TMDB keyword ID (persists for the session)
const kwIdCache = new Map<string, number>()

async function resolveKeywordIds(terms: string[]): Promise<number[]> {
  const uncached = terms.filter((t) => !kwIdCache.has(t))
  if (uncached.length) {
    await Promise.all(
      uncached.map((t) =>
        searchKeywords(t)
          .then((res) => {
            // Prefer exact name match, fall back to first result
            const match = res.find((r) => r.name.toLowerCase() === t.toLowerCase()) ?? res[0]
            if (match) kwIdCache.set(t, match.id)
          })
          .catch(() => {}),
      ),
    )
  }
  return terms.map((t) => kwIdCache.get(t)).filter((id): id is number => id != null)
}

const WD_SEEN_KEY = 'loot:wd-seen:v1'
const WD_SEEN_MAX = 400

function loadWdSeen(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(WD_SEEN_KEY) ?? '[]') as number[]) }
  catch { return new Set() }
}
function saveWdSeen(id: number) {
  try {
    const ids: number[] = JSON.parse(localStorage.getItem(WD_SEEN_KEY) ?? '[]')
    if (!ids.includes(id)) {
      ids.push(id)
      if (ids.length > WD_SEEN_MAX) ids.splice(0, ids.length - WD_SEEN_MAX)
      localStorage.setItem(WD_SEEN_KEY, JSON.stringify(ids))
    }
  } catch {}
}

type TasteRecommendationGroup = {
  anchorId: number
  shows: LootShow[]
}

const tasteRecCache = new Map<string, { data: TasteRecommendationGroup[]; ts: number }>()
const tasteRecInflight = new Map<string, Promise<TasteRecommendationGroup[]>>()

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

function rotatingSelection(shows: LootShow[], seed: number, limit = 10) {
  if (shows.length <= limit) return seededShuffle(shows, seed)

  const coreSize = Math.min(shows.length, Math.max(limit, 14))
  const coreCount = Math.min(Math.max(1, Math.floor(limit * 0.7)), coreSize)
  const explorationCount = limit - coreCount
  const core = seededShuffle(shows.slice(0, coreSize), seed).slice(0, coreCount)
  const exploration = seededShuffle(shows.slice(coreSize), seed ^ 0x9e3779b9).slice(0, explorationCount)

  return uniqueShows([
    ...core,
    ...exploration,
    ...seededShuffle(shows, seed ^ 0x85ebca6b),
  ]).slice(0, limit)
}

function readDiscoverRotation() {
  try {
    const stored = Number(sessionStorage.getItem(DISCOVER_ROTATION_KEY))
    if (Number.isFinite(stored) && stored > 0) return stored
  } catch {
    // Session storage can be unavailable; the time window still gives us a stable seed.
  }
  return Math.floor(Date.now() / DISCOVER_FRESHNESS_WINDOW_MS)
}

function writeDiscoverRotation(rotation: number) {
  try {
    sessionStorage.setItem(DISCOVER_ROTATION_KEY, String(rotation))
  } catch {
    // Discover rotation can remain in memory when session storage is unavailable.
  }
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
    for (const vibeId of show.vibeIds ?? []) {
      const key = `vibe:${vibeId}`
      weights.set(key, (weights.get(key) ?? 0) + base * 1.5)
    }
    if (show.tradition) {
      const key = `tradition:${show.tradition}`
      weights.set(key, (weights.get(key) ?? 0) + base)
    }
    const genres = [...(show.rawGenres ?? [])].filter((genre) => genre && genre !== 'Animation')
    for (const genre of genres) {
      const key = `genre:${genre}`
      weights.set(key, (weights.get(key) ?? 0) + base * 0.5)
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
  const tasteAxisCounts = new Map<string, number>()

  for (const show of sorted) {
    const axis = show.vibeIds?.[0] ?? show.tradition ?? 'other'
    if ((tasteAxisCounts.get(axis) ?? 0) >= 2) continue
    selected.push(show)
    tasteAxisCounts.set(axis, (tasteAxisCounts.get(axis) ?? 0) + 1)
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
  const vibeAffinity = show.vibeIds.reduce((sum, vibeId) => sum + (tasteWeights.get(`vibe:${vibeId}`) ?? 0), 0)
  const traditionAffinity = tasteWeights.get(`tradition:${show.tradition}`) ?? 0
  const genreAffinity = show.rawGenres
    .filter((genre) => genre !== 'Animation')
    .reduce((sum, genre) => sum + (tasteWeights.get(`genre:${genre}`) ?? 0), 0)
  return (recommendationBoost.get(show.id) ?? 0)
    + vibeAffinity * 12
    + traditionAffinity * 7
    + genreAffinity * 4
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

function uniqueTrailerFeatures(features: AnimationTrailerFeature[]) {
  const seen = new Set<string>()
  return features.filter((feature) => {
    if (seen.has(feature.video.key)) return false
    seen.add(feature.video.key)
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
  if (options.preserveOrder) {
    return filtered.sort((a, b) => impressionPenalty(a, options.impressions) - impressionPenalty(b, options.impressions))
  }
  return filtered.sort((a, b) =>
    tasteScore(b, tasteWeights, options.recommendationBoost, options.impressions)
    - tasteScore(a, tasteWeights, options.recommendationBoost, options.impressions),
  )
}

function diversifyShows(shows: LootShow[], limit: number, maxPerAxis = 3) {
  const picked: LootShow[] = []
  const axisCounts = new Map<string, number>()
  for (const show of shows) {
    const axis = `${show.tradition}:${show.vibeIds[0] ?? show.genre}`
    const count = axisCounts.get(axis) ?? 0
    if (count >= maxPerAxis) continue
    picked.push(show)
    axisCounts.set(axis, count + 1)
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

function discoverHeroes(
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
    ...feed.freshStudios,
    ...feed.newAnime,
    ...feed.newWestern,
    ...feed.animatedFilms,
    ...feed.topRated,
  ]
  const ranked = diversifyShows(personalizeShows(pool, tasteWeights, ownedSet, { recommendationBoost, impressions }), 18, 3)
  const rotatingTop = seededShuffle(ranked.slice(0, 10), seed)
  const fallback = personalizeShows(pool, tasteWeights, ownedSet, { allowOwned: true, recommendationBoost, impressions })
  return uniqueShows([...rotatingTop, ...fallback]).slice(0, 3)
}

async function getTasteRecommendationPool(anchors: Show[], page = 1) {
  if (!anchors.length) return []
  const cacheKey = `${page}:${anchors.map((show) => show.id).join(',')}`
  const cached = tasteRecCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TASTE_REC_TTL_MS) return cached.data

  const inflight = tasteRecInflight.get(cacheKey)
  if (inflight) return inflight

  const request = Promise.all(
    anchors.map(async (anchor) => {
      const mediaType = anchor.mediaType ?? 'tv'
      const [recommendations, similar, collection] = await Promise.all([
        getShowRecommendations(anchor.id, page, mediaType).then((data) => data.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
        getSimilarShows(anchor.id, page, mediaType).then((data) => data.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
        mediaType === 'movie'
          ? getShowDetail(anchor.id, 'movie')
              .then((detail) => detail.belongs_to_collection?.id ? getMovieCollection(detail.belongs_to_collection.id) : null)
              .then((data) => data?.results.map(tmdbToLoot) ?? [])
              .catch(() => [] as LootShow[])
          : Promise.resolve([] as LootShow[]),
      ])
      return {
        anchorId: anchor.id,
        shows: uniqueShows([...collection, ...recommendations, ...similar]).filter((show) => show.posterPath || show.backdropPath),
      }
    }),
  ).then((data) => {
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
  if ((show.mediaType ?? 'tv') === 'movie') return []
  const cached = cachedEpisodeOptions(show.id, await db.seasonCache.where({ showId: show.id }).toArray())
  if (cached.length) return cached
  if (!getTmdbKey()) return [fallbackEpisode(show, hashString(show.name))]

  try {
    const detail = await getShowDetail(show.id, 'tv')
    const realSeasons = (detail.seasons ?? [])
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


export function Discover({ onOpenSettings, onOpenShow }: Props) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [debouncedQ, setDebouncedQ] = useState('')
  const [results, setResults] = useState<LootShow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [feed, setFeed] = useState<DiscoverFeed | null>(() => getCachedDiscoverFeed())
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [todayPulse, setTodayPulse] = useState<AnimationTodayPulse | null>(() => getCachedAnimationTodayPulse())
  const [todayPulseLoading, setTodayPulseLoading] = useState(() => !getCachedAnimationTodayPulse())
  const [todayPulseError, setTodayPulseError] = useState<string | null>(null)
  const [todayTrailers, setTodayTrailers] = useState<AnimationTrailerFeature[]>(() => getCachedAnimationTodayTrailers())
  const [selectedTodayTrailer, setSelectedTodayTrailer] = useState<AnimationTrailerFeature | null>(null)
  const [activeCategory, setActiveCategory] = useState<null | { key: DiscoverCategoryKey; title: string }>(null)
  const [studioDirectoryOpen, setStudioDirectoryOpen] = useState(() => isStudioDirectoryHistoryState(window.history.state))
  const [studioDirectoryTargetId, setStudioDirectoryTargetId] = useState<number | null>(() => studioDirectoryTargetFromHistory(window.history.state))
  const [categoryItems, setCategoryItems] = useState<LootShow[]>([])
  const [categoryPage, setCategoryPage] = useState(1)
  const [categoryTotalPages, setCategoryTotalPages] = useState(1)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [tasteRecommendationGroups, setTasteRecommendationGroups] = useState<TasteRecommendationGroup[]>([])
  const [impressions, setImpressions] = useState<DiscoverImpressions>(() => readDiscoverImpressions())
  const [discoverRotation, setDiscoverRotation] = useState(readDiscoverRotation)
  const [librarySnapshot, setLibrarySnapshot] = useState<DiscoverLibrarySnapshot | null>(() => readLibrarySnapshot())
  const [onboardingFollowup, setOnboardingFollowup] = useState<OnboardingFollowupState | null>(() => readOnboardingFollowup())
  const [onboardingRelatedGroups, setOnboardingRelatedGroups] = useState<RelatedTitleGroup[]>([])
  const [watchDropOpen, setWatchDropOpen] = useState(false)
  const pullStartY = useRef<number | null>(null)
  const lastScrollY = useRef(0)
  const scrollTravel = useRef(0)
  const scrollDirection = useRef<-1 | 0 | 1>(0)

  const keyOk = hasTmdbKey()

  const ownedShows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const tierAssignments = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const watchlistShows = useDexieQuery(['watchlistShows'], () => db.watchlistShows.toArray(), [], [])
  const watchlistShelves = useDexieQuery(['watchlistShelves'], () => db.watchlistShelves.toArray(), [], [])
  const hiddenFeedback = useDexieQuery(['discoverFeedback'], activeDiscoverFeedback, [], [])
  const dismissedCollections = useDexieQuery<DismissedCollection[]>(['dismissedCollections'], () => db.dismissedCollections.toArray(), [], [])
  const collectionDefinitions = useDexieQuery<FranchiseDefinition[]>(['franchiseDefinitions'], () => db.franchiseDefinitions.toArray(), [], [])
  const hiddenIds = useMemo(() => {
    const ids = new Set(hiddenFeedback.map((feedback) => feedback.showId))
    const dismissedDefinitionIds = new Set(dismissedCollections.map((collection) => collection.definitionId))
    for (const definition of collectionDefinitions) {
      if (!dismissedDefinitionIds.has(definition.id)) continue
      for (const memberId of definition.memberIds) ids.add(memberId)
    }
    return ids
  }, [collectionDefinitions, dismissedCollections, hiddenFeedback])
  const liveOwnedIds = useMemo(() => ownedShows.map((s) => s.id), [ownedShows])
  const liveOwnedSet = useMemo(() => new Set(liveOwnedIds), [liveOwnedIds])
  const liveWatchlistSet = useMemo(() => new Set(watchlistShows.map((show) => show.id)), [watchlistShows])
  const profileShows = useMemo(() => librarySnapshot?.ownedShows ?? [], [librarySnapshot])
  const profileTierAssignments = useMemo(() => librarySnapshot?.tierAssignments ?? [], [librarySnapshot])
  const profileOwnedIds = useMemo(() => profileShows.map((s) => s.id), [profileShows])
  const profileOwnedSet = useMemo(() => new Set(profileOwnedIds), [profileOwnedIds])
  const tasteWeights = useMemo(() => buildTasteWeights(profileShows, profileTierAssignments), [profileShows, profileTierAssignments])
  const tasteAnchors = useMemo(() => pickTasteAnchors(profileShows, profileTierAssignments), [profileShows, profileTierAssignments])
  const tasteSignature = librarySnapshot?.signature ?? ''
  const activeTasteAnchors = useMemo(
    () => rotateActiveAnchors(tasteAnchors, `${tasteSignature}:${discoverRotation}`),
    [discoverRotation, tasteAnchors, tasteSignature],
  )
  const recommendationPage = discoverRotation % 3 + 1
  const discoverSeed = useMemo(
    () => hashString(`${todayKey()}:${tasteSignature}:${discoverRotation}`),
    [discoverRotation, tasteSignature],
  )
  const tasteRecommendations = useMemo(
    () => uniqueShows(tasteRecommendationGroups.flatMap((group) => group.shows)),
    [tasteRecommendationGroups],
  )
  const recommendationBoost = useMemo(() => recommendationBoosts(tasteRecommendations), [tasteRecommendations])
  const visibleFeed = useMemo(() => {
    if (!feed) return null
    const next = {} as DiscoverFeed
    FEED_KEYS.forEach((key) => {
      next[key] = feed[key].filter((show: LootShow) => !hiddenIds.has(show.id))
    })
    return next
  }, [feed, hiddenIds])
  const visibleTasteRecommendations = useMemo(
    () => tasteRecommendations.filter((show) => !hiddenIds.has(show.id)),
    [hiddenIds, tasteRecommendations],
  )
  const visibleTasteRecommendationGroups = useMemo(
    () => tasteRecommendationGroups.map((group) => ({
      ...group,
      shows: group.shows.filter((show) => !hiddenIds.has(show.id)),
    })),
    [hiddenIds, tasteRecommendationGroups],
  )
  const onboardingFollowupCandidates = useMemo(() => {
    if (!onboardingFollowup) return []
    const anchorIds = new Set(onboardingFollowup.anchorIds)
    const candidates = rankOnboardingFollowupCandidates(
      onboardingRelatedGroups.filter((group) => anchorIds.has(group.anchorId)),
      profileShows.filter((show) => anchorIds.has(show.id)),
      profileOwnedSet,
    ).filter((show) => !hiddenIds.has(show.id))
    return candidates.length >= 2 ? candidates : []
  }, [hiddenIds, onboardingFollowup, onboardingRelatedGroups, profileOwnedSet, profileShows])

  useEffect(() => {
    const refreshFollowup = () => setOnboardingFollowup(readOnboardingFollowup())
    const refreshFromStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ONBOARDING_FOLLOWUP_STORAGE_KEY) refreshFollowup()
    }
    window.addEventListener(ONBOARDING_FOLLOWUP_EVENT, refreshFollowup)
    window.addEventListener('storage', refreshFromStorage)
    return () => {
      window.removeEventListener(ONBOARDING_FOLLOWUP_EVENT, refreshFollowup)
      window.removeEventListener('storage', refreshFromStorage)
    }
  }, [])

  useEffect(() => {
    if (!onboardingFollowup || !ownedShows.length) return
    const anchorSet = new Set(onboardingFollowup.anchorIds)
    const snapshotHasAnchors = librarySnapshot && onboardingFollowup.anchorIds.every((id) => librarySnapshot.ownedShows.some((show) => show.id === id))
    if (snapshotHasAnchors) return
    const availableAnchors = ownedShows.filter((show) => anchorSet.has(show.id))
    if (!availableAnchors.length) return
    const timer = window.setTimeout(() => {
      const snapshot = createLibrarySnapshot(ownedShows, tierAssignments)
      writeLibrarySnapshot(snapshot)
      setLibrarySnapshot(snapshot)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [librarySnapshot, onboardingFollowup, ownedShows, tierAssignments])

  useEffect(() => {
    if (!onboardingFollowup) return
    const anchorSet = new Set(onboardingFollowup.anchorIds)
    const anchors = profileShows.filter((show) => anchorSet.has(show.id))
    if (!anchors.length) return
    let cancelled = false
    loadOnboardingRelatedTitleGroups(anchors)
      .then((groups) => {
        if (!cancelled) setOnboardingRelatedGroups(groups)
      })
      .catch(() => {
        if (!cancelled) setOnboardingRelatedGroups([])
      })
    return () => {
      cancelled = true
    }
  }, [onboardingFollowup, profileShows])

  useEffect(() => {
    if (librarySnapshot) return
    const timer = window.setTimeout(() => {
      const snapshot = createLibrarySnapshot(ownedShows, tierAssignments)
      writeLibrarySnapshot(snapshot)
      setLibrarySnapshot(snapshot)
    }, 260)
    return () => window.clearTimeout(timer)
  }, [librarySnapshot, ownedShows, tierAssignments])

  const loadTodayPulse = useCallback(async (force = false) => {
    const cached = getCachedAnimationTodayPulse()
    if (cached) setTodayPulse(cached)
    else {
      setTodayPulse(null)
      setTodayTrailers([])
    }
    setTodayPulseLoading(!cached)
    setTodayPulseError(null)
    try {
      const pulse = await getAnimationTodayPulse(force)
      setTodayPulse(pulse)
      setTodayPulseLoading(false)
      void getAnimationTodayTrailers(pulse, force)
        .then(setTodayTrailers)
        .catch(() => {})
    } catch (error) {
      if (!cached) setTodayPulseError((error as Error).message)
      setTodayPulseLoading(false)
    }
  }, [])

  const refreshDiscoverMix = () => {
    const snapshot = createLibrarySnapshot(ownedShows, tierAssignments)
    writeLibrarySnapshot(snapshot)
    setLibrarySnapshot(snapshot)
    setImpressions(readDiscoverImpressions())
    setDiscoverRotation((current) => {
      const next = current + 1
      writeDiscoverRotation(next)
      return next
    })
    void loadTodayPulse(true)
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
    if (!keyOk) return
    void loadTodayPulse()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadTodayPulse()
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    const freshnessTimer = window.setInterval(refreshWhenVisible, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.clearInterval(freshnessTimer)
    }
  }, [keyOk, loadTodayPulse])

  useEffect(() => {
    if (!keyOk || activeTasteAnchors.length === 0) {
      setTasteRecommendationGroups((prev) => (prev.length === 0 ? prev : []))
      return
    }
    let cancelled = false
    getTasteRecommendationPool(activeTasteAnchors, recommendationPage)
      .then((groups) => {
        if (!cancelled) setTasteRecommendationGroups(groups.map((group) => ({
          ...group,
          shows: group.shows.filter((show) => !profileOwnedSet.has(show.id)),
        })))
      })
      .catch(() => {
        if (!cancelled) setTasteRecommendationGroups((prev) => (prev.length === 0 ? prev : []))
      })
    return () => {
      cancelled = true
    }
  }, [keyOk, activeTasteAnchors, profileOwnedSet, recommendationPage])

  // Search debounce.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!searchOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [searchOpen])

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

  useEffect(() => {
    if (activeCategory || searchOpen) return
    lastScrollY.current = Math.max(window.scrollY, 0)
    scrollTravel.current = 0
    scrollDirection.current = 0

    const updateHeaderVisibility = () => {
      const currentY = Math.max(window.scrollY, 0)
      const delta = currentY - lastScrollY.current
      lastScrollY.current = currentY

      if (currentY <= 28) {
        scrollTravel.current = 0
        scrollDirection.current = 0
        setHeaderVisible(true)
        return
      }

      if (Math.abs(delta) < 0.5) return
      const direction: -1 | 1 = delta > 0 ? 1 : -1
      if (direction !== scrollDirection.current) {
        scrollDirection.current = direction
        scrollTravel.current = 0
      }
      scrollTravel.current += Math.abs(delta)

      if (direction === 1 && scrollTravel.current >= 20) {
        setHeaderVisible(false)
        scrollTravel.current = 0
      } else if (direction === -1 && scrollTravel.current >= 10) {
        setHeaderVisible(true)
        scrollTravel.current = 0
      }
    }

    window.addEventListener('scroll', updateHeaderVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateHeaderVisibility)
  }, [activeCategory, searchOpen])

  const heroShows = useMemo(
    () => visibleFeed ? discoverHeroes(visibleFeed, tasteWeights, profileOwnedSet, visibleTasteRecommendations, recommendationBoost, impressions, discoverSeed) : [],
    [discoverSeed, impressions, profileOwnedSet, recommendationBoost, tasteWeights, visibleFeed, visibleTasteRecommendations],
  )
  const heroRecommendations = useMemo(() => {
    const recommendations = new Map<number, RecommendationContext>()
    heroShows.forEach((heroShow) => {
      const group = visibleTasteRecommendationGroups.find((candidate) => candidate.shows.some((show) => show.id === heroShow.id))
      const anchor = group ? profileShows.find((show) => show.id === group.anchorId) : undefined
      if (!anchor) return
      const tier = profileTierAssignments.find((assignment) => assignment.showId === anchor.id)?.tier
      recommendations.set(heroShow.id, {
        anchorName: anchor.name,
        anchorTier: tier,
        sharedGenre: anchor.rawGenres?.find((genre) => heroShow.rawGenres.includes(genre) && genre !== 'Animation'),
      })
    })
    return recommendations
  }, [heroShows, profileShows, profileTierAssignments, visibleTasteRecommendationGroups])
  const todayPicks = useMemo(() => {
    if (!visibleFeed) return []
    const candidates = uniqueShows([
      ...visibleTasteRecommendations,
      ...visibleFeed.freshStudios,
      ...visibleFeed.newAnime,
      ...visibleFeed.newWestern,
      ...visibleFeed.animatedFilms,
    ])
    const ranked = personalizeShows(candidates, tasteWeights, profileOwnedSet, {
      recommendationBoost,
      impressions,
    })
    return rotatingSelection(ranked, discoverSeed ^ 0x27d4eb2d, 3)
  }, [discoverSeed, impressions, profileOwnedSet, recommendationBoost, tasteWeights, visibleFeed, visibleTasteRecommendations])

  const leadingImpressionIds = useMemo(
    () => heroShows.length ? heroShows.map((show) => show.id) : todayPicks.map((show) => show.id),
    [heroShows, todayPicks],
  )

  const handleImpressions = useCallback((ids: number[]) => {
    recordDiscoverImpressions(ids)
  }, [])

  const openCategory = (key: DiscoverCategoryKey, title: string) => {
    setActiveCategory({ key, title })
    setCategoryItems([])
    setCategoryPage(1)
    setCategoryTotalPages(1)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  const onDiscoverTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!WATCH_DROP_ENABLED) {
      pullStartY.current = null
      return
    }
    if (window.scrollY > 8 || searchOpen || activeCategory) {
      pullStartY.current = null
      return
    }
    pullStartY.current = event.touches[0]?.clientY ?? null
  }

  const onDiscoverTouchEnd: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!WATCH_DROP_ENABLED) {
      pullStartY.current = null
      return
    }
    if (pullStartY.current === null) return
    const endY = event.changedTouches[0]?.clientY ?? pullStartY.current
    if (endY - pullStartY.current > 76) setWatchDropOpen(true)
    pullStartY.current = null
  }

  useEffect(() => {
    const syncStudioDirectoryFromHistory = (event: PopStateEvent) => {
      setStudioDirectoryOpen(isStudioDirectoryHistoryState(event.state))
      setStudioDirectoryTargetId(studioDirectoryTargetFromHistory(event.state))
    }
    window.addEventListener('popstate', syncStudioDirectoryFromHistory)
    return () => window.removeEventListener('popstate', syncStudioDirectoryFromHistory)
  }, [])

  const openStudioDirectory = useCallback((studioId: number | null = null) => {
    if (!isStudioDirectoryHistoryState(window.history.state)) {
      const current = window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
      window.history.pushState({ ...current, lootStudioDirectory: true, lootStudioId: studioId }, '')
    } else {
      window.history.replaceState({ ...window.history.state, lootStudioId: studioId }, '')
    }
    setStudioDirectoryTargetId(studioId)
    setStudioDirectoryOpen(true)
  }, [])

  const closeStudioDirectory = useCallback(() => {
    if (isStudioDirectoryHistoryState(window.history.state)) window.history.back()
    else setStudioDirectoryOpen(false)
  }, [])

  const openShowFromStudio = useCallback((show: Show) => {
    setStudioDirectoryOpen(false)
    onOpenShow(show)
  }, [onOpenShow])

  return (
    <div className="relative flex min-h-full flex-col pb-28" onTouchStart={onDiscoverTouchStart} onTouchEnd={onDiscoverTouchEnd}>
      {!activeCategory && <>
      <motion.header
        initial={false}
        animate={{ y: headerVisible ? 0 : '-100%' }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        inert={!headerVisible}
        className="fixed inset-x-0 top-0 z-30 mx-auto w-full max-w-md border-b border-white/[0.045] bg-[#08070a]/80 px-4 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl will-change-transform"
      >
        <div className="flex h-11 items-center justify-between">
          <h1 className="text-[25px] font-bold tracking-[-0.045em] text-white/95">Discover</h1>
          <div className="flex items-center gap-1">
            {librarySnapshot && (
              <button
                onClick={refreshDiscoverMix}
                className="grid h-10 w-10 place-items-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-90"
                aria-label="Refresh Discover"
              >
                <RefreshCw size={17} />
              </button>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              disabled={!keyOk}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-white/80 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.11] active:scale-95 disabled:opacity-40"
              aria-label="Search animated titles"
            >
              <Search size={18} />
            </button>
          </div>
        </div>

        {WATCH_DROP_ENABLED && !activeCategory && (
          <button
            onClick={() => setWatchDropOpen(true)}
            className="group relative mt-3 h-11 w-full overflow-hidden rounded-[18px] bg-[#171018] text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.36)] active:scale-[0.985]"
            aria-label="Open Watch Drop"
          >
            <span className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,232,111,0.28),rgba(255,87,130,0.18),rgba(102,242,181,0.22))]" />
            <span className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/40 shadow-[0_0_18px_rgba(255,255,255,0.45)]" />
            <span className="relative z-10 flex h-full items-center justify-between px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/80">Pull for Watch Drop</span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-black/32 text-[16px] font-black text-white/80">⌄</span>
            </span>
          </button>
        )}
      </motion.header>
      <div className="h-[calc(4.125rem+max(0.75rem,env(safe-area-inset-top)))] shrink-0" aria-hidden />
      </>}

      <div className="relative z-10 flex-1 pt-1">
        {activeCategory ? (
          <CategoryGrid
            title={activeCategory.title}
            items={categoryItems.filter((show) => !hiddenIds.has(show.id))}
            loading={categoryLoading}
            sentinelRef={sentinelRef}
            ownedIds={liveOwnedSet}
            watchlistIds={liveWatchlistSet}
            onOpenShow={onOpenShow}
            onBack={() => {
              setHeaderVisible(true)
              setActiveCategory(null)
            }}
          />
        ) : !keyOk ? (
          <NoKey onOpenSettings={onOpenSettings} />
        ) : feedError ? (
          <p className="px-5 py-10 text-center text-rose-300 text-sm">{feedError}</p>
        ) : feedLoading || !visibleFeed || !librarySnapshot ? (
          <SkeletonRows />
        ) : (
          <FeedRows
            leadingContent={heroShows.length ? (
              <PortalHeroDeck
                shows={heroShows}
                recommendations={heroRecommendations}
                trailers={todayTrailers}
                ownedIds={liveOwnedSet}
                watchlistIds={liveWatchlistSet}
                onOpenShow={onOpenShow}
                onPlayTrailer={setSelectedTodayTrailer}
              />
            ) : (
              <TodayPicks shows={todayPicks} ownedIds={liveOwnedSet} watchlistIds={liveWatchlistSet} onOpenShow={onOpenShow} />
            )}
            todayPulse={todayPulse}
            todayPulseLoading={todayPulseLoading}
            todayPulseError={todayPulseError}
            todayTrailers={todayTrailers}
            onRetryToday={() => loadTodayPulse(true)}
            onPlayTodayTrailer={setSelectedTodayTrailer}
            feed={visibleFeed}
            ownedIds={liveOwnedIds}
            watchlistIds={liveWatchlistSet}
            profileOwnedIds={profileOwnedIds}
            profileShows={profileShows}
            profileTierAssignments={profileTierAssignments}
            tasteRecommendations={visibleTasteRecommendations}
            tasteRecommendationGroups={visibleTasteRecommendationGroups}
            onboardingFollowupCandidates={onboardingFollowupCandidates}
            showOnboardingFollowup={Boolean(onboardingFollowup)}
            onDismissOnboardingFollowup={() => {
              dismissOnboardingFollowup()
              setOnboardingFollowup(null)
            }}
            recommendationBoost={recommendationBoost}
            impressions={impressions}
            discoverSeed={discoverSeed}
            leadingIds={leadingImpressionIds}
            onImpressions={handleImpressions}
            onOpenCategory={openCategory}
            onBrowseAllStudios={() => openStudioDirectory(null)}
            onOpenStudio={(studioId) => openStudioDirectory(studioId)}
            onOpenShow={onOpenShow}
            featuredId={heroShows[0]?.id}
          />
        )}
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] overflow-y-auto bg-[#08070a]"
          >
            <div className="mx-auto min-h-full w-full max-w-md bg-[#08070a] pb-12">
              <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#08070a]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl">
                <div className="flex items-center gap-2">
                  <button onClick={closeSearch} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/70 active:scale-95" aria-label="Close search">
                    <ChevronLeft size={21} />
                  </button>
                  <div className="relative min-w-0 flex-1">
                    <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      autoFocus
                      type="text"
                      role="searchbox"
                      inputMode="search"
                      enterKeyHint="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search animated titles"
                      className="h-11 w-full rounded-full border border-white/[0.09] bg-white/[0.055] pl-10 pr-10 text-[15px] font-normal text-white outline-none placeholder:text-white/30 focus:border-[#f5c453]/50 focus:bg-white/[0.075]"
                    />
                    {query && (
                      <button onClick={() => setQuery('')} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-white/40 hover:text-white" aria-label="Clear search">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
                {searchError && <p className="mt-2 px-14 text-[12px] text-rose-300">{searchError}</p>}
              </header>
              <SearchResults
                query={query}
                loading={searchLoading || query.trim() !== debouncedQ.trim()}
                results={results}
                ownedIds={liveOwnedIds}
                watchlistIds={liveWatchlistSet}
                onOpenShow={(selected) => {
                  closeSearch()
                  onOpenShow(selected)
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TodayTrailerFeed
        key={selectedTodayTrailer?.video.key ?? 'trailer-feed-closed'}
        trailer={selectedTodayTrailer}
        trailers={todayTrailers}
        onClose={() => setSelectedTodayTrailer(null)}
      />

      <StudioDirectoryBrowser
        key={studioDirectoryOpen ? `studio:${studioDirectoryTargetId ?? 'all'}` : 'studio:closed'}
        open={studioDirectoryOpen}
        requestedStudioId={studioDirectoryTargetId}
        shows={ownedShows}
        watchlistShows={watchlistShows}
        onClose={closeStudioDirectory}
        onOpenShow={openShowFromStudio}
      />

      <AnimatePresence>
        {WATCH_DROP_ENABLED && watchDropOpen && (
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
  const discoverIdxRef = useRef(0)

  const tierByShow = useMemo(() => new Map(tierAssignments.map((a) => [a.showId, a.tier])), [tierAssignments])

  const watchlistIds = useMemo(() => new Set(watchlistShows.map((s) => s.id)), [watchlistShows])

  // Genre frequency map for S+A tier shows — used to boost taste-matching candidates
  const topTierGenres = useMemo(() => {
    const counts = new Map<string, number>()
    for (const show of ownedShows) {
      const tier = tierByShow.get(show.id)
      if (tier !== 'S' && tier !== 'A') continue
      for (const g of show.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    return counts
  }, [ownedShows, tierByShow])

  // Rewatch: owned shows sorted by tier (S→A→B→C→D→unranked), then top8 bonus
  const rewatchList = useMemo(() =>
    ownedShows.filter((show) => (show.mediaType ?? 'tv') === 'tv').sort((a, b) => {
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

  // Inject scroll keyframes once
  useEffect(() => {
    if (document.getElementById('wd-kf')) return
    const s = document.createElement('style')
    s.id = 'wd-kf'
    s.innerHTML = '@keyframes wd-l{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes wd-r{from{transform:translateX(-50%)}to{transform:translateX(0)}}'
    document.head.appendChild(s)
  }, [])

  const toggleShow = (show: Show) => {
    setResult(null)
    setSelected((prev) => {
      if (prev.some((s) => s.id === show.id)) return prev.filter((s) => s.id !== show.id)
      if (prev.length >= 3) return prev
      return [...prev, show]
    })
  }

  const handleGo = async (isRetry = false) => {
    if (selected.length === 0 || loading) return
    if (!isRetry) discoverIdxRef.current = 0
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
        const seenIds = loadWdSeen()

        // ── Anchor-based pool: recommendations + similar, 2 pages each ──────
        const anchorFetches = selected.flatMap((s) => [
          getShowRecommendations(s.id, 1, s.mediaType ?? 'tv').then((r) => r.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
          getShowRecommendations(s.id, 2, s.mediaType ?? 'tv').then((r) => r.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
          getSimilarShows(s.id, 1, s.mediaType ?? 'tv').then((r) => r.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
          getSimilarShows(s.id, 2, s.mediaType ?? 'tv').then((r) => r.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
        ])

        // ── Mood-based pool: TMDB /discover filtered by keyword IDs + genre ─
        // Resolved in parallel with anchor fetches — keyword IDs cached after first call
        let moodPool: LootShow[] = []
        if (mood) {
          const terms = MOOD_KEYWORD_TERMS[mood.key] ?? []
          const genreIds = mood.genreHints.map((g) => GENRE_NAME_TO_ID[g]).filter((id): id is number => id != null)
          const [kwIds, p1, p2] = await Promise.all([
            resolveKeywordIds(terms),
            Promise.resolve([] as LootShow[]), // placeholders resolved below
            Promise.resolve([] as LootShow[]),
          ])
          const [disc1, disc2] = await Promise.all([
            discoverShowsByMood(kwIds, genreIds, 1).then((r) => r.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
            discoverShowsByMood(kwIds, genreIds, 2).then((r) => r.results.map(tmdbToLoot)).catch(() => [] as LootShow[]),
          ])
          void p1; void p2 // placeholders consumed
          moodPool = [...disc1, ...disc2]
        }

        const rawGroups = await Promise.all(anchorFetches)

        // Interleave anchor groups so every anchor stays represented
        const merged: LootShow[] = []
        const maxLen = Math.max(...rawGroups.map((g) => g.length), 0)
        for (let i = 0; i < maxLen; i++) {
          for (const group of rawGroups) {
            if (group[i]) merged.push(group[i])
          }
        }
        // Mood pool goes in too — labelled for scoring boost below
        const moodPoolIds = new Set(moodPool.map((s) => s.id))
        merged.push(...moodPool)

        // Deduplicate, filter owned + low quality
        const dedupSeen = new Set<number>()
        const candidates = merged.filter((s) => {
          if (dedupSeen.has(s.id) || ownedIds.has(s.id)) return false
          if (s.rating > 0 && s.rating < 5.5) return false
          dedupSeen.add(s.id)
          return true
        })

        // Prefer unseen, fall back to full pool if everything has been shown
        const unseen = candidates.filter((s) => !seenIds.has(s.id))
        const pool = unseen.length >= 3 ? unseen : candidates

        // Score: mood keyword text match + TMDB keyword discover match + genre affinity
        const scored = pool.map((s) => {
          const text = `${s.title} ${s.overview} ${s.genre}`.toLowerCase()
          const moodTextScore = mood
            ? wordScore(text, mood.words) * 2 + (mood.genreHints.some((g) => s.genre === g) ? 3 : 0)
            : 0
          // Hard boost for shows that came back from TMDB's keyword-filtered discover
          const kwDiscoverBoost = moodPoolIds.has(s.id) ? 6 : 0
          const tasteScore = (topTierGenres.get(s.genre) ?? 0) * 0.8
          const popularityScore = Math.min(s.popularity / 200, 1.5)
          return { s, score: moodTextScore + kwDiscoverBoost + tasteScore + popularityScore }
        }).sort((a, b) => b.score - a.score).map((x) => x.s)

        const pick = scored[discoverIdxRef.current % Math.max(scored.length, 1)]
        if (pick) saveWdSeen(pick.id)
        setResult({ kind: 'discover', show: pick })
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

  // Portal poster pool — owned shows supplemented with TMDB cached data
  const posterPool = useMemo(() => {
    const owned = ownedShows.filter((s) => s.posterPath) as { id: number; posterPath: string | null }[]
    const feed = getCachedDiscoverFeed()
    const feedItems = feed ? FEED_KEYS.flatMap((key) => feed[key]) : []
    const ownedIds = new Set(owned.map((s) => s.id))
    const extra = feedItems.filter((s) => s.posterPath && !ownedIds.has(s.id))
    return seededShuffle([...owned, ...extra], hashString('pool-v2'))
  }, [ownedShows])

  // Infinite scrolling row data for the portal poster wall
  const rowData = useMemo(() => {
    if (posterPool.length === 0) return []
    const NUM_ROWS = 6
    const durations = [34, 21, 29, 18, 26, 16]
    return Array.from({ length: NUM_ROWS }, (_, r) => {
      const count = Math.max(20, posterPool.length)
      const shows = Array.from({ length: count }, (_, i) => posterPool[(r * 7 + i) % posterPool.length])
      const wobbles = shows.map((show, i) => {
        const h = hashString(`wb:${show.id}:${r}:${i}`)
        return {
          rotX: ((h % 7) - 3) * 0.9,
          rotY: (((h >> 4) % 9) - 4) * 0.75,
          dur: 2.4 + (h % 28) / 10,
          delay: (h % 42) / 10,
        }
      })
      return { shows, wobbles, dir: r % 2 === 0 ? 'left' : 'right' as const, dur: durations[r] }
    })
  }, [posterPool])

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
          {/* Infinite scrolling poster rows — CSS animation for seamless loop, perspective tilt */}
          <div
            className="absolute inset-0 overflow-hidden flex flex-col gap-[5px]"
            style={{ transform: 'perspective(900px) rotateX(6deg) scale(1.06)', transformOrigin: 'center 72%' }}
          >
            {rowData.map((row, ri) => (
              <div key={ri} className="flex-1 min-h-0 overflow-hidden">
                <div
                  className="flex h-full gap-[5px] will-change-transform"
                  style={{ animation: `wd-${row.dir === 'left' ? 'l' : 'r'} ${row.dur}s linear infinite` }}
                >
                  {[...row.shows, ...row.shows].map((show, si) => {
                    const wb = row.wobbles[si % row.wobbles.length]
                    return (
                      <div key={si} className="flex-shrink-0 h-full" style={{ aspectRatio: '2/3', perspective: 280 }}>
                        <motion.div
                          className="h-full w-full rounded-[6px] overflow-hidden"
                          animate={{ rotateX: [wb.rotX, -wb.rotX, wb.rotX], rotateY: [wb.rotY, -wb.rotY, wb.rotY] }}
                          transition={{ repeat: Infinity, duration: wb.dur, delay: wb.delay, ease: 'easeInOut' }}
                        >
                          <img src={imgUrl(show.posterPath!, 'w185')} alt="" className="h-full w-full object-cover" />
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Vignettes — thin, just enough for edges and buttons */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#060508] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-[#060508]/95 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#060508] to-transparent" />
          <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#060508] to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute left-4 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-[22px] leading-none text-white/60 ring-1 ring-white/10 active:scale-90"
          >×</button>

          {/* Buttons only — no heading */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-10 flex gap-3">
            {([
              { key: 'rewatch' as const, label: 'Rewatch', colors: 'from-[#ffe86f] via-[#ffb86f] to-[#ff7eb3]' },
              { key: 'discover' as const, label: 'Discover', colors: 'from-[#59f5c6] via-[#7b8eff] to-[#d96fff]' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPath(opt.key)}
                className="relative flex-1 overflow-hidden rounded-[22px] py-5 shadow-[0_18px_44px_rgba(0,0,0,0.7),0_3px_0_rgba(0,0,0,0.5)] active:scale-[0.96]"
              >
                <span className={cn('absolute inset-0 bg-gradient-to-br', opt.colors)} />
                <span className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.5),transparent_50%)]" />
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/20 rounded-b-[22px]" />
                <span className="relative z-10 text-[13px] font-black uppercase tracking-[0.18em] text-black">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Picker + result ──────────────────────────────── */}
      {path && (
        <div className="relative z-10 flex h-full flex-col">
          {/* Subtle bg */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,232,111,0.1),transparent_22rem),radial-gradient(circle_at_80%_30%,rgba(89,245,198,0.08),transparent_18rem)]" />

          {/* Header — hidden when fullscreen discover result is showing */}
          {!(result?.kind === 'discover' && result.show) && (
            <div className="relative flex items-center gap-3 px-4 pt-4 pb-3">
              <button
                onClick={handleBack}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[22px] leading-none text-white/70 ring-1 ring-white/10 active:scale-90"
              >‹</button>
            </div>
          )}

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

          {/* Rewatch result — fullscreen overlay */}
          {result?.kind === 'rewatch' && (
            <div className="absolute inset-0 z-20 flex flex-col bg-[#060509] text-white">
              {/* Back button only — no label */}
              <div className="flex-shrink-0 px-4 pt-4 pb-2">
                <button
                  onClick={() => setResult(null)}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/[0.08] active:scale-95"
                >
                  <ChevronLeft size={21} />
                </button>
              </div>

              {/* Cards — min-h-0 ensures flex child actually scrolls */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="px-4 pb-4 flex flex-col gap-4">
                  {result.picks.map(({ show, episode }) => (
                    <EpisodeResultCard key={show.id} show={show} episode={episode} />
                  ))}
                </div>
              </div>

              {/* Try Again */}
              <div className="flex-shrink-0 px-4 pb-10 pt-3">
                <button
                  onClick={() => void handleGo()}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/30 active:text-white/60 disabled:opacity-40"
                >
                  <RefreshCw size={12} />
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Discover empty state */}
          {result?.kind === 'discover' && !result.show && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
              <p className="text-center text-[14px] text-white/40">Nothing new found — try different anchors</p>
              <button onClick={() => void handleGo()} disabled={loading} className="relative h-11 w-full overflow-hidden rounded-[16px] bg-white/[0.07] ring-1 ring-white/10 active:scale-[0.984] disabled:opacity-40">
                <span className="relative z-10 flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-[0.18em] text-white/70"><RefreshCw size={14} />Try Again</span>
              </button>
            </div>
          )}

          {/* Discover result — fullscreen overlay, no header */}
          {result?.kind === 'discover' && result.show && (
            <div className="absolute inset-0 z-20">
              <DiscoverResultCard
                key={result.show.id}
                show={result.show}
                watchlistShelves={watchlistShelves}
                onDone={() => setResult(null)}
                onBack={handleBack}
                onRetry={() => { discoverIdxRef.current++; void handleGo(true) }}
                loading={loading}
              />
            </div>
          )}

      </div>
      )}
    </motion.div>
  )
}

function EpisodeResultCard({ show, episode }: { show: Show; episode: EpisodeOption }) {
  const [art, setArt] = useState<LandscapeArt | null>(() => landscapeArtCache.get(`${show.mediaType ?? 'tv'}:${show.id}`) ?? null)
  useEffect(() => {
    if (art) return
    let cancelled = false
    getLandscapeArt(show.id, show.mediaType)
      .then((next) => { if (!cancelled) setArt(next) })
      .catch(() => { if (!cancelled) setArt({ logoPath: null, tagline: '' }) })
    return () => { cancelled = true }
  }, [art, show.id, show.mediaType])

  const heroSrc = episode.stillPath
    ? imgUrl(episode.stillPath, 'w500')
    : show.backdropPath
      ? imgUrl(show.backdropPath, 'w500')
      : show.posterPath ? imgUrl(show.posterPath, 'w342') : null
  const logoSrc = art?.logoPath ? imgUrl(art.logoPath, 'w500') : null

  return (
    <div className="rounded-[20px] bg-[#0e0b12] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Compact hero — visual context only, logo lives inside */}
      <div className="relative h-[148px] overflow-hidden">
        {heroSrc && (
          <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.78]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0e0b12] to-transparent" />
        <div className="absolute bottom-3 left-4 z-10">
          {logoSrc
            ? <img src={logoSrc} alt={show.name} className="max-h-[44px] max-w-[58%] object-contain object-left drop-shadow-[0_4px_16px_rgba(0,0,0,1)]" />
            : <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">{show.name}</span>
          }
        </div>
      </div>

      {/* Episode info — content drives card height, no truncation */}
      <div className="px-4 pt-3 pb-5">
        <span className="text-[26px] font-black tracking-[-0.04em] text-white leading-none">
          S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')}
        </span>
        <p className="mt-1.5 text-[17px] font-bold leading-snug tracking-[-0.02em] text-white/80">
          {episode.name}
        </p>
        {episode.overview && (
          <p className="mt-2 text-[14px] font-medium leading-[1.6] text-white/50">
            {episode.overview}
          </p>
        )}
      </div>
    </div>
  )
}

function DiscoverResultCard({
  show,
  watchlistShelves,
  onDone,
  onBack,
  onRetry,
  loading,
}: {
  show: LootShow
  watchlistShelves: { id: string; name: string; showIds: number[] }[]
  onDone: () => void
  onBack: () => void
  onRetry: () => void
  loading: boolean
}) {
  const [art, setArt] = useState<LandscapeArt | null>(() => landscapeArtCache.get(`${show.mediaType}:${show.id}`) ?? null)
  const [action, setAction] = useState<'watchlist' | 'library' | null>(null)
  const [done, setDone] = useState<'watchlist' | 'library' | null>(null)

  useEffect(() => {
    if (art) return
    let cancelled = false
    getLandscapeArt(show.id, show.mediaType)
      .then((next) => { if (!cancelled) setArt(next) })
      .catch(() => { if (!cancelled) setArt({ logoPath: null, tagline: '' }) })
    return () => { cancelled = true }
  }, [art, show.id, show.mediaType])

  const handleWatchlist = async () => {
    if (action || done) return
    const shelf = watchlistShelves[0]
    if (!shelf) return
    setAction('watchlist')
    try {
      const now = Date.now()
      await addToWatchlistShelf(shelf.id, {
        id: show.id, name: show.title, posterPath: show.posterPath,
        backdropPath: show.backdropPath, overview: show.overview,
        year: show.year ? parseInt(show.year) : undefined,
        genres: show.rawGenres as Genre[],
        rawGenres: show.rawGenres,
        mediaType: show.mediaType,
        tradition: show.tradition,
        vibeIds: show.vibeIds,
        vibeEvidence: show.vibeEvidence,
        cardDescriptor: show.cardDescriptor,
        addedAt: now, updatedAt: now,
      })
      setDone('watchlist')
      setTimeout(onDone, 900)
    } finally { setAction(null) }
  }

  const handleLibrary = async () => {
    if (action || done) return
    setAction('library')
    try {
      const now = Date.now()
      await upsertShow({
        id: show.id,
        name: show.title,
        year: show.year ? parseInt(show.year) : undefined,
        posterPath: show.posterPath,
        backdropPath: show.backdropPath,
        overview: show.overview,
        genres: show.rawGenres as Genre[],
        rawGenres: show.rawGenres,
        mediaType: show.mediaType,
        tradition: show.tradition,
        vibeIds: show.vibeIds,
        vibeEvidence: show.vibeEvidence,
        cardDescriptor: show.cardDescriptor,
        addedAt: now,
        updatedAt: now,
      })
      setDone('library')
      setTimeout(onDone, 900)
    } finally { setAction(null) }
  }

  const heroSrc = show.backdropPath
    ? imgUrl(show.backdropPath, 'original')
    : show.posterPath ? imgUrl(show.posterPath, 'w500') : null
  const logoSrc = art?.logoPath ? imgUrl(art.logoPath, 'w500') : null
  const meta = [
    show.year,
    show.genre,
    show.rating > 0 ? `★ ${show.rating.toFixed(1)}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="absolute inset-0 flex flex-col bg-[#060509] text-white">
      {/* Hero — mirrors ShowDetail exactly */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ minHeight: 'min(470px, 55vh)' }}>
        {heroSrc && (
          <img
            src={heroSrc} alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.86]"
          />
        )}
        {/* Gradient layers — bottom, left-side, top fade */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#060509] via-[#060509]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-black/8" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/8 via-black/18 to-[#060509]" />

        {/* Back button */}
        <header className="relative z-10 flex items-center px-4 pt-4">
          <button
            onClick={onBack}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95"
          >
            <ChevronLeft size={21} />
          </button>
        </header>

        {/* Logo / title + meta — pinned to hero bottom */}
        <div className="absolute inset-x-0 bottom-8 z-10 px-5">
          {logoSrc ? (
            <img
              src={logoSrc} alt={show.title}
              className="max-h-[128px] max-w-[86%] object-contain object-left drop-shadow-[0_16px_36px_rgba(0,0,0,0.96)]"
            />
          ) : (
            <h1 className="text-[48px] font-black leading-[0.84] tracking-[-0.12em] text-balance">
              {show.title}
            </h1>
          )}
          <div className="mt-4 flex flex-wrap gap-x-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
            {meta.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </div>

      {/* Scrollable content — grows to fill space between hero and buttons */}
      <div className="flex-1 overflow-y-auto overscroll-contain -mt-6 px-5 pt-0 pb-4">
        {logoSrc && (
          <p className="mb-2 text-[22px] font-bold tracking-[-0.03em] text-white/80">
            {show.title}
          </p>
        )}
        {show.overview && (
          <p className="text-[20px] font-semibold leading-[1.15] tracking-[-0.035em] text-white/85">
            {show.overview}
          </p>
        )}
      </div>

      {/* Buttons — always anchored at bottom, thumb-reachable */}
      <div className="flex-shrink-0 px-5 pb-10 pt-3 bg-[#060509]">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => void handleLibrary()}
            disabled={!!action || !!done}
            className="flex h-14 items-center justify-center rounded-[24px] bg-white/[0.08] text-[11px] font-black uppercase tracking-[0.16em] text-white ring-1 ring-white/[0.08] active:scale-[0.98] disabled:opacity-50"
          >
            {done === 'library' ? 'In Library ✓' : action === 'library' ? '…' : 'Add to Library'}
          </button>

          <button
            onClick={() => void handleWatchlist()}
            disabled={!!action || !!done}
            className="relative flex h-14 items-center justify-center overflow-hidden rounded-[24px] active:scale-[0.98] disabled:opacity-50"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#59f5c6] via-[#7b8eff] to-[#d96fff]" />
            <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.16em] text-black">
              {done === 'watchlist' ? 'Added ✓' : action === 'watchlist' ? '…' : '+ Watchlist'}
            </span>
          </button>
        </div>

        <button
          onClick={onRetry}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/30 active:text-white/60 disabled:opacity-40"
        >
          <RefreshCw size={12} />
          Try Again
        </button>
      </div>
    </div>
  )
}


function PortalHeroDeck({
  shows,
  recommendations,
  trailers,
  ownedIds,
  watchlistIds,
  onOpenShow,
  onPlayTrailer,
}: {
  shows: LootShow[]
  recommendations: Map<number, RecommendationContext>
  trailers: AnimationTrailerFeature[]
  ownedIds: Set<number>
  watchlistIds: Set<number>
  onOpenShow: (show: Show, context?: RecommendationContext) => void
  onPlayTrailer: (trailer: AnimationTrailerFeature) => void
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const railRef = useRef<HTMLDivElement | null>(null)

  const updateActiveSlide = () => {
    const rail = railRef.current
    if (!rail) return
    const slides = Array.from(rail.children) as HTMLElement[]
    const next = slides.reduce((nearest, slide, index) => (
      Math.abs(slide.offsetLeft - rail.scrollLeft) < Math.abs(slides[nearest].offsetLeft - rail.scrollLeft) ? index : nearest
    ), 0)
    setActiveIndex((current) => current === next ? current : next)
  }

  const showSlide = (index: number) => {
    const rail = railRef.current
    const slide = rail?.children[index] as HTMLElement | undefined
    if (!rail || !slide) return
    rail.scrollTo({ left: slide.offsetLeft - rail.offsetLeft, behavior: 'smooth' })
    setActiveIndex(index)
  }

  return (
    <section className="mb-8">
      <div ref={railRef} onScroll={updateActiveSlide} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 no-scrollbar">
        {shows.map((show, index) => {
          const recommendationContext = recommendations.get(show.id)
          return (
            <div key={`${show.mediaType}:${show.id}`} className="w-[calc(100vw-1.5rem)] max-w-[424px] shrink-0 snap-center" aria-label={`Featured title ${index + 1} of ${shows.length}`}>
              <PortalHero
                show={show}
                recommendationContext={recommendationContext}
                trailer={trailers.find((feature) => feature.show.id === show.id && feature.show.mediaType === show.mediaType)}
                isOwned={ownedIds.has(show.id)}
                isWatchlisted={watchlistIds.has(show.id)}
                onOpenShow={onOpenShow}
                onPlayTrailer={onPlayTrailer}
              />
            </div>
          )
        })}
      </div>
      {shows.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" aria-label={`Feature ${activeIndex + 1} of ${shows.length}`}>
          {shows.map((show, index) => (
            <button key={show.id} onClick={() => showSlide(index)} className="grid h-6 w-6 place-items-center" aria-label={`Show featured title ${index + 1}`} aria-current={activeIndex === index ? 'true' : undefined}>
              <span className={cn(
                'rounded-full transition-all',
                activeIndex === index
                  ? 'h-1.5 w-6 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.18)]'
                  : 'h-1.5 w-1.5 bg-white/30',
              )} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function PortalHero({
  show,
  recommendationContext,
  trailer,
  isOwned,
  isWatchlisted,
  onOpenShow,
  onPlayTrailer,
}: {
  show: LootShow
  recommendationContext?: RecommendationContext
  trailer?: AnimationTrailerFeature
  isOwned: boolean
  isWatchlisted: boolean
  onOpenShow: (show: Show, context?: RecommendationContext) => void
  onPlayTrailer: (trailer: AnimationTrailerFeature) => void
}) {
  const [shine, setShine] = useState(false)
  const [art, setArt] = useState<LandscapeArt | null>(() => landscapeArtCache.get(`${show.mediaType}:${show.id}`) ?? null)
  const [portalAccent, setPortalAccent] = useState('#727985')
  const [runtimeMeta, setRuntimeMeta] = useState<string | null>(null)
  const [providerMeta, setProviderMeta] = useState<{ name: string; logoPath: string | null } | null>(null)
  const imdbRating = useImdbRating(show.id)
  const heroRef = useRef<HTMLElement | null>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const backdropY = useTransform(scrollYProgress, [0, 1], [0, 72])
  const controls = useAnimation()

  useEffect(() => {
    const cached = landscapeArtCache.get(`${show.mediaType}:${show.id}`)
    if (cached) {
      setArt(cached)
      return
    }
    setArt(null)
    let cancelled = false
    getLandscapeArt(show.id, show.mediaType)
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

  const bg = show.backdropPath
    ? imgUrl(show.backdropPath, 'original')
    : show.posterPath
      ? imgUrl(show.posterPath, 'w500')
      : ''
  const copy = art?.tagline || ''

  useEffect(() => {
    let cancelled = false
    if (bg) dominantColor(bg).then((color) => { if (!cancelled) setPortalAccent(color) })
    Promise.all([
      getShowDetail(show.id, show.mediaType).catch(() => null),
      getShowWatchProviders(show.id, getWatchRegion(), show.mediaType).catch(() => null),
    ]).then(([detail, providers]) => {
      if (cancelled) return
      const runtime = show.mediaType === 'movie'
        ? detail?.runtime ? `${detail.runtime} min` : 'Film'
        : detail?.number_of_seasons
          ? `${detail.number_of_seasons} season${detail.number_of_seasons === 1 ? '' : 's'}${detail.number_of_episodes ? ` · ${detail.number_of_episodes} eps` : ''}`
          : null
      const provider = [...(providers?.flatrate ?? []), ...(providers?.free ?? []), ...(providers?.ads ?? [])][0]
      setRuntimeMeta(runtime)
      setProviderMeta(provider ? { name: provider.provider_name, logoPath: provider.logo_path } : null)
    })
    return () => { cancelled = true }
  }, [bg, show.id, show.mediaType])

  const handleAdd = async () => {
    await persistShow(show)
  }

  const handleWatchlist = async () => {
    await persistToDefaultWatchlist(show)
  }

  const handleSaveSuccess = () => {
    setShine(true)
    void controls.start({
      scale: [1, 1.018, 0.995, 1],
      transition: { duration: 0.48, times: [0, 0.35, 0.72, 1] },
    })
    setTimeout(() => setShine(false), 760)
  }

  return (
    <motion.section
      ref={heroRef}
      animate={controls}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.965, y: 18 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpenShow(lootToShow(show), recommendationContext)}
      className="relative h-[430px] w-full overflow-hidden rounded-[34px] bg-black shadow-[0_26px_80px_rgba(0,0,0,0.72)] loot-vignette"
      style={{ boxShadow: `0 26px 80px rgba(0,0,0,0.72), 0 0 54px ${portalAccent}24` }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenShow(lootToShow(show), recommendationContext)
      }}
    >
      {bg && <motion.img src={bg} alt="" className="absolute -inset-y-12 left-0 h-[calc(100%+6rem)] w-full object-cover opacity-80" style={{ y: reducedMotion ? 0 : backdropY }} />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/18 to-black/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
      <div
        className="absolute -left-16 top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: `${portalAccent}36` }}
      />
      <AnimatePresence>{shine && <ShineOverlay key="hero-shine" />}</AnimatePresence>

      {trailer && (
        <button
          onClick={(event) => {
            event.stopPropagation()
            onPlayTrailer(trailer)
          }}
          className="absolute left-4 top-4 z-20 flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-[12px] font-semibold text-black shadow-xl active:scale-95"
          aria-label={`Play trailer for ${show.title}`}
        >
          <Play size={14} fill="currentColor" /> Trailer
        </button>
      )}

      <div className="absolute right-3 top-3 z-30">
        <FeedSaveActions
          isSeen={isOwned}
          isWatchlisted={isWatchlisted}
          onSeen={handleAdd}
          onWatchlist={handleWatchlist}
          onSuccess={handleSaveSuccess}
          size="sm"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-6">
        {art?.logoPath ? (
          <img
            src={imgUrl(art.logoPath, 'w500')}
            alt={show.title}
            className="mb-4 max-h-[100px] max-w-[82%] object-contain object-left drop-shadow-[0_10px_24px_rgba(0,0,0,0.9)]"
          />
        ) : (
          <h2 className="mb-4 max-w-[88%] text-5xl font-black leading-[0.84] tracking-[-0.12em] text-balance drop-shadow-[0_10px_24px_rgba(0,0,0,0.9)]">
            {show.title}
          </h2>
        )}
        {copy && (
          <p className="max-w-[320px] text-[18px] font-medium leading-[1.25] text-white/85 text-balance">
            {copy}
          </p>
        )}
        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 text-[13px] font-semibold text-white/75">
              {imdbRating ? (
                <ImdbBadge showId={show.id} compact />
              ) : show.rating > 0 ? (
                <span className="inline-flex h-6 items-center overflow-hidden rounded-[8px] bg-black/70 text-[10px] font-bold text-white ring-1 ring-white/10">
                  <span className="grid h-full place-items-center bg-[#0d253f] px-1.5 text-[#90cea1]">TMDB</span>
                  <span className="px-1.5 tabular-nums">{show.rating.toFixed(1)}</span>
                </span>
              ) : null}
              {show.year !== '—' && <span>{show.year}</span>}
              {runtimeMeta && <span>{runtimeMeta}</span>}
            </div>
            {(getVibeTitle(show.vibeIds[0]) ?? getSecondaryAnimationGenre(show.rawGenres)) && (
              <p className="mt-2 text-[12px] font-medium text-white/50">{getVibeTitle(show.vibeIds[0]) ?? getSecondaryAnimationGenre(show.rawGenres)}</p>
            )}
          </div>
          {providerMeta?.logoPath && (
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-black/55 shadow-[0_8px_20px_rgba(0,0,0,0.36)] ring-1 ring-white/[0.14]" title={`Streaming on ${providerMeta.name}`} aria-label={`Streaming on ${providerMeta.name}`}>
              <img src={imgUrl(providerMeta.logoPath, 'w185')} alt="" className="h-full w-full object-cover" />
            </span>
          )}
        </div>
      </div>
    </motion.section>
  )
}

function TodayPicks({
  shows,
  ownedIds,
  watchlistIds,
  onOpenShow,
}: {
  shows: LootShow[]
  ownedIds: Set<number>
  watchlistIds: Set<number>
  onOpenShow: (show: Show) => void
}) {
  if (!shows.length) return null
  return (
    <section className="mb-11">
      <div className="mb-3 flex items-center justify-between px-4">
        <h3 className="text-[19px] font-bold tracking-[-0.025em] text-white/90">In focus</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 px-4 pb-3">
        {shows.slice(0, 3).map((show) => (
          <LandscapeCard
            key={show.id}
            show={show}
            isOwned={ownedIds.has(show.id)}
            isWatchlisted={watchlistIds.has(show.id)}
            onOpenShow={onOpenShow}
          />
        ))}
      </div>
    </section>
  )
}

function CategoryGrid({
  title,
  items,
  loading,
  sentinelRef,
  ownedIds,
  watchlistIds,
  onOpenShow,
  onBack,
}: {
  title: string
  items: LootShow[]
  loading: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  ownedIds: Set<number>
  watchlistIds: Set<number>
  onOpenShow: (show: Show) => void
  onBack: () => void
}) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

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
      <div className="sticky top-0 z-20 -mx-4 mb-4 bg-[#08070a]/70 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex h-12 items-center gap-3 rounded-full bg-white/[0.065] px-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.09]">
          <button
            onClick={onBack}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/30 text-white/80 active:scale-95"
            aria-label="Back to Discover"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-[-0.025em] text-white">{title}</h2>
          <span className="shrink-0 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/50">
            {loading && items.length === 0 ? '…' : items.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((show) => (
          <PortraitCard
            key={`${title}-${show.id}`}
            show={show}
            isOwned={ownedIds.has(show.id)}
            isWatchlisted={watchlistIds.has(show.id)}
            onOpenShow={onOpenShow}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-7 h-7 border-2 border-[#f5c453] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

function NoKey({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="px-5 py-16 text-center">
      <p className="text-sm text-white/75">Add a TMDB API key to discover anime, cartoons, grown-up animation, and animated films. Live action is never included.</p>
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
  query,
  loading,
  results,
  ownedIds,
  watchlistIds,
  onOpenShow,
}: {
  query: string
  loading: boolean
  results: LootShow[]
  ownedIds: number[]
  watchlistIds: Set<number>
  onOpenShow: (show: Show) => void
}) {
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.045] text-white/25 ring-1 ring-white/[0.06]">
          <Search size={23} />
        </span>
        <p className="mt-4 text-[15px] font-medium text-white/45">Find any animated title</p>
      </div>
    )
  }
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
        <p className="text-[15px] font-medium">No animated titles found</p>
      </div>
    )
  }
  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-2 gap-4">
        {results.map((show) => (
          <PortraitCard
            key={show.id}
            show={show}
            isOwned={ownedIds.includes(show.id)}
            isWatchlisted={watchlistIds.has(show.id)}
            onOpenShow={onOpenShow}
          />
        ))}
      </div>
    </div>
  )
}

type TastePacket = {
  anchor: Show
  tier?: Tier
  shows: LootShow[]
}

function buildTastePackets(
  groups: TasteRecommendationGroup[],
  profileShows: Show[],
  assignments: TierAssignment[],
  ownedIds: Set<number>,
  seed: number,
  impressions: DiscoverImpressions,
  leadingIds: number[],
  featuredId?: number,
) {
  const showsById = new Map(profileShows.map((show) => [show.id, show]))
  const tierByShow = new Map(assignments.map((assignment) => [assignment.showId, assignment.tier]))
  const priority = (show: Show) => {
    const tier = tierByShow.get(show.id)
    const tierScore = tier === 'S' ? 100 : tier === 'A' ? 80 : 0
    const top8Score = typeof show.top8Position === 'number' ? 70 - show.top8Position : 0
    return tierScore + top8Score
  }
  const used = new Set<number>([...ownedIds, ...leadingIds, ...(featuredId ? [featuredId] : [])])
  const packets: TastePacket[] = []

  const candidates = groups
    .map((group) => ({ ...group, anchor: showsById.get(group.anchorId) }))
    .filter((group): group is TasteRecommendationGroup & { anchor: Show } => Boolean(group.anchor && priority(group.anchor) > 0))
    .sort((a, b) => priority(b.anchor) - priority(a.anchor))

  for (const group of candidates) {
    const available = group.shows
      .filter((show) => !used.has(show.id))
      .sort((a, b) => impressionPenalty(a, impressions) - impressionPenalty(b, impressions))
    const rotated = rotatingSelection(available, seed ^ hashString(String(group.anchorId)), 12)
    const shows = diversifyShows(rotated, 8, 3)
    if (shows.length < 4) continue
    shows.forEach((show) => used.add(show.id))
    packets.push({ anchor: group.anchor, tier: tierByShow.get(group.anchor.id), shows })
    if (packets.length >= 2) break
  }

  return packets
}

function FeedRows({
  leadingContent,
  todayPulse,
  todayPulseLoading,
  todayPulseError,
  todayTrailers,
  onRetryToday,
  onPlayTodayTrailer,
  feed,
  ownedIds,
  watchlistIds,
  profileOwnedIds,
  profileShows,
  profileTierAssignments,
  tasteRecommendations,
  tasteRecommendationGroups,
  onboardingFollowupCandidates,
  showOnboardingFollowup,
  onDismissOnboardingFollowup,
  recommendationBoost,
  impressions,
  discoverSeed,
  leadingIds,
  onImpressions,
  onOpenCategory,
  onBrowseAllStudios,
  onOpenStudio,
  onOpenShow,
  featuredId,
}: {
  leadingContent: ReactNode
  todayPulse: AnimationTodayPulse | null
  todayPulseLoading: boolean
  todayPulseError: string | null
  todayTrailers: AnimationTrailerFeature[]
  onRetryToday: () => void
  onPlayTodayTrailer: (trailer: AnimationTrailerFeature) => void
  feed: DiscoverFeed
  ownedIds: number[]
  watchlistIds: Set<number>
  profileOwnedIds: number[]
  profileShows: Show[]
  profileTierAssignments: TierAssignment[]
  tasteRecommendations: LootShow[]
  tasteRecommendationGroups: TasteRecommendationGroup[]
  onboardingFollowupCandidates: LootShow[]
  showOnboardingFollowup: boolean
  onDismissOnboardingFollowup: () => void
  recommendationBoost: Map<number, number>
  impressions: DiscoverImpressions
  discoverSeed: number
  leadingIds: number[]
  onImpressions: (ids: number[]) => void
  onOpenCategory: (key: DiscoverCategoryKey, title: string) => void
  onBrowseAllStudios: () => void
  onOpenStudio: (studioId: number) => void
  onOpenShow: (show: Show, context?: RecommendationContext) => void
  featuredId?: number
}) {
  const profileOwnedSet = useMemo(() => new Set(profileOwnedIds), [profileOwnedIds])
  const tasteWeights = useMemo(() => buildTasteWeights(profileShows, profileTierAssignments), [profileShows, profileTierAssignments])
  const personalized = useMemo(() => {
    const diverse = diversifyShows(canonRow(feed, tasteWeights, profileOwnedSet, tasteRecommendations, recommendationBoost, impressions, featuredId), 24, 3)
    const available = diverse.filter((show) => !leadingIds.includes(show.id))
    return seededShuffle(available.slice(0, 18), discoverSeed + 17).slice(0, 12)
  }, [discoverSeed, feed, featuredId, impressions, leadingIds, profileOwnedSet, recommendationBoost, tasteRecommendations, tasteWeights])
  const packets = useMemo(
    () => buildTastePackets(tasteRecommendationGroups, profileShows, profileTierAssignments, profileOwnedSet, discoverSeed, impressions, leadingIds, featuredId),
    [discoverSeed, featuredId, impressions, leadingIds, profileOwnedSet, profileShows, profileTierAssignments, tasteRecommendationGroups],
  )
  const sourceRows = useMemo(() => {
    const rows = {} as Record<keyof DiscoverFeed, LootShow[]>
    const used = new Set(leadingIds)
    const leadingRecommendations = packets.length
      ? packets.flatMap((packet) => packet.shows)
      : personalized
    leadingRecommendations.forEach((show) => used.add(show.id))

    HOME_FEED_KEYS.forEach((key, index) => {
      const preserveOrder = key === 'freshStudios' || key === 'newAnime' || key === 'newWestern'
      const fresh = personalizeShows(feed[key], tasteWeights, profileOwnedSet, {
        featuredId,
        impressions,
        preserveOrder,
      })
      const fallback = fresh.length >= 4
        ? fresh
        : personalizeShows(feed[key], tasteWeights, profileOwnedSet, {
          allowOwned: true,
          featuredId,
          impressions,
          preserveOrder,
        })
      const unclaimed = fallback.filter((show) => !used.has(show.id))
      const pool = unclaimed.length >= 6 ? unclaimed : uniqueShows([...unclaimed, ...fallback])
      const selected = rotatingSelection(pool, discoverSeed ^ hashString(`${key}:${index}`), 10)
      selected.forEach((show) => used.add(show.id))
      rows[key] = selected
    })

    return rows
  }, [discoverSeed, featuredId, feed, impressions, leadingIds, packets, personalized, profileOwnedSet, tasteWeights])
  const rotatingVibeId = useMemo(() => {
    const [first, ...rest] = sourceRows.vibeCrate
    return first?.vibeIds.find((vibeId) => rest.every((show) => show.vibeIds.includes(vibeId)))
  }, [sourceRows.vibeCrate])
  const rotatingVibeTitle = getVibeTitle(rotatingVibeId) ?? 'A different side of animation'
  const rotatingVibeSubtitle = getVibeSubtitle(rotatingVibeId) ?? 'A focused selection that changes with the feed.'

  useEffect(() => {
    const visibleRecommendations = packets.length
      ? packets.flatMap((packet) => packet.shows.slice(0, 4))
      : personalized.slice(0, 4)
    const visibleSourceShows = HOME_FEED_KEYS.flatMap((key) => sourceRows[key].slice(0, 4))
    onImpressions([
      ...leadingIds,
      ...visibleRecommendations.map((show) => show.id),
      ...visibleSourceShows.map((show) => show.id),
    ])
  }, [leadingIds, onImpressions, packets, personalized, sourceRows])

  return (
    <>
      <section>
        {leadingContent}
        <AnimatePresence initial={false}>
          {showOnboardingFollowup && onboardingFollowupCandidates.length > 0 && (
            <OnboardingFollowupRail
              shows={onboardingFollowupCandidates}
              ownedIds={ownedIds}
              watchlistIds={watchlistIds}
              onDismiss={onDismissOnboardingFollowup}
              onOpenShow={onOpenShow}
            />
          )}
        </AnimatePresence>
        <TodayInAnimation
          pulse={todayPulse}
          loading={todayPulseLoading}
          error={todayPulseError}
          trailers={todayTrailers}
          ownedIds={ownedIds}
          watchlistIds={watchlistIds}
          onRetry={onRetryToday}
          onOpenShow={onOpenShow}
          onPlayTrailer={onPlayTodayTrailer}
        />
      </section>

      <section>
        <ChapterHeader title="For you" />
        {packets.length
          ? packets.slice(0, 2).map((packet) => (
              <TastePacketRow key={packet.anchor.id} packet={packet} ownedIds={ownedIds} watchlistIds={watchlistIds} onOpenShow={onOpenShow} />
            ))
          : <CarouselRow title="Picked for your taste" categoryKey="vibeCrate" shows={personalized} ownedIds={ownedIds} watchlistIds={watchlistIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />}
      </section>

      <section>
        <StudioFeedRail onBrowseAll={onBrowseAllStudios} onOpenStudio={onOpenStudio} />
        <CarouselRow title="Recently released" categoryKey="freshStudios" shows={sourceRows.freshStudios} ownedIds={ownedIds} watchlistIds={watchlistIds} landscape onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
        <CarouselRow title="New this season · Anime" categoryKey="newAnime" shows={sourceRows.newAnime} ownedIds={ownedIds} watchlistIds={watchlistIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
        <CarouselRow title={rotatingVibeTitle} subtitle={rotatingVibeSubtitle} categoryKey="vibeCrate" shows={sourceRows.vibeCrate} ownedIds={ownedIds} watchlistIds={watchlistIds} landscape browseable={false} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
        <CarouselRow title="Animated films" categoryKey="animatedFilms" shows={sourceRows.animatedFilms} ownedIds={ownedIds} watchlistIds={watchlistIds} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
        <RankedLists feed={feed} pulse={todayPulse} onOpenCategory={onOpenCategory} onOpenShow={onOpenShow} />
      </section>
    </>
  )
}

function OnboardingFollowupRail({
  shows,
  ownedIds,
  watchlistIds,
  onDismiss,
  onOpenShow,
}: {
  shows: LootShow[]
  ownedIds: number[]
  watchlistIds: Set<number>
  onDismiss: () => void
  onOpenShow: (show: Show) => void
}) {
  const reducedMotion = useReducedMotion()
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds])
  const atmosphere = shows.find((show) => show.backdropPath || show.posterPath)

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-8 overflow-hidden bg-[#0b0c0e] py-6"
      aria-labelledby="onboarding-followup-title"
    >
      {atmosphere && (
        <img
          src={imgUrl(atmosphere.backdropPath || atmosphere.posterPath, 'w500')}
          alt=""
          className="pointer-events-none absolute inset-[-30px] h-[calc(100%+60px)] w-[calc(100%+60px)] max-w-none object-cover opacity-[0.13] blur-3xl saturate-150"
          aria-hidden
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b0c0e]/72 via-[#0b0c0e]/88 to-[#0b0c0e]" />

      <div className="relative mb-5 flex items-start justify-between gap-4 px-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">One quick follow-up</p>
          <h2 id="onboarding-followup-title" className="mt-1 text-[27px] font-black leading-[0.95] tracking-[-0.06em] text-white">Have you watched these?</h2>
          <p className="mt-2 max-w-[290px] text-[13px] leading-relaxed text-white/48">Connected to the titles you picked.</p>
        </div>
        <button onClick={onDismiss} className="grid h-11 shrink-0 place-items-center px-2 text-[12px] font-semibold text-white/48 hover:text-white active:scale-95" aria-label="Finish onboarding follow-up">
          Done
        </button>
      </div>

      <div className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
        {shows.map((show) => {
          return (
            <article key={show.id} className="w-[124px] shrink-0 snap-start">
              <div className="relative aspect-[2/3] w-full">
                <button onClick={() => onOpenShow(lootToShow(show))} className="group relative block h-full w-full overflow-hidden rounded-[17px] bg-white/[0.055] text-left shadow-[0_16px_36px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.09] active:scale-[0.98]" aria-label={`Open ${show.title}`}>
                  {show.posterPath || show.backdropPath ? <img src={imgUrl(show.posterPath || show.backdropPath, 'w342')} alt={show.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" loading="lazy" /> : null}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/66 via-transparent to-black/5" />
                </button>
                <div className="absolute right-0.5 top-0.5 z-20">
                  <FeedSaveActions
                    isSeen={ownedSet.has(show.id)}
                    isWatchlisted={watchlistIds.has(show.id)}
                    onSeen={() => persistShow(show)}
                    onWatchlist={() => persistToDefaultWatchlist(show)}
                    size="sm"
                  />
                </div>
              </div>
              <h3 className="mt-2 line-clamp-2 min-h-9 text-[13px] font-semibold leading-[1.25] text-white/84">{show.title}</h3>
            </article>
          )
        })}
      </div>
    </motion.section>
  )
}

function scheduleDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${date}T12:00:00`))
}

function episodeCode(episode: AnimationScheduleDay['entries'][number]['episode']) {
  if (!episode) return null
  return `S${episode.season_number} E${episode.episode_number}`
}

function episodeName(episode: AnimationScheduleDay['entries'][number]['episode']) {
  if (!episode?.name) return null
  const generic = new RegExp(`^episode\\s*${episode.episode_number}$`, 'i')
  return generic.test(episode.name.trim()) ? null : episode.name.trim()
}

function mergeScheduleDay(base: AnimationScheduleDay, enriched: AnimationScheduleDay) {
  const episodes = new Map(enriched.entries.map((entry) => [entry.show.id, entry.episode]))
  return {
    ...base,
    entries: base.entries.map((entry) => (
      episodes.has(entry.show.id) ? { ...entry, episode: episodes.get(entry.show.id) } : entry
    )),
  }
}

function TodayInAnimation({
  pulse,
  loading,
  error,
  trailers,
  ownedIds,
  watchlistIds,
  onRetry,
  onOpenShow,
  onPlayTrailer,
}: {
  pulse: AnimationTodayPulse | null
  loading: boolean
  error: string | null
  trailers: AnimationTrailerFeature[]
  ownedIds: number[]
  watchlistIds: Set<number>
  onRetry: () => void
  onOpenShow: (show: Show) => void
  onPlayTrailer: (trailer: AnimationTrailerFeature) => void
}) {
  const [selectedDay, setSelectedDay] = useState<AnimationScheduleDay | null>(null)
  const [episodeDays, setEpisodeDays] = useState<Record<string, AnimationScheduleDay>>({})

  useEffect(() => {
    if (!pulse) return
    let active = true
    const previewDays = pulse.days.map((day, index) => (
      index === 0 ? day : { ...day, entries: day.entries.slice(0, 1) }
    ))
    void Promise.all(previewDays.map((day) => getAnimationScheduleDayEpisodes(day)))
      .then((days) => {
        if (!active) return
        setEpisodeDays((current) => {
          const next = { ...current }
          days.forEach((day) => { next[day.date] = mergeScheduleDay(pulse.days.find((candidate) => candidate.date === day.date) ?? day, day) })
          return next
        })
      })
    return () => { active = false }
  }, [pulse])

  if (loading && !pulse) return <TodayPulseSkeleton />
  if (!pulse) {
    return (
      <div className="mx-4 mb-10 rounded-[20px] border border-white/[0.07] bg-white/[0.025] px-4 py-5 text-[14px] text-white/45">
        <p>{error || 'Today’s animation schedule is temporarily unavailable.'}</p>
        <button onClick={onRetry} className="mt-3 rounded-full bg-white/[0.08] px-4 py-2 text-[12px] font-semibold text-white/75 active:scale-95">Try again</button>
      </div>
    )
  }

  const today = episodeDays[pulse.days[0].date] ?? pulse.days[0]
  const weekAhead = pulse.days.slice(1).filter((day) => day.entries.length).map((day) => episodeDays[day.date] ?? day)
  const trendingShows = pulse.trending.slice(0, 10)
  const relevantShowIds = new Set([...ownedIds, ...watchlistIds])
  const relevantSchedule = [today, ...weekAhead]
    .flatMap((day) => day.entries.map((entry) => ({ day, entry })))
    .filter(({ entry }) => relevantShowIds.has(entry.show.id) && Boolean(entry.episode))
    .slice(0, 2)
  const featuredTrailer = trailers[0]
  const featuredTrailerArt = featuredTrailer?.show.backdropPath
    ? imgUrl(featuredTrailer.show.backdropPath, 'original')
    : featuredTrailer
      ? `https://i.ytimg.com/vi/${featuredTrailer.video.key}/maxresdefault.jpg`
      : ''

  return (
    <div>
      {trendingShows.length > 0 && (
        <section className="mb-11">
          <div className="mb-4 px-4">
            <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-white/95">Trending now</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar snap-x snap-mandatory">
            {trendingShows.map((show, index) => (
              <LandscapeCard key={`${show.mediaType}:${show.id}`} show={show} rank={index + 1} isOwned={ownedIds.includes(show.id)} isWatchlisted={watchlistIds.has(show.id)} onOpenShow={onOpenShow} />
            ))}
          </div>
        </section>
      )}

      {featuredTrailer && (
        <section
          className="relative mb-11 overflow-hidden bg-black"
          aria-labelledby="today-trailers-heading"
          data-testid="today-trailers"
        >
          <h3
            id="today-trailers-heading"
            className="pointer-events-none absolute inset-x-5 top-5 z-20 text-[16px] font-semibold tracking-[-0.025em] text-white/92 [text-shadow:0_2px_18px_rgba(0,0,0,0.75)]"
          >
            Trailers &amp; clips
          </h3>
          <button
            onClick={() => onPlayTrailer(featuredTrailer)}
            className="group relative block h-[min(68svh,520px)] min-h-[430px] w-full overflow-hidden bg-black text-left active:opacity-90"
            aria-label={`Open trailer feed, starting with ${featuredTrailer.show.title}`}
          >
            <img
              src={featuredTrailerArt}
              alt=""
              className="absolute inset-0 h-full w-full scale-[1.02] object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.05]"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.48)_0%,transparent_27%,transparent_58%,rgba(0,0,0,0.88)_100%)]" />
            <span className="absolute inset-x-5 bottom-6 z-10 flex items-end justify-between gap-5">
              <span className="line-clamp-2 block min-w-0 text-[32px] font-bold leading-none tracking-[-0.05em] text-white [text-shadow:0_3px_20px_rgba(0,0,0,0.75)]">{featuredTrailer.show.title}</span>
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-black/45 text-white shadow-[0_8px_28px_rgba(0,0,0,0.42)] ring-1 ring-white/35 backdrop-blur-sm transition-transform group-active:scale-90"
                aria-hidden="true"
              >
                <Play size={23} fill="currentColor" className="translate-x-0.5" />
              </span>
            </span>
          </button>
        </section>
      )}

      {relevantSchedule.length > 0 ? (
        <section className="mb-11">
          <div className="mb-3 px-4">
            <h3 className="text-[21px] font-semibold tracking-[-0.025em] text-white/90">Episodes from your shows</h3>
          </div>
          <div className="border-y border-white/[0.07] px-4">
            {relevantSchedule.map(({ day, entry }) => (
              <EpisodeAgendaRow key={`${day.date}:${entry.show.id}`} entry={entry} date={day.date} onClick={() => setSelectedDay(day)} />
            ))}
            <button onClick={() => setSelectedDay(today)} className="flex min-h-12 w-full items-center justify-between py-3 text-left text-[14px] font-medium text-white/60 active:opacity-60">
              <span>Today’s full schedule</span>
              <ChevronRight size={17} />
            </button>
          </div>
        </section>
      ) : (
        <section className="mb-11 border-y border-white/[0.07] px-4">
          <button onClick={() => setSelectedDay(today)} className="flex min-h-[76px] w-full items-center gap-3 py-3.5 text-left active:opacity-60">
            <CalendarDays size={20} className="shrink-0 text-white/55" />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold tracking-[-0.02em] text-white/90">Animation calendar</span>
              <span className="mt-1 block text-[14px] text-white/40">{today.entries.length} episode{today.entries.length === 1 ? '' : 's'} airing today</span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-white/25" />
          </button>
        </section>
      )}

      {pulse.partial && (
        <button onClick={onRetry} className="mx-4 mb-10 text-left text-[12px] font-medium text-white/35 underline decoration-white/15 underline-offset-4">
          Some listings may be missing. Refresh
        </button>
      )}

      <ScheduleDaySheet
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        onOpenShow={(show) => {
          setSelectedDay(null)
          onOpenShow(show)
        }}
      />
    </div>
  )
}

function EpisodeAgendaRow({
  entry,
  date,
  onClick,
}: {
  entry: AnimationScheduleDay['entries'][number]
  date?: string
  onClick: () => void
}) {
  const name = episodeName(entry.episode)
  return (
    <button onClick={onClick} className="flex min-h-[76px] w-full items-center gap-3 border-b border-white/[0.06] py-3.5 text-left active:opacity-60">
      {date && (
        <span className="w-12 shrink-0 text-center">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-white/50">{scheduleDate(date, { weekday: 'short' })}</span>
          <span className="mt-0.5 block text-[17px] font-semibold tabular-nums text-white/75">{scheduleDate(date, { day: 'numeric' })}</span>
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 block text-[17px] font-semibold tracking-[-0.02em] text-white/90">{entry.show.title}</span>
        {entry.episode ? (
          <span className="mt-1 line-clamp-1 block text-[15px] leading-snug text-white/55">
            <span className="font-medium text-white/70">{episodeCode(entry.episode)}</span>
            {name && <span> · {name}</span>}
          </span>
        ) : <span className="mt-1 block text-[14px] text-white/35">Episode details pending</span>}
      </span>
      <ChevronRight size={17} className="shrink-0 text-white/25" />
    </button>
  )
}

function ScheduleDaySheet({
  day,
  onClose,
  onOpenShow,
}: {
  day: AnimationScheduleDay | null
  onClose: () => void
  onOpenShow: (show: Show) => void
}) {
  const [enrichedDay, setEnrichedDay] = useState<AnimationScheduleDay | null>(day)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!day) {
      setEnrichedDay(null)
      return
    }
    let active = true
    setEnrichedDay(day)
    setLoading(true)
    void getAnimationScheduleDayEpisodes(day)
      .then((result) => { if (active) setEnrichedDay(result) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [day])

  useEffect(() => {
    if (!day) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [day, onClose])

  return createPortal(
    <AnimatePresence>
      {day && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/66 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Animation schedule for ${scheduleDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' })}`}
          onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
        >
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }} className="max-h-[78svh] w-full max-w-md overflow-hidden rounded-t-[28px] border-t border-white/[0.1] bg-[#0b0c0e] shadow-[0_-24px_80px_rgba(0,0,0,.55)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 pb-4 pt-5">
              <div>
                <p className="text-[13px] font-medium text-white/45">Episode schedule</p>
                <h3 className="mt-1 text-[21px] font-bold tracking-[-0.035em] text-white/90">{scheduleDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              </div>
              <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/55" aria-label="Close schedule"><X size={17} /></button>
            </div>
            <div className="max-h-[calc(78svh-88px)] overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 no-scrollbar">
              {loading && <p className="py-3 text-[13px] font-medium text-white/35">Loading episode details…</p>}
              {(enrichedDay ?? day).entries.map((entry) => {
                const artwork = entry.episode?.still_path ?? entry.show.backdropPath ?? entry.show.posterPath
                return (
                  <button key={entry.show.id} onClick={() => onOpenShow(lootToShow(entry.show))} className="flex min-h-[104px] w-full items-start gap-3 border-b border-white/[0.06] py-3.5 text-left active:opacity-60">
                    {artwork && (
                      <span className="mt-0.5 h-[76px] w-[112px] shrink-0 overflow-hidden rounded-[14px] bg-white/[0.04]">
                        <img src={imgUrl(artwork, 'w342')} alt="" className="h-full w-full object-cover" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 block text-[17px] font-semibold tracking-[-0.02em] text-white/90">{entry.show.title}</span>
                      {entry.episode ? (
                        <>
                          <span className="mt-1 block text-[14px] font-medium text-white/70">{episodeCode(entry.episode)}{episodeName(entry.episode) ? ` · ${episodeName(entry.episode)}` : ''}</span>
                          {entry.episode.overview && <span className="mt-1.5 line-clamp-2 block text-[14px] leading-[1.45] text-white/50">{entry.episode.overview}</span>}
                        </>
                      ) : <span className="mt-2 block text-[14px] text-white/40">Episode details have not been published yet.</span>}
                    </span>
                    <ChevronRight size={17} className="mt-1 shrink-0 text-white/25" />
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function TodayPulseSkeleton() {
  return (
    <div className="mb-10 animate-pulse px-4">
      <div className="h-6 w-32 rounded bg-white/[0.07]" />
      <div className="mt-4 aspect-[16/11] w-[88vw] max-w-[380px] rounded-[28px] bg-white/[0.055]" />
    </div>
  )
}

function TodayTrailerFeed({
  trailer,
  trailers,
  onClose,
}: {
  trailer: AnimationTrailerFeature | null
  trailers: AnimationTrailerFeature[]
  onClose: () => void
}) {
  const feedRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [feedTrailers, setFeedTrailers] = useState<AnimationTrailerFeature[]>(() => trailers)
  const [feedCursor, setFeedCursor] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)
  const orderedTrailers = useMemo(() => {
    if (!trailer) return []
    return [trailer, ...feedTrailers.filter((candidate) => candidate.video.key !== trailer.video.key)]
  }, [feedTrailers, trailer])

  useEffect(() => {
    if (!trailer) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, trailer])

  const loadMoreTrailers = useCallback(async () => {
    if (!trailer || loadingMore) return
    setLoadingMore(true)
    setLoadMoreFailed(false)
    const excludedKeys = orderedTrailers.map((item) => item.video.key)
    let nextCursor = feedCursor
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const additions = await getAnimationTrailerFeedBatch(nextCursor, excludedKeys)
        nextCursor += 1
        if (!additions.length) continue
        setFeedTrailers((current) => uniqueTrailerFeatures([...current, ...additions]))
        setFeedCursor(nextCursor)
        return
      }
      setFeedCursor(nextCursor)
      setLoadMoreFailed(true)
    } catch {
      setFeedCursor(nextCursor + 1)
      setLoadMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }, [feedCursor, loadingMore, orderedTrailers, trailer])

  useEffect(() => {
    if (!trailer || !feedRef.current) return
    const root = feedRef.current
    const slides = [...root.querySelectorAll<HTMLElement>('[data-trailer-slide]')]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = Number((visible.target as HTMLElement).dataset.trailerSlide)
        if (!Number.isFinite(index)) return
        setActiveIndex(index)
        if (!loadMoreFailed && !loadingMore && index >= orderedTrailers.length - 3) {
          void loadMoreTrailers()
        }
      },
      { root, threshold: [0.6, 0.82] },
    )
    slides.forEach((slide) => observer.observe(slide))
    return () => observer.disconnect()
  }, [loadMoreFailed, loadMoreTrailers, loadingMore, orderedTrailers.length, trailer])

  return (
    <AnimatePresence>
      {trailer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Trailer feed"
        >
          <button
            onClick={onClose}
            className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-[100] grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/45 text-white shadow-xl backdrop-blur-md active:scale-95"
            aria-label="Close trailer feed"
          >
            <X size={19} />
          </button>
          <div ref={feedRef} className="h-[100svh] snap-y snap-mandatory overflow-y-auto overscroll-contain no-scrollbar">
            {orderedTrailers.map((item, index) => (
              <section
                key={`${item.show.mediaType}:${item.show.id}:${item.video.key}`}
                data-trailer-slide={index}
                className="relative h-[100svh] snap-start snap-always overflow-hidden bg-black"
              >
                <img
                  src={`https://i.ytimg.com/vi/${item.video.key}/maxresdefault.jpg`}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-35 blur-2xl"
                />
                <span className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/18 to-black/90" />
                <div className="absolute left-1/2 top-1/2 aspect-video w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-black shadow-[0_22px_90px_rgba(0,0,0,0.7)]">
                  {activeIndex === index ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${item.video.key}?autoplay=1&rel=0&playsinline=1`}
                      title={item.video.name}
                      className="h-full w-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <img src={`https://i.ytimg.com/vi/${item.video.key}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-72" loading="lazy" />
                  )}
                </div>
                <span className="absolute right-5 top-[max(1.5rem,env(safe-area-inset-top))] text-[12px] font-medium tabular-nums text-white/60">
                  {index + 1}
                </span>
                <div className="absolute inset-x-5 bottom-[max(1.75rem,env(safe-area-inset-bottom))]">
                  <h3 className="text-[30px] font-bold leading-none tracking-[-0.05em] text-white">{item.show.title}</h3>
                  <p className="mt-2 text-[14px] font-medium text-white/60">{item.video.type}</p>
                  {index === orderedTrailers.length - 1 && loadingMore && (
                    <p className="mt-3 text-[12px] font-medium text-white/40">Loading the next clips…</p>
                  )}
                  {index === orderedTrailers.length - 1 && loadMoreFailed && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoadMoreFailed(false)
                        void loadMoreTrailers()
                      }}
                      className="mt-4 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-black active:scale-95"
                    >
                      Keep watching
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ChapterHeader({ title }: { title: string }) {
  return (
    <div className="mb-7 px-4 pt-5">
      <h2 className="text-[30px] font-semibold leading-none tracking-[-0.055em] text-white">{title}</h2>
    </div>
  )
}

type RankedListKey = 'all-time' | 'new-season' | 'films' | 'airing' | 'grown-up'

function rankedByRating(shows: LootShow[]) {
  return uniqueShows(shows)
    .filter((show) => show.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.popularity - a.popularity)
}

function RankedLists({
  feed,
  pulse,
  onOpenCategory,
  onOpenShow,
}: {
  feed: DiscoverFeed
  pulse: AnimationTodayPulse | null
  onOpenCategory: (key: DiscoverCategoryKey, title: string) => void
  onOpenShow: (show: Show) => void
}) {
  const [activeKey, setActiveKey] = useState<RankedListKey>('all-time')
  const lists = useMemo(() => ([
    { key: 'all-time' as const, label: 'All time', title: 'Top rated, all time', category: 'topRated' as const, shows: rankedByRating(feed.topRated) },
    { key: 'new-season' as const, label: 'New season', title: 'Best of the new season', category: 'newAnime' as const, shows: rankedByRating([...feed.newAnime, ...feed.newWestern]) },
    { key: 'films' as const, label: 'Films', title: 'Top animated films', category: 'animatedFilms' as const, shows: rankedByRating(feed.animatedFilms) },
    { key: 'airing' as const, label: 'Airing now', title: 'Top shows airing now', shows: rankedByRating(pulse?.trending ?? []) },
    { key: 'grown-up' as const, label: 'Grown-up', title: 'Top animation for grown-ups', category: 'adultAnimation' as const, shows: rankedByRating(feed.adultAnimation) },
  ]).filter((list) => list.shows.length), [feed, pulse])
  const activeList = lists.find((list) => list.key === activeKey) ?? lists[0]

  if (!activeList) return null
  return (
    <section className="mb-11 px-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[20px] font-semibold tracking-[-0.035em] text-white/95">Ranked lists</h3>
        {'category' in activeList && activeList.category && (
          <button
            onClick={() => onOpenCategory(activeList.category, activeList.title)}
            className="grid h-10 w-10 place-items-center rounded-full text-white/35 hover:text-white"
            aria-label={`Open ${activeList.title}`}
          >
            <ChevronRight size={19} />
          </button>
        )}
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="tablist" aria-label="Ranked animation lists">
        {lists.map((list) => {
          const active = list.key === activeList.key
          return (
            <button
              key={list.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveKey(list.key)}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-[12px] font-semibold transition-colors',
                active ? 'bg-white text-black' : 'bg-white/[0.055] text-white/48 hover:text-white/75',
              )}
            >
              {list.label}
            </button>
          )
        })}
      </div>
      <div className="overflow-hidden rounded-[22px] border border-white/[0.075] bg-gradient-to-br from-white/[0.045] to-white/[0.015]">
        {activeList.shows.slice(0, 5).map((show, index) => (
          <button
            key={`${activeList.key}:${show.id}`}
            onClick={() => onOpenShow(lootToShow(show))}
            className={cn(
              'flex min-h-[78px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.045] active:bg-white/[0.07]',
              index > 0 && 'border-t border-white/[0.06]',
            )}
          >
            <span
              aria-hidden
              className="w-8 shrink-0 text-center text-[30px] italic leading-none tracking-[-0.08em] text-transparent"
              style={{
                fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
                WebkitTextStroke: '1.5px rgba(222,250,255,.9)',
                textShadow: '0 0 9px rgba(57,216,255,.55), 2px 2px 0 rgba(16,17,55,.7)',
              }}
            >
              {index + 1}
            </span>
            <span className="h-14 w-10 shrink-0 overflow-hidden rounded-[8px] bg-white/[0.05] ring-1 ring-white/[0.07]">
              {show.posterPath && <img src={imgUrl(show.posterPath, 'w185')} alt="" className="h-full w-full object-cover" loading="lazy" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-[15px] font-bold leading-[1.15] text-white/90">{show.title}</span>
              <span className="mt-1 block truncate text-[11px] font-medium text-white/40">{show.cardDescriptor?.label ?? show.genre}</span>
            </span>
            <ImdbBadge showId={show.id} compact className="shrink-0 shadow-none" />
          </button>
        ))}
      </div>
    </section>
  )
}

function TastePacketRow({
  packet,
  ownedIds,
  watchlistIds,
  onOpenShow,
}: {
  packet: TastePacket
  ownedIds: number[]
  watchlistIds: Set<number>
  onOpenShow: (show: Show, context?: RecommendationContext) => void
}) {
  const anchorGenres = new Set([...(packet.anchor.genres ?? []), ...(packet.anchor.rawGenres ?? [])])

  return (
    <section className="mb-9">
      <div className="mb-4 px-4">
        <h3 className="min-w-0 line-clamp-2 text-[20px] font-semibold leading-[1.16] tracking-[-0.035em] text-white/95">
          Because you love {packet.anchor.name}
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 px-4">
        {packet.shows.map((show) => (
          <LandscapeCard
            key={show.id}
            show={show}
            isOwned={ownedIds.includes(show.id)}
            isWatchlisted={watchlistIds.has(show.id)}
            onOpenShow={(selected) => onOpenShow(selected, {
              anchorName: packet.anchor.name,
              anchorTier: packet.tier,
              sharedGenre: anchorGenres.has(show.genre as Genre) ? show.genre : undefined,
            })}
          />
        ))}
      </div>
    </section>
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
                  isLandscape ? 'h-[286px] w-[88vw] min-w-[336px] max-w-[380px]' : 'h-[458px] w-[64vw] min-w-[226px] max-w-[252px]',
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
  subtitle,
  categoryKey,
  shows,
  ownedIds,
  watchlistIds,
  landscape = false,
  browseable = true,
  onOpenCategory,
  onOpenShow,
}: {
  title: string
  subtitle?: string
  categoryKey: DiscoverCategoryKey
  shows: LootShow[]
  ownedIds: number[]
  watchlistIds: Set<number>
  landscape?: boolean
  browseable?: boolean
  onOpenCategory: (key: DiscoverCategoryKey, title: string) => void
  onOpenShow: (show: Show) => void
}) {
  if (shows.length === 0) return null
  return (
    <section className="mb-11">
      <div className="mb-4 flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <h3 className="text-[20px] font-semibold tracking-[-0.035em] text-white/95">{title}</h3>
          {subtitle && <p className="mt-1 max-w-[19rem] text-[13px] leading-snug text-white/45">{subtitle}</p>}
        </div>
        {browseable && (
          <button
            onClick={() => onOpenCategory(categoryKey, title)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/35 transition-colors hover:text-white"
            aria-label={`Open ${title}`}
          >
            <ChevronRight size={19} />
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 pb-3 px-4">
        {shows.map((show) =>
          landscape ? (
            <LandscapeCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} isWatchlisted={watchlistIds.has(show.id)} onOpenShow={onOpenShow} />
          ) : (
            <PortraitCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} isWatchlisted={watchlistIds.has(show.id)} variant="carousel" onOpenShow={onOpenShow} />
          ),
        )}
      </div>
    </section>
  )
}

async function persistShow(show: LootShow) {
  await upsertShow(lootToShow(show))
}

async function persistToDefaultWatchlist(show: LootShow) {
  const shelves = await ensureDefaultWatchlistShelves()
  const defaultShelf = shelves.find((shelf) => shelf.name === 'Watch next') ?? shelves[0]
  if (!defaultShelf) throw new Error('No watchlist shelf is available')
  await addToWatchlistShelf(defaultShelf.id, lootToShow(show))
}

function lootToShow(show: LootShow): Show {
  const yr = show.year && show.year !== '—' ? Number(show.year) : undefined
  return {
    id: show.id,
    name: show.title,
    year: yr,
    posterPath: show.posterPath,
    backdropPath: show.backdropPath,
    overview: show.overview,
    genres: show.rawGenres as Genre[],
    rawGenres: show.rawGenres,
    mediaType: show.mediaType,
    tradition: show.tradition,
    vibeIds: show.vibeIds,
    vibeEvidence: show.vibeEvidence,
    cardDescriptor: show.cardDescriptor,
    addedAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function DiscoveryReason({ show }: { show: LootShow }) {
  void show
  return null
}

function TaxonomyLabel({
  show,
  descriptor = show.cardDescriptor,
}: {
  show: LootShow
  descriptor?: CardDescriptor
}) {
  const label = descriptor?.label
  if (!label) return null
  return (
    <span className="mb-2 block max-w-full text-[11px] font-medium leading-tight tracking-[0.035em] text-white/50">
      <span className="block truncate">{label}</span>
    </span>
  )
}

// Diagonal shine sweep — the "loot card claimed" pattern from trading card games.
// A white gradient bar sweeps left-to-right once across the card on success.
function ShineOverlay() {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) return <div className="absolute inset-0 z-20 pointer-events-none bg-white/10" />
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
const landscapeArtCache = new Map<string, LandscapeArt>()
const landscapeArtInflight = new Map<string, Promise<LandscapeArt>>()

function bestLogo(items: TmdbLogoAsset[] = []) {
  return [...items]
    .filter((item) => item.iso_639_1 === 'en' || item.iso_639_1 === null)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]?.file_path ?? null
}

async function getLandscapeArt(showId: number, mediaType: 'tv' | 'movie' = 'tv'): Promise<LandscapeArt> {
  const cacheId = `${mediaType}:${showId}`
  const cached = landscapeArtCache.get(cacheId)
  if (cached) return cached

  const existing = landscapeArtInflight.get(cacheId)
  if (existing) return existing

  const request = (async () => {
    const key = getTmdbKey()
    const url = new URL(`${TMDB_API_BASE}/${mediaType}/${showId}`)
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
    landscapeArtCache.set(cacheId, art)
    return art
  })()

  landscapeArtInflight.set(cacheId, request)
  try {
    return await request
  } finally {
    landscapeArtInflight.delete(cacheId)
  }
}

function landscapeDescription(show: LootShow, tagline?: string) {
  const copy = tagline?.trim() || show.overview.trim()
  if (copy) return copy
  const genre = show.genre && show.genre !== 'Animation' ? show.genre.toLowerCase() : 'animated'
  return `A ${genre} story picked for your animation feed.`
}

function PortraitCard({
  show,
  isOwned,
  isWatchlisted,
  onOpenShow,
  variant = 'grid',
}: {
  show: LootShow
  isOwned: boolean
  isWatchlisted: boolean
  onOpenShow: (show: Show) => void
  variant?: 'grid' | 'carousel'
}) {
  const [shine, setShine] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const cardControls = useAnimation()
  const posterUrl = show.posterPath ? imgUrl(show.posterPath, 'w342') : ''
  const descriptor = useEnrichedCardDescriptor(show, isVisible)

  useEffect(() => {
    const node = cardRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setIsVisible(true)
      observer.disconnect()
    }, { rootMargin: '200px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const handleAdd = async () => {
    await persistShow(show)
  }

  const handleWatchlist = async () => {
    await persistToDefaultWatchlist(show)
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
      ref={cardRef}
      animate={cardControls}
      onClick={() => onOpenShow(lootToShow(show))}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenShow(lootToShow(show))
      }}
      className={cn(
        'relative min-w-0 cursor-pointer overflow-hidden rounded-[28px] bg-[#111416] shadow-[0_18px_44px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.1] transition-transform duration-300 active:scale-[0.98]',
        variant === 'carousel' ? 'w-[64vw] min-w-[226px] max-w-[252px] flex-shrink-0 snap-start' : 'w-full',
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#151117]">
        <CollectibleMediaCard
          id={show.id}
          title={show.title}
          imagePath={show.posterPath}
          motionKey={pickAnimationKey(show.rawGenres, show.tradition, show.vibeIds)}
          artScrim={false}
          addSlot={(
            <FeedSaveActions
              isSeen={isOwned}
              isWatchlisted={isWatchlisted}
              onSeen={handleAdd}
              onWatchlist={handleWatchlist}
              onSuccess={handleSuccess}
              size="sm"
            />
          )}
          shineSlot={<AnimatePresence>{shine && <ShineOverlay key="shine" />}</AnimatePresence>}
          className="rounded-none shadow-none"
        >
          <span />
        </CollectibleMediaCard>
      </div>
      <ColorAwareRail imageSrc={posterUrl} className="relative z-20 min-h-[96px] px-4 py-3">
        <TaxonomyLabel show={show} descriptor={descriptor} />
        <h3 className="truncate text-[16px] font-bold leading-tight tracking-[-0.025em] text-white">{show.title}</h3>
        <div className="mt-2 flex min-h-6 items-center gap-2.5">
          {show.year !== '—' && <span className="text-[10px] font-black tracking-[0.04em] text-white/75">{show.year}</span>}
          <ImdbBadge showId={show.id} compact className="shadow-none" />
        </div>
      </ColorAwareRail>
      <DiscoveryReason show={show} />
    </motion.div>
  )
}

function LandscapeCard({
  show,
  rank,
  isOwned,
  isWatchlisted,
  onOpenShow,
}: {
  show: LootShow
  rank?: number
  isOwned: boolean
  isWatchlisted: boolean
  onOpenShow: (show: Show) => void
}) {
  const [shine, setShine] = useState(false)
  const [art, setArt] = useState<LandscapeArt | null>(() => landscapeArtCache.get(`${show.mediaType}:${show.id}`) ?? null)
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const cardControls = useAnimation()
  const descriptor = useEnrichedCardDescriptor(show, isVisible)

  const handleAdd = async () => {
    await persistShow(show)
  }

  const handleWatchlist = async () => {
    await persistToDefaultWatchlist(show)
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
    getLandscapeArt(show.id, show.mediaType)
      .then((next) => {
        if (!cancelled) setArt(next)
      })
      .catch(() => {
        if (!cancelled) setArt({ logoPath: null, tagline: '' })
      })
    return () => {
      cancelled = true
    }
  }, [art, isVisible, show.id, show.mediaType])

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
      className="relative group w-[88vw] min-w-[336px] max-w-[380px] flex-shrink-0 snap-start cursor-pointer overflow-visible transition-transform duration-300 active:scale-[0.98]"
    >
      {rank && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute z-40 select-none italic leading-[0.72] tracking-[-0.09em] text-transparent',
            rank >= 10 ? '-left-5 top-[54px] text-[112px]' : '-left-7 top-[58px] text-[148px]',
          )}
          style={{
            fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
            WebkitTextStroke: '3px #e8fbff',
            textShadow: '0 0 2px #fff, 0 0 9px #39d8ff, 0 0 24px rgba(30,172,255,.95), 7px 7px 0 rgba(16,17,55,.76)',
            transform: 'rotate(-6deg)',
          }}
        >
          {rank}
        </span>
      )}
      <div className="relative overflow-hidden rounded-[30px] bg-[#151117] shadow-[0_22px_58px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.09]">
        <div className="relative aspect-[16/9] overflow-hidden bg-[#151117]">
          <CollectibleMediaCard
            id={show.id}
            title={show.title}
            imageUrl={bg}
            motionKey={pickAnimationKey(show.rawGenres, show.tradition, show.vibeIds)}
            landscape
            artScrim={false}
            addSlot={(
              <FeedSaveActions
                isSeen={isOwned}
                isWatchlisted={isWatchlisted}
                onSeen={handleAdd}
                onWatchlist={handleWatchlist}
                onSuccess={handleSuccess}
                size="sm"
              />
            )}
            shineSlot={<AnimatePresence>{shine && <ShineOverlay key="shine" />}</AnimatePresence>}
            className="rounded-none shadow-none"
          >
            <span />
          </CollectibleMediaCard>
        </div>
        <ColorAwareRail imageSrc={bg} className="relative z-20 min-h-[126px] px-4 py-4">
          <TaxonomyLabel show={show} descriptor={descriptor} />
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-[20px] font-semibold leading-tight tracking-[-0.04em] text-white">{show.title}</h3>
            <ImdbBadge showId={show.id} compact className="shrink-0 shadow-none" />
          </div>
          <p className="mt-2 line-clamp-2 max-w-[320px] text-[15px] font-normal leading-[1.42] text-white/75">
            {landscapeDescription(show, art?.tagline)}
          </p>
        </ColorAwareRail>
        <DiscoveryReason show={show} />
      </div>
    </motion.div>
  )
}
