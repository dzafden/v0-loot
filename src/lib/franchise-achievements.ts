import type { DismissedCollection, EarnedFranchiseAchievement, FranchiseDefinition, FranchiseMember, Show } from '../types'
import type { TmdbMovieCollection } from './tmdb'

export type FranchiseAchievement = FranchiseDefinition

/**
 * A set of two completes the instant you watch both. If hundreds of pairs can complete,
 * completion becomes an everyday event and stops meaning anything — rank value varies
 * inversely with the frequency of the event (Douglas & Isherwood). Three is the floor at
 * which a set reads as a body of work rather than a pair.
 */
export const MIN_COLLECTION_SIZE = 3

/** Studios only: proportion seen before a partial collection is worth surfacing. */
export const MIN_RATIO = 0.25
/** Studios only: always surface when this close to done, whatever the ratio. */
export const NEAR_DONE = 3

/**
 * 'franchise' — membership is self-evident. Nobody needs to be taught that Toy Story is a
 *               series, so one title is enough to surface it. Volume is controlled by the
 *               proximity sort and the rail cap, not by a threshold.
 * 'studio'    — the recognition *is* the payload. "Bob's Burgers is by Bento Box" is a fact;
 *               "Bob's Burgers, Hazbin Hotel and Grimsburg are all Bento Box" is a pattern.
 *               One title teaches nothing, so two is the floor.
 */
export type CollectionFamily = 'franchise' | 'studio'
export type CollectionFrequencyTreatment = 'everyday' | 'sunday' | 'heirloom'

export function franchiseMemberKey(member: Pick<FranchiseMember, 'id' | 'mediaType'>) {
  return `${member.mediaType ?? 'movie'}:${member.id}`
}

export function franchiseShowKey(show: Pick<Show, 'id' | 'mediaType'>) {
  return `${show.mediaType ?? 'tv'}:${show.id}`
}

export function ownedFranchiseKeys(shows: Array<Pick<Show, 'id' | 'mediaType'>>) {
  return new Set(shows.map(franchiseShowKey))
}

export function collectionFamily(definition: FranchiseDefinition): CollectionFamily {
  return definition.source === 'tmdb-studio' ? 'studio' : 'franchise'
}

/**
 * Whether a partially-watched collection should be surfaced at all.
 * Earned collections bypass this entirely — see `franchiseAchievementProgress`.
 */
export function isCollectionVisible(seen: number, total: number, family: CollectionFamily) {
  if (total < MIN_COLLECTION_SIZE) return false
  if (seen < 1) return false
  if (family === 'franchise') return true
  if (seen < 2) return false
  return seen / total >= MIN_RATIO || total - seen <= NEAR_DONE
}

/** Visual intensity follows how rarely a completion of this scope occurs, not a rarity label. */
export function collectionFrequencyTreatment(total: number): CollectionFrequencyTreatment {
  if (total <= 5) return 'everyday'
  if (total <= 15) return 'sunday'
  return 'heirloom'
}

export function shouldAutoRestoreDismissal(
  definition: FranchiseDefinition,
  ownedKeys: Set<string>,
  watchedCountAtDismissal: number,
) {
  const watchedCount = definition.members.filter((member) => ownedKeys.has(franchiseMemberKey(member))).length
  return watchedCount > watchedCountAtDismissal
    || (definition.members.length >= MIN_COLLECTION_SIZE && watchedCount === definition.members.length)
}

export interface FranchiseAchievementProgress {
  definition: FranchiseDefinition
  earnedAchievement?: EarnedFranchiseAchievement
  watchedKeys: string[]
  watchedCount: number
  totalCount: number
  remainingCount: number
  isComplete: boolean
  hasBeenEarned: boolean
  hasNewChapter: boolean
}

export function collectionProgressForDefinition(
  definition: FranchiseDefinition,
  earnedAchievement: EarnedFranchiseAchievement | undefined,
  ownedKeys: Set<string>,
): FranchiseAchievementProgress {
  const watchedKeys = definition.members
    .filter((member) => ownedKeys.has(franchiseMemberKey(member)))
    .map(franchiseMemberKey)
  const watchedCount = watchedKeys.length
  const totalCount = definition.members.length
  const hasBeenEarned = Boolean(earnedAchievement)
  const isComplete = totalCount >= MIN_COLLECTION_SIZE && watchedCount === totalCount
  const earnedMemberCount = earnedAchievement?.definition.members.length ?? 0
  return {
    definition,
    earnedAchievement,
    watchedKeys,
    watchedCount,
    totalCount,
    remainingCount: Math.max(0, totalCount - watchedCount),
    isComplete,
    hasBeenEarned,
    hasNewChapter: hasBeenEarned && totalCount > earnedMemberCount && !isComplete,
  }
}

export function buildFranchiseDefinition(
  collection: TmdbMovieCollection,
  at = Date.now(),
): FranchiseDefinition | null {
  const today = new Date(at).toISOString().slice(0, 10)
  const members = collection.results
    .filter((show) => Boolean(show.first_air_date) && show.first_air_date! <= today)
    .filter((show, index, shows) => shows.findIndex((candidate) => candidate.id === show.id) === index)
    .map((show) => ({
      id: show.id,
      name: show.name,
      posterPath: show.poster_path ?? null,
      backdropPath: show.backdrop_path ?? null,
      releaseDate: show.first_air_date!,
    }))
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))

  if (members.length < 2) return null
  return {
    id: collection.id,
    name: collection.name,
    posterPath: collection.posterPath,
    backdropPath: collection.backdropPath,
    memberIds: members.map((member) => member.id),
    members,
    source: 'tmdb-collection',
    scope: 'series',
    updatedAt: at,
  }
}

export function completedFranchiseAchievements(
  definitions: FranchiseDefinition[],
  ownedKeys: Set<string>,
): FranchiseAchievement[] {
  return definitions
    .filter((definition) => definition.members.length >= MIN_COLLECTION_SIZE)
    .filter((definition) => definition.members.every((member) => ownedKeys.has(franchiseMemberKey(member))))
    .map((definition) => ({ ...definition }))
    .sort((a, b) => b.memberIds.length - a.memberIds.length || a.name.localeCompare(b.name))
}

export function franchiseAchievementId(definitionId: number) {
  return `tmdb-collection:${definitionId}`
}

export function collectionAchievementId(definition: FranchiseDefinition) {
  return `${definition.source}:${definition.sourceKey ?? definition.sourceId ?? definition.id}`
}

export function dismissedCollectionId(definition: FranchiseDefinition) {
  return collectionAchievementId(definition)
}

export function franchiseCriteriaVersion(definition: FranchiseDefinition) {
  return `${collectionAchievementId(definition)}:${definition.members.map(franchiseMemberKey).sort().join(',')}`
}

export function rebindEarnedFranchiseAchievement(
  achievement: EarnedFranchiseAchievement,
  definition: FranchiseDefinition,
): EarnedFranchiseAchievement {
  const snapshot: FranchiseDefinition = {
    ...achievement.definition,
    id: definition.id,
    name: definition.name,
    posterPath: definition.posterPath ?? achievement.definition.posterPath ?? null,
    backdropPath: definition.backdropPath ?? achievement.definition.backdropPath ?? null,
    source: definition.source,
    sourceId: definition.sourceId,
    sourceKey: definition.sourceKey,
    scope: definition.scope,
  }
  return {
    ...achievement,
    id: collectionAchievementId(definition),
    definitionId: definition.id,
    criteriaVersion: franchiseCriteriaVersion(snapshot),
    definition: snapshot,
  }
}

export function rebindDismissedCollection(
  dismissed: DismissedCollection,
  definition: FranchiseDefinition,
): DismissedCollection {
  return {
    ...dismissed,
    id: dismissedCollectionId(definition),
    definitionId: definition.id,
    source: definition.source,
    name: definition.name,
  }
}

export function newlyEarnedFranchiseAchievements(
  definitions: FranchiseDefinition[],
  ownedKeys: Set<string>,
  existingIds: Set<string>,
  at = Date.now(),
): EarnedFranchiseAchievement[] {
  return completedFranchiseAchievements(definitions, ownedKeys)
    .filter((definition) => !existingIds.has(collectionAchievementId(definition)))
    .map((definition) => ({
      id: collectionAchievementId(definition),
      definitionId: definition.id,
      criteriaVersion: franchiseCriteriaVersion(definition),
      earnedAt: at,
      definition: structuredClone(definition),
    }))
}

export function franchiseAchievementProgress(
  definitions: FranchiseDefinition[],
  earnedAchievements: EarnedFranchiseAchievement[],
  ownedKeys: Set<string>,
  /**
   * Collections the user has explicitly dismissed ("not for me"). Hidden, never deleted:
   * tracking continues silently, a dismissed collection still earns if completed, and it
   * returns automatically once new progress arrives (handled by the caller re-including it).
   */
  dismissedIds: Set<number> = new Set(),
): FranchiseAchievementProgress[] {
  const liveById = new Map(definitions.map((definition) => [definition.id, definition]))
  const earnedByDefinitionId = new Map(
    earnedAchievements.map((achievement) => [achievement.definitionId, achievement]),
  )
  const definitionIds = new Set([
    ...definitions
      .filter((definition) => definition.members.some((member) => ownedKeys.has(franchiseMemberKey(member))))
      .map((definition) => definition.id),
    ...earnedAchievements.map((achievement) => achievement.definitionId),
  ])

  const progressItems: FranchiseAchievementProgress[] = []
  for (const definitionId of definitionIds) {
    const earnedAchievement = earnedByDefinitionId.get(definitionId)
    const definition = liveById.get(definitionId) ?? earnedAchievement?.definition
    if (!definition) continue
    const progress = collectionProgressForDefinition(definition, earnedAchievement, ownedKeys)

    // Earned collections are always visible. Everything else must clear the visibility rule,
    // and a dismissed collection stays hidden until it is earned.
    if (!progress.hasBeenEarned) {
      if (dismissedIds.has(definitionId)) continue
      if (!isCollectionVisible(progress.watchedCount, progress.totalCount, collectionFamily(definition))) continue
    }

    progressItems.push(progress)
  }

  return progressItems.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1
    if (a.hasNewChapter !== b.hasNewChapter) return a.hasNewChapter ? -1 : 1
    const ratioDifference = (b.watchedCount / b.totalCount) - (a.watchedCount / a.totalCount)
    return ratioDifference || b.totalCount - a.totalCount || a.definition.name.localeCompare(b.definition.name)
  })
}

const SCOPE_GENERIC_WORDS = new Set(['and', 'collection', 'film', 'franchise', 'movie', 'series', 'the', 'universe'])

export function franchiseScope(value: Pick<FranchiseDefinition, 'name' | 'scope' | 'source' | 'sourceKey' | 'members'>) {
  if (value.source === 'tmdb-studio') return null
  if (value.scope === 'universe' || /:(franchise|universe):/.test(value.sourceKey ?? '')) return 'universe' as const
  const identityTokens = value.name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !SCOPE_GENERIC_WORDS.has(token))
  const hasDistinctLine = identityTokens.length > 0 && value.members.some((member) => {
    const title = member.name.toLowerCase()
    return !identityTokens.some((token) => title.includes(token))
  })
  if (hasDistinctLine) return 'universe' as const
  return 'series' as const
}

export function franchiseDisplayName(value: string | Pick<FranchiseDefinition, 'name' | 'scope' | 'source' | 'sourceKey' | 'members'>) {
  const name = typeof value === 'string' ? value : value.name
  const base = franchiseRootName(name)
  if (typeof value === 'string' || value.source === 'tmdb-studio') return base
  const scope = franchiseScope(value)
  return scope ? `${base} ${scope}` : base
}

export function franchiseRootName(name: string) {
  return name.replace(/\s+(universe|collection|franchise|series)$/i, '').trim() || name
}
