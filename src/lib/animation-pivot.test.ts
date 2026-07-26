import { describe, expect, it } from 'vitest'
import { deriveTradition, tmdbToLoot } from './tmdb'
import { getSupportedVibes, getVibeChipTitle } from './vibe-engine'
import { pickAnimationKey } from '../engine/genre-animations'

describe('animation pivot taxonomy', () => {
  it('derives animation traditions from list metadata', () => {
    expect(deriveTradition([], 'ja')).toBe('anime')
    expect(deriveTradition(['JP'], 'en')).toBe('anime')
    expect(deriveTradition(['US'], 'en')).toBe('western')
    expect(deriveTradition(['FR'], 'fr')).toBe('euro')
    expect(deriveTradition(['KR'], 'ko')).toBe('other')
  })

  it('keeps rich metadata on discover cards', () => {
    const show = tmdbToLoot({
      id: 1,
      name: 'Animated Test',
      genre_ids: [16, 35],
      origin_country: ['US'],
      original_language: 'en',
      mediaType: 'movie',
      overview: 'A dysfunctional family stars in an adult animation satire.',
    })
    expect(show.mediaType).toBe('movie')
    expect(show.tradition).toBe('western')
    expect(show.rawGenres).toEqual(['Animation', 'Comedy'])
    expect(show.genre).toBe('Comedy')
    expect(show.vibeIds).toContain('adult_animation_cynical')
  })

  it('exposes only the animation-native vibe set', () => {
    const ids = getSupportedVibes().map((vibe) => vibe.id)
    expect(ids).toHaveLength(18)
    expect(ids).toContain('shounen_escalation')
    expect(ids).toContain('stop_motion_craft')
    expect(ids).not.toContain('courtroom_showdowns')
  })

  it('keeps card chip vocabulary short enough to read without truncation', () => {
    const labels = getSupportedVibes().map((vibe) => getVibeChipTitle(vibe.id))
    expect(labels.every((label) => label && label.length <= 13)).toBe(true)
    expect(getVibeChipTitle('comfort_rewatch_classics')).toBe('Comfort')
    expect(getVibeChipTitle('cartoon_nostalgia')).toBe('Nostalgia')
  })

  it('uses tradition and vibe when Animation would collapse motion', () => {
    expect(pickAnimationKey(['Animation'], 'anime', ['slice_of_life_cozy'])).toBe('anime')
    expect(pickAnimationKey(['Animation'], undefined, ['horror_animated'])).toBe('horror_animated')
    expect(pickAnimationKey(['Animation', 'Horror'], 'western', ['adult_animation_cynical'])).toBe('Horror')
  })
})
