import { describe, expect, it } from 'vitest'
import type { Genre, Show } from '../../types'
import { buildSmartLenses } from './smartLenses'

function show(id: number, genres: string[] = [], metadata: Partial<Show> = {}): Show {
  return {
    id,
    name: `Show ${id}`,
    genres: genres as Genre[],
    rawGenres: genres,
    addedAt: id,
    updatedAt: id,
    ...metadata,
  }
}

describe('buildSmartLenses', () => {
  it('stays out of the way for short watchlists', () => {
    expect(buildSmartLenses(Array.from({ length: 9 }, (_, index) => show(index, ['Comedy'])))).toEqual([])
  })

  it('builds useful groups without duplicating titles inside a group', () => {
    const shows = [
      show(1, ['Comedy'], { seasonCount: 1, episodeCount: 8 }),
      show(2, ['Comedy'], { seasonCount: 1, episodeCount: 10 }),
      show(3, ['Family'], { seasonCount: 1, episodeCount: 6 }),
      show(4, ['Crime']),
      show(5, ['Mystery']),
      show(6, ['Thriller']),
      show(7, ['Drama']),
      show(8, ['Drama']),
      show(9, ['Drama']),
      show(10, ['Drama']),
      show(1, ['Comedy'], { seasonCount: 1, episodeCount: 8 }),
    ]
    const lenses = buildSmartLenses(shows)
    expect(lenses.map((lens) => lens.id)).toEqual(expect.arrayContaining(['comfort', 'dark', 'one-season']))
    expect(lenses.every((lens) => new Set(lens.shows.map((item) => item.id)).size === lens.shows.length)).toBe(true)
  })

  it('omits groups that would merely repeat the full watchlist', () => {
    const lenses = buildSmartLenses(Array.from({ length: 10 }, (_, index) => show(index, ['Comedy'])))
    expect(lenses.some((lens) => lens.id === 'comfort')).toBe(false)
  })
})
