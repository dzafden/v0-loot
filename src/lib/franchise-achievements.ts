import type { FranchiseDefinition } from '../types'
import type { TmdbMovieCollection } from './tmdb'

export type FranchiseAchievement = FranchiseDefinition

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

export function franchiseDisplayName(name: string) {
  return name.replace(/\s+(collection|franchise)$/i, '').trim() || name
}
