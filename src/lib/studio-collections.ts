import type { FranchiseDefinition } from '../types'
import type { TmdbSearchResult } from './tmdb'
import { COLLECTIBLE_MAX, type StudioDefinition } from './studios'

/** Studio ids are stored as negative keys so they cannot collide with TMDB collection ids. */
export function studioDefinitionId(studioId: number) {
  return -Math.abs(studioId)
}

export function buildStudioCollectionDefinition(
  studio: StudioDefinition,
  results: TmdbSearchResult[],
  at = Date.now(),
): FranchiseDefinition | null {
  const today = new Date(at).toISOString().slice(0, 10)
  const released = results
    .filter((show) => Boolean(show.first_air_date) && show.first_air_date! <= today)
    // Loot's persisted media key is currently the numeric TMDB id, so de-duplicate across
    // media types as well as within one result set.
    .filter((show, index, shows) => shows.findIndex((candidate) => candidate.id === show.id) === index)
  const hero = [...released]
    .filter((show) => Boolean(show.backdrop_path))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
  const poster = [...released]
    .filter((show) => Boolean(show.poster_path))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
  const members = released
    .map((show) => ({
      id: show.id,
      name: show.name,
      posterPath: show.poster_path ?? null,
      backdropPath: show.backdrop_path ?? null,
      overview: show.overview,
      releaseDate: show.first_air_date!,
      mediaType: show.mediaType ?? 'tv',
    }))
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))

  if (!members.length) return null
  return {
    id: studioDefinitionId(studio.id),
    sourceId: studio.id,
    name: studio.name,
    posterPath: poster?.poster_path ?? null,
    backdropPath: hero?.backdrop_path ?? null,
    memberIds: members.map((member) => member.id),
    members,
    source: 'tmdb-studio',
    tradition: studio.tradition,
    collectible: studio.collectible && members.length <= COLLECTIBLE_MAX,
    updatedAt: at,
  }
}
