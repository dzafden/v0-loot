import { describe, expect, it } from 'vitest'
import type { TmdbMovieCollection, TmdbSearchResult } from './tmdb'
import { buildFranchiseDefinition, completedFranchiseAchievements, franchiseAchievementProgress, franchiseDisplayName, newlyEarnedFranchiseAchievements } from './franchise-achievements'

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

  it('issues a permanent snapshot only once', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!
    const first = newlyEarnedFranchiseAchievements([definition], new Set([1, 2]), new Set(), 100)
    expect(first).toHaveLength(1)
    expect(first[0].definition.memberIds).toEqual([1, 2])
    expect(first[0].earnedAt).toBe(100)

    const repeated = newlyEarnedFranchiseAchievements(
      [definition],
      new Set([1, 2]),
      new Set([first[0].id]),
      200,
    )
    expect(repeated).toEqual([])
  })

  it('surfaces a collection as soon as one installment is watched', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!

    const progress = franchiseAchievementProgress([definition], [], new Set([1]))

    expect(progress).toHaveLength(1)
    expect(progress[0]).toMatchObject({ watchedCount: 1, totalCount: 3, remainingCount: 2, isComplete: false })
  })

  it('keeps an earned card and flags a newly added chapter', () => {
    const original = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!
    const earned = newlyEarnedFranchiseAchievements([original], new Set([1, 2]), new Set(), 100)
    const expanded = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!

    const progress = franchiseAchievementProgress([expanded], earned, new Set([1, 2]))

    expect(progress[0]).toMatchObject({ hasBeenEarned: true, hasNewChapter: true, isComplete: false, remainingCount: 1 })
  })

  it('keeps earned snapshots visible when the live definition is unavailable', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!
    const earned = newlyEarnedFranchiseAchievements([definition], new Set([1, 2]), new Set(), 100)

    expect(franchiseAchievementProgress([], earned, new Set())[0]).toMatchObject({
      hasBeenEarned: true,
      watchedCount: 0,
      totalCount: 2,
    })
  })
})
