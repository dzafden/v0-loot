import { describe, expect, it } from 'vitest'
import type { FranchiseDefinition, MediaType, Show } from '../types'
import { collectionFamily } from './franchise-achievements'
import {
  buildRegistryDefinitionsForShows,
  getAchievementEligibleFranchiseRegistryGroups,
  getFranchiseRegistryCandidates,
  getFranchiseRegistryStats,
  registryDefinitionId,
} from './franchise-registry'

function ownedShow(id: number, mediaType: MediaType, name: string): Show {
  return {
    id,
    name,
    mediaType,
    genres: ['Animation'],
    posterPath: `/${id}.jpg`,
    backdropPath: `/backdrop-${id}.jpg`,
    addedAt: 1,
    updatedAt: 1,
  }
}

describe('generated franchise registry', () => {
  it('contains broad generated coverage rather than a small hand-authored example list', () => {
    expect(getFranchiseRegistryStats().groupCount).toBeGreaterThan(100)
    expect(getFranchiseRegistryStats().eligibleGroupCount).toBeGreaterThan(100)
    expect(getFranchiseRegistryStats().relationshipCount).toBeGreaterThan(50)
  })

  it('assigns every eligible group a stable, collision-free definition id', () => {
    const groups = getAchievementEligibleFranchiseRegistryGroups()
    const ids = groups.map((group) => registryDefinitionId(group.id))
    expect(new Set(ids).size).toBe(groups.length)
    expect(ids.every((id) => id < -1_000_000_000)).toBe(true)
  })

  it('materialises a touched TV franchise without requiring live TMDB metadata', () => {
    const avatar = ownedShow(246, 'tv', 'Avatar: The Last Airbender')
    const sync = buildRegistryDefinitionsForShows(
      [avatar],
      [],
      new Date('2026-08-01T12:00:00Z').getTime(),
    )
    expect(sync.definitions).toHaveLength(1)
    expect(sync.definitions[0]).toMatchObject({
      name: 'Avatar: The Last Airbender',
      source: 'wikidata',
      sourceKey: 'wikidata:franchise:Q60518601',
    })
    expect(sync.definitions[0].members.map((member) => member.mediaType)).toContain('tv')
    expect(collectionFamily(sync.definitions[0])).toBe('franchise')
  })

  it('does not count registry members whose release date could not be verified', () => {
    const sync = buildRegistryDefinitionsForShows(
      [ownedShow(60554, 'tv', 'Star Wars Rebels')],
      [],
      new Date('2026-08-02T12:00:00Z').getTime(),
    )
    const starWars = sync.definitions.find((definition) => definition.name === 'Star Wars')

    expect(starWars).toBeDefined()
    expect(starWars?.members.map((member) => member.name)).not.toContain('Star Wars Detours')
  })

  it('dedupes a registry group into the canonical TMDB definition and keeps the larger set', () => {
    const tmdb: FranchiseDefinition = {
      id: 10194,
      name: 'Toy Story Collection',
      posterPath: '/collection.jpg',
      backdropPath: '/collection-backdrop.jpg',
      memberIds: [862, 863, 10193, 301528, 1084244],
      members: [862, 863, 10193, 301528, 1084244].map((id) => ({
        id,
        name: `Toy Story ${id}`,
        releaseDate: '2020-01-01',
        mediaType: 'movie' as const,
      })),
      source: 'tmdb-collection',
      updatedAt: 1,
    }
    const staleRegistryDefinition: FranchiseDefinition = {
      ...tmdb,
      id: -2_000_010_194,
      name: 'Toy Story',
      source: 'wikidata',
      sourceKey: 'wikidata:franchise:toy-story',
    }
    const sync = buildRegistryDefinitionsForShows(
      [ownedShow(862, 'movie', 'Toy Story')],
      [tmdb, staleRegistryDefinition],
      new Date('2026-08-01T12:00:00Z').getTime(),
    )
    expect(sync.definitions).toHaveLength(1)
    expect(sync.definitions[0]).toMatchObject({ id: 10194, source: 'tmdb-collection' })
    expect(sync.definitions[0].scope).toBe('series')
    expect(sync.definitions[0].memberIds).toHaveLength(7)
    expect(sync.definitions[0].backdropPath).toBe('/collection-backdrop.jpg')
    expect(sync.supersededIds).toEqual([staleRegistryDefinition.id])
    expect(sync.replacements[0]).toMatchObject({
      previousId: staleRegistryDefinition.id,
      definition: { id: tmdb.id, source: 'tmdb-collection' },
    })
  })

  it('marks a franchise with a distinct spin-off line as a universe', () => {
    const shrekCollection: FranchiseDefinition = {
      id: 2150,
      name: 'Shrek Collection',
      memberIds: [808, 809, 810, 10192],
      members: [808, 809, 810, 10192].map((id) => ({
        id,
        name: `Shrek ${id}`,
        releaseDate: '2020-01-01',
        mediaType: 'movie' as const,
      })),
      source: 'tmdb-collection',
      scope: 'series',
      updatedAt: 1,
    }
    const sync = buildRegistryDefinitionsForShows(
      [ownedShow(808, 'movie', 'Shrek')],
      [shrekCollection],
      new Date('2026-08-02T12:00:00Z').getTime(),
    )

    expect(sync.definitions[0]).toMatchObject({ id: shrekCollection.id, scope: 'universe' })
    expect(sync.definitions[0].members.map((member) => member.name)).toContain('Puss in Boots')
  })

  it.each([
    [629542, 'The Bad Guys 2'],
    [9502, 'Kung Fu Panda 2'],
    [211672, 'Minions: The Rise of Gru'],
    [953, 'Madagascar: Escape 2 Africa'],
    [862, 'Toy Story 2'],
  ])('discovers related films for TMDB movie %i', (id, expectedTitle) => {
    const candidates = getFranchiseRegistryCandidates({ id, mediaType: 'movie' })
    expect(candidates.map((candidate) => candidate.name)).toContain(expectedTitle)
  })

  it('connects a spin-off line through its wider media franchise', () => {
    const candidates = getFranchiseRegistryCandidates({ id: 211672, mediaType: 'movie' })
    expect(candidates.map((candidate) => candidate.name)).toContain('Despicable Me')
  })

  it('discovers typed television sequels and spin-offs', () => {
    expect(getFranchiseRegistryCandidates({ id: 46260, mediaType: 'tv' }).map((candidate) => candidate.name))
      .toContain('Naruto: Shippūden')
    const familyGuyCandidates = getFranchiseRegistryCandidates({ id: 1434, mediaType: 'tv' })
    expect(familyGuyCandidates.map((candidate) => candidate.name)).toContain('American Dad!')
    expect(familyGuyCandidates.map((candidate) => candidate.name)).toContain('The Cleveland Show')
  })
})
