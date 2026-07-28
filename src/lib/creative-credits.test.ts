import { describe, expect, it } from 'vitest'
import { selectAnimationStudios, selectCreators } from './creative-credits'

describe('creative credit selection', () => {
  it('keeps verified animation studios and excludes generic production companies', () => {
    const studios = selectAnimationStudios([
      { id: 1, name: 'Warner Bros. Animation', logo_path: '/warner.png' },
      { id: 2, name: 'Generic Entertainment', logo_path: '/generic.png' },
      { id: 3, name: 'MAPPA', logo_path: '/mappa.png' },
    ])

    expect(studios.map((studio) => studio.name)).toEqual(['Warner Bros. Animation', 'MAPPA'])
  })

  it('prefers explicit TV creators', () => {
    const result = selectCreators('tv', [
      { id: 1, name: 'Creator One', profile_path: '/one.jpg' },
      { id: 2, name: 'Creator Two', profile_path: null },
    ], [{ id: 3, name: 'Director', department: 'Directing', job: 'Director', profile_path: null }])

    expect(result.label).toBe('Creators')
    expect(result.people.map((person) => person.name)).toEqual(['Creator One', 'Creator Two'])
  })

  it('uses directors as the film creative lead without relabelling producers', () => {
    const result = selectCreators('movie', [], [
      { id: 1, name: 'Film Director', department: 'Directing', job: 'Director', profile_path: null },
      { id: 2, name: 'Producer', department: 'Production', job: 'Producer', profile_path: null },
    ])

    expect(result.label).toBe('Director')
    expect(result.people.map((person) => person.name)).toEqual(['Film Director'])
  })
})
