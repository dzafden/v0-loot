import type { EarnedFranchiseAchievement, FranchiseDefinition } from '../types'
import type { TmdbMovieCollection } from './tmdb'

export type FranchiseAchievement = FranchiseDefinition

export interface FranchiseAchievementProgress {
  definition: FranchiseDefinition
  earnedAchievement?: EarnedFranchiseAchievement
  watchedIds: number[]
  watchedCount: number
  totalCount: number
  remainingCount: number
  isComplete: boolean
  hasBeenEarned: boolean
  hasNewChapter: boolean
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
    updatedAt: at,
  }
}

export function completedFranchiseAchievements(
  definitions: FranchiseDefinition[],
  ownedIds: Set<number>,
): FranchiseAchievement[] {
  return definitions
    .filter((definition) => definition.memberIds.length >= 2)
    .filter((definition) => definition.memberIds.every((id) => ownedIds.has(id)))
    .map((definition) => ({ ...definition }))
    .sort((a, b) => b.memberIds.length - a.memberIds.length || a.name.localeCompare(b.name))
}

export function franchiseAchievementId(definitionId: number) {
  return `tmdb-collection:${definitionId}`
}

export function franchiseCriteriaVersion(definition: FranchiseDefinition) {
  return `tmdb:${definition.id}:${[...definition.memberIds].sort((a, b) => a - b).join(',')}`
}

export function newlyEarnedFranchiseAchievements(
  definitions: FranchiseDefinition[],
  ownedIds: Set<number>,
  existingIds: Set<string>,
  at = Date.now(),
): EarnedFranchiseAchievement[] {
  return completedFranchiseAchievements(definitions, ownedIds)
    .filter((definition) => !existingIds.has(franchiseAchievementId(definition.id)))
    .map((definition) => ({
      id: franchiseAchievementId(definition.id),
      definitionId: definition.id,
      criteriaVersion: franchiseCriteriaVersion(definition),
      earnedAt: at,
      definition: structuredClone(definition),
    }))
}

export function franchiseAchievementProgress(
  definitions: FranchiseDefinition[],
  earnedAchievements: EarnedFranchiseAchievement[],
  ownedIds: Set<number>,
): FranchiseAchievementProgress[] {
  const liveById = new Map(definitions.map((definition) => [definition.id, definition]))
  const earnedByDefinitionId = new Map(
    earnedAchievements.map((achievement) => [achievement.definitionId, achievement]),
  )
  const definitionIds = new Set([
    ...definitions
      .filter((definition) => definition.memberIds.some((id) => ownedIds.has(id)))
      .map((definition) => definition.id),
    ...earnedAchievements.map((achievement) => achievement.definitionId),
  ])

  const progressItems: FranchiseAchievementProgress[] = []
  for (const definitionId of definitionIds) {
    const earnedAchievement = earnedByDefinitionId.get(definitionId)
    const definition = liveById.get(definitionId) ?? earnedAchievement?.definition
    if (!definition) continue
    const watchedIds = definition.memberIds.filter((id) => ownedIds.has(id))
    const watchedCount = watchedIds.length
    const totalCount = definition.memberIds.length
    const hasBeenEarned = Boolean(earnedAchievement)
    const isComplete = totalCount >= 2 && watchedCount === totalCount
    const earnedMemberCount = earnedAchievement?.definition.memberIds.length ?? 0
    progressItems.push({
      definition,
      earnedAchievement,
      watchedIds,
      watchedCount,
      totalCount,
      remainingCount: Math.max(0, totalCount - watchedCount),
      isComplete,
      hasBeenEarned,
      hasNewChapter: hasBeenEarned && totalCount > earnedMemberCount && !isComplete,
    })
  }

  return progressItems.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1
    if (a.hasNewChapter !== b.hasNewChapter) return a.hasNewChapter ? -1 : 1
    const ratioDifference = (b.watchedCount / b.totalCount) - (a.watchedCount / a.totalCount)
    return ratioDifference || b.totalCount - a.totalCount || a.definition.name.localeCompare(b.definition.name)
  })
}

export function franchiseDisplayName(name: string) {
  return name.replace(/\s+(collection|franchise)$/i, '').trim() || name
}
