import {
  getMovieCollection,
  getShowDetail,
  getShowRecommendations,
  getSimilarShows,
  tmdbToLoot,
  type LootShow,
} from '../../lib/tmdb'
import type { Show } from '../../types'

export const ONBOARDING_FOLLOWUP_STORAGE_KEY = 'loot:onboarding-followup:v1'
export const ONBOARDING_FOLLOWUP_EVENT = 'loot:onboarding-followup'

const FOLLOWUP_LIFETIME_MS = 7 * 24 * 60 * 60_000
const GENERIC_TITLE_WORDS = new Set([
  'a', 'across', 'an', 'and', 'beyond', 'chapter', 'film', 'into', 'movie', 'of', 'part', 'season', 'series', 'the',
])

export type OnboardingFollowupState = {
  anchorIds: number[]
  createdAt: number
  dismissedAt?: number
}

export type RelatedTitleGroup = {
  anchorId: number
  kind: 'collection' | 'recommendation' | 'similar'
  shows: LootShow[]
}

type ScoredCandidate = {
  show: LootShow
  score: number
  anchorIds: Set<number>
}

const RELATED_CACHE_MS = 24 * 60 * 60_000
const relatedAnchorCache = new Map<string, { groups: RelatedTitleGroup[]; at: number }>()
const relatedAnchorInflight = new Map<string, Promise<RelatedTitleGroup[]>>()

export function beginOnboardingFollowup(anchorIds: number[], at = Date.now()) {
  const state: OnboardingFollowupState = {
    anchorIds: [...new Set(anchorIds.filter(Boolean))],
    createdAt: at,
  }
  try {
    localStorage.setItem(ONBOARDING_FOLLOWUP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The feed can continue without persistent onboarding follow-up state.
  }
  window.dispatchEvent(new CustomEvent(ONBOARDING_FOLLOWUP_EVENT))
  return state
}

export function readOnboardingFollowup(at = Date.now()): OnboardingFollowupState | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_FOLLOWUP_STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as OnboardingFollowupState
    if (!Array.isArray(state.anchorIds) || !state.anchorIds.length || !Number.isFinite(state.createdAt)) return null
    if (state.dismissedAt || at - state.createdAt > FOLLOWUP_LIFETIME_MS) return null
    return state
  } catch {
    return null
  }
}

export function dismissOnboardingFollowup(at = Date.now()) {
  try {
    const raw = localStorage.getItem(ONBOARDING_FOLLOWUP_STORAGE_KEY)
    if (!raw) return
    const state = JSON.parse(raw) as OnboardingFollowupState
    localStorage.setItem(ONBOARDING_FOLLOWUP_STORAGE_KEY, JSON.stringify({ ...state, dismissedAt: at }))
  } catch {
    // Dismissal remains effective for the current render even without storage.
  }
}

function titleTokens(title: string) {
  return new Set(
    title
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(' ')
      .map((word) => word.trim())
      .filter((word) => word.length > 2 && !/^\d+$/.test(word) && !GENERIC_TITLE_WORDS.has(word)),
  )
}

function hasTitleContinuity(anchor: Show, candidate: LootShow) {
  const anchorTokens = titleTokens(anchor.name)
  return [...titleTokens(candidate.title)].some((token) => anchorTokens.has(token))
}

async function loadAnchorRelationships(anchor: Show) {
  const mediaType = anchor.mediaType ?? 'tv'
  const cacheKey = `${mediaType}:${anchor.id}`
  const cached = relatedAnchorCache.get(cacheKey)
  if (cached && Date.now() - cached.at < RELATED_CACHE_MS) return cached.groups
  const inflight = relatedAnchorInflight.get(cacheKey)
  if (inflight) return inflight

  const request = Promise.all([
    mediaType === 'movie'
      ? getShowDetail(anchor.id, 'movie')
          .then((detail) => detail.belongs_to_collection?.id ? getMovieCollection(detail.belongs_to_collection.id) : null)
          .then((data) => data?.results.map(tmdbToLoot) ?? [])
          .catch(() => [] as LootShow[])
      : Promise.resolve([] as LootShow[]),
    getShowRecommendations(anchor.id, 1, mediaType)
      .then((data) => data.results.map(tmdbToLoot))
      .catch(() => [] as LootShow[]),
    getSimilarShows(anchor.id, 1, mediaType)
      .then((data) => data.results.map(tmdbToLoot))
      .catch(() => [] as LootShow[]),
  ]).then(([collection, recommendations, similar]) => {
    const groups: RelatedTitleGroup[] = [
      { anchorId: anchor.id, kind: 'collection', shows: collection },
      { anchorId: anchor.id, kind: 'recommendation', shows: recommendations },
      { anchorId: anchor.id, kind: 'similar', shows: similar },
    ]
    relatedAnchorCache.set(cacheKey, { groups, at: Date.now() })
    return groups
  })

  relatedAnchorInflight.set(cacheKey, request)
  try {
    return await request
  } finally {
    relatedAnchorInflight.delete(cacheKey)
  }
}

export async function loadOnboardingRelatedTitleGroups(anchors: Show[]) {
  const groups = await Promise.all(anchors.map(loadAnchorRelationships))
  return groups.flat()
}

/**
 * Turns TMDB relationship groups into a compact onboarding follow-up rail.
 * Explicit collection membership is guaranteed representation before softer
 * recommendation and similarity signals can fill the remaining slots.
 */
export function rankOnboardingFollowupCandidates(
  groups: RelatedTitleGroup[],
  anchors: Show[],
  ownedIds: Set<number>,
  limit = 24,
) {
  const anchorsById = new Map(anchors.map((anchor) => [anchor.id, anchor]))
  const candidates = new Map<number, ScoredCandidate>()
  const usable = (show: LootShow, anchorId: number) => (
    !ownedIds.has(show.id)
    && show.id !== anchorId
    && (!show.releaseDate || show.releaseDate <= new Date().toISOString().slice(0, 10))
    && Boolean(show.posterPath || show.backdropPath)
  )
  const signalWeight: Record<RelatedTitleGroup['kind'], number> = {
    collection: 280,
    recommendation: 92,
    similar: 54,
  }

  for (const group of groups) {
    const anchor = anchorsById.get(group.anchorId)
    if (!anchor) continue
    group.shows.forEach((show, index) => {
      if (!usable(show, anchor.id)) return
      const existing = candidates.get(show.id) ?? { show, score: 0, anchorIds: new Set<number>() }
      existing.anchorIds.add(anchor.id)
      existing.score += Math.max(12, signalWeight[group.kind] - index * (group.kind === 'collection' ? 8 : 4))
      if (hasTitleContinuity(anchor, show)) existing.score += 28
      existing.score += Math.min(10, show.rating) * 1.2
      existing.score += Math.min(8, Math.log10(Math.max(1, show.popularity)) * 2)
      candidates.set(show.id, existing)
    })
  }

  const ranked = [...candidates.values()]
    .map((candidate) => ({
      ...candidate,
      score: candidate.score + Math.max(0, candidate.anchorIds.size - 1) * 22,
    }))
    .sort((a, b) => b.score - a.score || b.show.popularity - a.show.popularity)

  const selected: LootShow[] = []
  const selectedIds = new Set<number>()
  const perAnchor = new Map<number, number>()

  const addForAnchor = (show: LootShow | undefined, anchorId: number) => {
    if (!show || selectedIds.has(show.id)) return
    selected.push(show)
    selectedIds.add(show.id)
    perAnchor.set(anchorId, (perAnchor.get(anchorId) ?? 0) + 1)
  }

  // First pass: one explicit franchise title for every anchor that has one.
  for (const anchor of anchors) {
    const direct = groups
      .filter((group) => group.anchorId === anchor.id && group.kind === 'collection')
      .flatMap((group) => group.shows)
      .find((show) => usable(show, anchor.id) && !selectedIds.has(show.id))
    addForAnchor(direct, anchor.id)
    if (selected.length >= limit) return selected
  }

  // Some TMDB titles are not assigned to a collection yet. Reserve a fallback
  // for those anchors, preferring sequel-like title continuity when available.
  for (const anchor of anchors) {
    if ((perAnchor.get(anchor.id) ?? 0) > 0) continue
    const related = groups
      .filter((group) => group.anchorId === anchor.id && group.kind !== 'collection')
      .flatMap((group) => group.shows)
      .filter((show, index, list) => usable(show, anchor.id) && !selectedIds.has(show.id) && list.findIndex((candidate) => candidate.id === show.id) === index)
    const fallback = related.find((show) => hasTitleContinuity(anchor, show)) ?? related[0]
    addForAnchor(fallback, anchor.id)
    if (selected.length >= limit) return selected
  }

  // Second franchise pass fills remaining space with additional sequels.
  for (const anchor of anchors) {
    const direct = groups
      .filter((group) => group.anchorId === anchor.id && group.kind === 'collection')
      .flatMap((group) => group.shows)
      .find((show) => usable(show, anchor.id) && !selectedIds.has(show.id))
    addForAnchor(direct, anchor.id)
    if (selected.length >= limit) return selected
  }

  for (const candidate of ranked) {
    if (selectedIds.has(candidate.show.id)) continue
    const availableAnchor = [...candidate.anchorIds]
      .sort((a, b) => (perAnchor.get(a) ?? 0) - (perAnchor.get(b) ?? 0))
      .find((anchorId) => (perAnchor.get(anchorId) ?? 0) < 3)
    if (availableAnchor === undefined) continue
    selected.push(candidate.show)
    selectedIds.add(candidate.show.id)
    perAnchor.set(availableAnchor, (perAnchor.get(availableAnchor) ?? 0) + 1)
    if (selected.length >= limit) return selected
  }

  for (const candidate of ranked) {
    if (selectedIds.has(candidate.show.id)) continue
    selected.push(candidate.show)
    if (selected.length >= limit) break
  }
  return selected
}
