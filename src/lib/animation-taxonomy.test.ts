import { describe, expect, it } from 'vitest'
import {
  getSecondaryAnimationGenre,
  getTraditionDisplayLabel,
  isSafeGrownUpAnimation,
} from './animation-taxonomy'

describe('animation taxonomy display rules', () => {
  it('uses human labels without changing persisted tradition values', () => {
    expect(getTraditionDisplayLabel('anime')).toBe('Anime')
    expect(getTraditionDisplayLabel('western')).toBe('Cartoon')
    expect(getTraditionDisplayLabel('euro')).toBe('European')
    expect(getTraditionDisplayLabel('other')).toBe('International')
  })

  it('finds a secondary genre and never invents an Animation fallback', () => {
    expect(getSecondaryAnimationGenre(['Animation', 'Comedy'])).toBe('Comedy')
    expect(getSecondaryAnimationGenre(['Animation'])).toBeUndefined()
  })

  it('removes known explicit titles and unsafe catalogue terms', () => {
    expect(isSafeGrownUpAnimation({ id: 95897, name: 'Overflow' })).toBe(false)
    expect(isSafeGrownUpAnimation({ id: 100937, name: 'Crazy Over His Fingers' })).toBe(false)
    expect(isSafeGrownUpAnimation({ id: 42, name: 'An Ecchi Comedy' })).toBe(false)
    expect(isSafeGrownUpAnimation({ id: 43, name: "Bob's Burgers" })).toBe(true)
  })
})
