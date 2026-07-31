import { describe, expect, it } from 'vitest'
import type { TmdbMovieCollection, TmdbSearchResult } from './tmdb'
import { buildFranchiseDefinition, completedFranchiseAchievements, franchiseDisplayName } from './franchise-achievements'

function movie(id: number, name: string, releaseDate: string): TmdbSearchResult {
  return {
    id,
    name,
    first_air_date: releaseDate,
    poster_path: `/${id}.jpg`,
    backdrop_path: `/backdrop-${id}.jpg`,
    genre_ids: [16],
    mediaType: 'movie',
  }
}

function collection(results: TmdbSearchResult[]): TmdbMovieCollection {
  return {
    id: 44,
    name: 'Moon Cats Collection',
    posterPath: '/collection.jpg',
    backdropPath: '/collection-backdrop.jpg',
    results,
  }
}

describe('franchise achievements', () => {
  it('defines a franchise from released collection members only', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats 2', '2024-06-01'),
      movie(3, 'Moon Cats 3', '2030-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())

    expect(definition?.memberIds).toEqual([1, 2])
  })

  it('awards a card only when every released member is watched', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats 2', '2024-06-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!

    expect(completedFranchiseAchievements([definition], new Set([1]))).toHaveLength(0)
    expect(completedFranchiseAchievements([definition], new Set([1, 2]))[0]?.id).toBe(44)
  })

  it('uses the literal franchise name without the provider suffix', () => {
    expect(franchiseDisplayName('Moon Cats Collection')).toBe('Moon Cats')
  })
})
