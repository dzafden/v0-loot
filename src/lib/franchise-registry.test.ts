import { describe, expect, it } from 'vitest'
import { getFranchiseRegistryCandidates, getFranchiseRegistryStats } from './franchise-registry'

describe('generated franchise registry', () => {
  it('contains broad generated coverage rather than a small hand-authored example list', () => {
    expect(getFranchiseRegistryStats().groupCount).toBeGreaterThan(100)
    expect(getFranchiseRegistryStats().relationshipCount).toBeGreaterThan(50)
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
