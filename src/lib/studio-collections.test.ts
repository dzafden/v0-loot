import { describe, expect, it } from 'vitest'
import type { TmdbSearchResult } from './tmdb'
import { buildStudioCollectionDefinition, studioDefinitionId } from './studio-collections'
import type { StudioDefinition } from './studios'

const studio: StudioDefinition = {
  id: 11537,
  name: 'Laika',
  tradition: 'western',
  cls: 'canon',
  collectible: true,
  approxCount: 6,
}

function title(id: number, mediaType: 'tv' | 'movie', date: string, popularity: number): TmdbSearchResult {
  return { id, name: `Title ${id}`, mediaType, first_air_date: date, backdrop_path: `/b${id}.jpg`, poster_path: `/p${id}.jpg`, overview: `Overview ${id}`, popularity }
}

describe('studio collections', () => {
  it('namespaces studio ids and keeps mixed-media membership', () => {
    const definition = buildStudioCollectionDefinition(studio, [
      title(1, 'movie', '2020-01-01', 5),
      title(2, 'tv', '2021-01-01', 10),
    ], new Date('2026-01-01').getTime())!

    expect(definition.id).toBe(studioDefinitionId(studio.id))
    expect(definition.source).toBe('tmdb-studio')
    expect(definition.members.map((member) => member.mediaType)).toEqual(['movie', 'tv'])
    expect(definition.members.map((member) => member.overview)).toEqual(['Overview 1', 'Overview 2'])
    expect(definition.backdropPath).toBe('/b2.jpg')
  })
})
