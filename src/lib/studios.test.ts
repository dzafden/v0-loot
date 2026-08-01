import { describe, expect, it } from 'vitest'
import { COLLECTIBLE_MAX, STUDIOS, resolveStudios } from './studios'

describe('curated studios', () => {
  it('contains unique verified ids and only the two approved inclusion classes', () => {
    expect(new Set(STUDIOS.map((studio) => studio.id)).size).toBe(STUDIOS.length)
    expect(STUDIOS.every((studio) => studio.cls === 'canon' || studio.cls === 'revelation')).toBe(true)
  })

  it('keeps page-only studios out of completable sets', () => {
    expect(STUDIOS.filter((studio) => studio.collectible).every((studio) => studio.approxCount <= COLLECTIBLE_MAX)).toBe(true)
  })

  it('resolves allowlisted authoring studios wherever they appear in company order', () => {
    expect(resolveStudios([
      { id: 999999, name: 'A rights holder' },
      { id: 30452, name: 'Bento Box' },
    ]).map((studio) => studio.name)).toEqual(['Bento Box'])
  })

  it('does not include networks, broadcasters, or streaming services', () => {
    const names = new Set(STUDIOS.map((studio) => studio.name))
    for (const excluded of ['Netflix', 'Adult Swim', 'Cartoon Network', 'FOX']) {
      expect(names.has(excluded)).toBe(false)
    }
  })
})
