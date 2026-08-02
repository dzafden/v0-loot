import { describe, expect, it } from 'vitest'
import type { DismissedCollection, FranchiseDefinition } from '../types'
import type { TmdbMovieCollection, TmdbSearchResult } from './tmdb'
import {
  buildFranchiseDefinition,
  collectionFrequencyTreatment,
  completedFranchiseAchievements,
  franchiseAchievementProgress,
  franchiseDisplayName,
  isCollectionVisible,
  newlyEarnedFranchiseAchievements,
  rebindDismissedCollection,
  rebindEarnedFranchiseAchievement,
  shouldAutoRestoreDismissal,
} from './franchise-achievements'

const ownedMovies = (...ids: number[]) => new Set(ids.map((id) => `movie:${id}`))

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
      movie(3, 'Moon Cats 3', '2025-06-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!

    expect(completedFranchiseAchievements([definition], ownedMovies(1, 2))).toHaveLength(0)
    expect(completedFranchiseAchievements([definition], ownedMovies(1, 2, 3))[0]?.id).toBe(44)
  })

  it('never earns a pair — a set of two is not a body of work', () => {
    const pair = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats 2', '2024-06-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!

    expect(completedFranchiseAchievements([pair], ownedMovies(1, 2))).toHaveLength(0)
    expect(franchiseAchievementProgress([pair], [], ownedMovies(1, 2))).toHaveLength(0)
  })

  it('uses the literal franchise name without the provider suffix', () => {
    expect(franchiseDisplayName('Moon Cats Collection')).toBe('Moon Cats')
  })

  it('derives treatment from completion frequency rather than a rarity label', () => {
    expect(collectionFrequencyTreatment(4)).toBe('everyday')
    expect(collectionFrequencyTreatment(10)).toBe('sunday')
    expect(collectionFrequencyTreatment(25)).toBe('heirloom')
  })

  it('surfaces franchise capture prompts at one title but requires a studio pattern', () => {
    expect(isCollectionVisible(1, 4, 'franchise')).toBe(true)
    expect(isCollectionVisible(1, 8, 'studio')).toBe(false)
    expect(isCollectionVisible(2, 8, 'studio')).toBe(true)
    expect(isCollectionVisible(2, 39, 'studio')).toBe(false)
    expect(isCollectionVisible(36, 39, 'studio')).toBe(true)
  })

  it('issues a permanent snapshot only once', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!
    const first = newlyEarnedFranchiseAchievements([definition], ownedMovies(1, 2, 3), new Set(), 100)
    expect(first).toHaveLength(1)
    expect(first[0].definition.memberIds).toEqual([1, 2, 3])
    expect(first[0].earnedAt).toBe(100)

    const repeated = newlyEarnedFranchiseAchievements(
      [definition],
      ownedMovies(1, 2, 3),
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

    const progress = franchiseAchievementProgress([definition], [], ownedMovies(1))

    expect(progress).toHaveLength(1)
    expect(progress[0]).toMatchObject({ watchedCount: 1, totalCount: 3, remainingCount: 2, isComplete: false })
  })

  it('keeps movie and TV ids separate when calculating progress', () => {
    const definition: FranchiseDefinition = {
      id: -1,
      name: 'Sonic the Hedgehog',
      memberIds: [2404, 62211, 1234],
      members: [
        { id: 2404, name: 'Sonic the Hedgehog', releaseDate: '1993-01-01', mediaType: 'tv' },
        { id: 62211, name: 'Sonic Boom', releaseDate: '2014-11-08', mediaType: 'tv' },
        { id: 1234, name: 'Sonic Film', releaseDate: '2020-01-01', mediaType: 'movie' },
      ],
      source: 'wikidata',
      sourceKey: 'wikidata:franchise:sonic',
      updatedAt: 1,
    }

    const progress = franchiseAchievementProgress(
      [definition],
      [],
      new Set(['tv:2404', 'movie:62211']),
    )

    expect(progress[0]).toMatchObject({ watchedCount: 1, remainingCount: 2, isComplete: false })
  })

  it('keeps an earned card and flags a newly added chapter', () => {
    const original = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!
    const earned = newlyEarnedFranchiseAchievements([original], ownedMovies(1, 2, 3), new Set(), 100)
    const expanded = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
      movie(4, 'Moon Cats: Nine Lives', '2025-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!

    const progress = franchiseAchievementProgress([expanded], earned, ownedMovies(1, 2, 3))

    expect(progress[0]).toMatchObject({ hasBeenEarned: true, hasNewChapter: true, isComplete: false, remainingCount: 1 })
  })

  it('hides a dismissed collection but keeps tracking it', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!

    expect(franchiseAchievementProgress([definition], [], ownedMovies(1), new Set([44]))).toHaveLength(0)
    // ...but a dismissed collection still earns if it is completed.
    const earned = newlyEarnedFranchiseAchievements([definition], ownedMovies(1, 2, 3), new Set(), 100)
    expect(franchiseAchievementProgress([definition], earned, ownedMovies(1, 2, 3), new Set([44]))).toHaveLength(1)
    expect(shouldAutoRestoreDismissal(definition, ownedMovies(1), 1)).toBe(false)
    expect(shouldAutoRestoreDismissal(definition, ownedMovies(1, 2), 1)).toBe(true)
  })

  it('keeps earned snapshots visible when the live definition is unavailable', () => {
    const definition = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!
    const earned = newlyEarnedFranchiseAchievements([definition], ownedMovies(1, 2, 3), new Set(), 100)

    expect(franchiseAchievementProgress([], earned, ownedMovies())[0]).toMatchObject({
      hasBeenEarned: true,
      watchedCount: 0,
      totalCount: 3,
    })
  })

  it('rebinds earned and dismissed records to a canonical definition', () => {
    const registry = buildFranchiseDefinition(collection([
      movie(1, 'Moon Cats', '2020-01-01'),
      movie(2, 'Moon Cats Again', '2022-01-01'),
      movie(3, 'Moon Cats Forever', '2024-01-01'),
    ]), new Date('2026-07-31T12:00:00Z').getTime())!
    registry.id = -2_000_000_044
    registry.source = 'wikidata'
    registry.sourceKey = 'wikidata:franchise:moon-cats'
    const canonical: FranchiseDefinition = {
      ...registry,
      id: 44,
      source: 'tmdb-collection',
      sourceKey: undefined,
      backdropPath: '/canonical.jpg',
    }
    const achievement = newlyEarnedFranchiseAchievements(
      [registry],
      ownedMovies(1, 2, 3),
      new Set(),
      100,
    )[0]
    const dismissed: DismissedCollection = {
      id: 'wikidata:wikidata:franchise:moon-cats',
      definitionId: registry.id,
      source: registry.source,
      name: registry.name,
      watchedCountAtDismissal: 1,
      dismissedAt: 50,
      updatedAt: 50,
    }

    expect(rebindEarnedFranchiseAchievement(achievement, canonical)).toMatchObject({
      id: 'tmdb-collection:44',
      definitionId: 44,
      earnedAt: 100,
      definition: { id: 44, source: 'tmdb-collection', memberIds: [1, 2, 3] },
    })
    expect(rebindDismissedCollection(dismissed, canonical)).toMatchObject({
      id: 'tmdb-collection:44',
      definitionId: 44,
      watchedCountAtDismissal: 1,
    })
  })
})
