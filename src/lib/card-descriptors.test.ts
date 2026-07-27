import { describe, expect, it } from 'vitest'
import { getCardDescriptorCandidates, selectCardDescriptor } from './card-descriptors'

describe('card descriptors', () => {
  it('combines independent concepts into a specific hook', () => {
    expect(selectCardDescriptor({
      keywords: ['samurai', 'time travel', 'robot'],
      genreNames: ['Animation', 'Action', 'Sci-Fi & Fantasy'],
      tradition: 'western',
    })?.label).toBe('Time-Travel Samurai')

    expect(selectCardDescriptor({
      keywords: ['magic', 'parallel world', 'princess'],
      genreNames: ['Animation', 'Fantasy'],
      tradition: 'western',
    })?.label).toBe('Dimension-Hopping Magic')
  })

  it('uses explicit metadata without needing a title-name override', () => {
    expect(selectCardDescriptor({ keywords: ['slapstick comedy', 'socially awkward'] })?.label).toBe('Slapstick')
    expect(selectCardDescriptor({ keywords: ['invention', 'children'] })?.label).toBe('Kid Inventors')
    expect(selectCardDescriptor({
      overview: 'A surreal, post-apocalyptic journey through a strange land.',
      genreNames: ['Animation', 'Sci-Fi & Fantasy'],
    })?.label).toBe('Post-Apocalyptic Fantasy')
  })

  it('does not turn a generic robot into Mecha', () => {
    const candidates = getCardDescriptorCandidates({
      keywords: ['robot', 'space', 'future'],
      genreNames: ['Animation', 'Sci-Fi', 'Action'],
    })
    expect(candidates.map((candidate) => candidate.label)).not.toContain('Mecha')

    expect(selectCardDescriptor({
      keywords: ['giant robot', 'pilot'],
      genreNames: ['Animation', 'Sci-Fi', 'Action'],
    })?.label).toBe('Mecha')
  })

  it('requires anime context and multiple progression signals for inferred Shounen', () => {
    const western = selectCardDescriptor({
      keywords: ['combat training', 'rivalry', 'tournament'],
      genreNames: ['Animation', 'Action'],
      tradition: 'western',
    })
    expect(western?.label).not.toBe('Shounen')

    expect(selectCardDescriptor({
      keywords: ['combat training', 'rivalry'],
      genreNames: ['Animation', 'Action'],
      tradition: 'anime',
    })?.label).toBe('Shounen')
  })

  it('does not manufacture subjective tags from generic family metadata', () => {
    const descriptor = selectCardDescriptor({
      overview: 'Friends and family go on adventures around their school and neighborhood.',
      genreNames: ['Animation', 'Comedy', 'Family'],
      tradition: 'western',
    })
    expect(descriptor?.label).toBe('Family Comedy')
    expect(descriptor?.label).not.toMatch(/nostalgia|comfort|cozy/i)
  })

  it('covers the visible feed examples from overview and genres alone', () => {
    expect(selectCardDescriptor({
      overview: 'Follows a sociopathic genius scientist who drags his inherently timid grandson on adventures across the universe.',
      genreNames: ['Animation', 'Comedy', 'Action & Adventure', 'Sci-Fi & Fantasy'],
      tradition: 'western',
    })?.label).toBe('Cosmic Mad Science')

    expect(selectCardDescriptor({
      overview: 'Robotic cat Doraemon is sent back in time from the 22nd century to protect a 10-year-old boy.',
      genreNames: ['Animation', 'Comedy', 'Family', 'Action & Adventure', 'Kids', 'Sci-Fi & Fantasy'],
      tradition: 'anime',
    })?.label).toBe('Time-Travel Robot')

    expect(selectCardDescriptor({
      overview: 'Twins spend the summer helping their great uncle run a tourist trap in a mysterious town.',
      genreNames: ['Animation', 'Comedy', 'Mystery', 'Family', 'Action & Adventure'],
      tradition: 'western',
    })?.label).toBe('Summer Mystery')

    expect(selectCardDescriptor({
      overview: 'Two stepbrothers on summer vacation embark on some grand new project each day.',
      genreNames: ['Animation', 'Comedy', 'Family', 'Sci-Fi & Fantasy'],
      tradition: 'western',
    })?.label).toBe('Summer Projects')

    expect(selectCardDescriptor({
      overview: 'The surreal misadventures of two friends as they liven up their mundane jobs as groundskeepers.',
      genreNames: ['Animation', 'Comedy', 'Action & Adventure', 'Sci-Fi & Fantasy'],
      tradition: 'western',
    })?.label).toBe('Surreal Workplace')
  })

  it('uses a factual hybrid when the overview has no distinctive evidence', () => {
    expect(selectCardDescriptor({
      overview: 'An unlikely group gets caught up in a new case.',
      genreNames: ['Animation', 'Comedy', 'Mystery'],
    })?.label).toBe('Mystery Comedy')

    expect(selectCardDescriptor({
      overview: 'A story with too little metadata to classify.',
      genreNames: ['Animation'],
    })).toBeUndefined()
  })

  it('does not collapse TMDB’s combined TV genre into science fiction', () => {
    expect(selectCardDescriptor({
      overview: 'A druid forgets how to prepare a magic potion.',
      genreNames: ['Animation', 'Comedy', 'Sci-Fi & Fantasy'],
    })?.label).toBe('Magic Comedy')

    const ambiguous = selectCardDescriptor({
      overview: 'An offbeat adventure with sparse metadata.',
      genreNames: ['Animation', 'Comedy', 'Sci-Fi & Fantasy'],
    })
    expect(ambiguous?.label).toBe('Fantasy/Sci-Fi Comedy')
    expect(ambiguous?.label).not.toBe('Sci-Fi Comedy')
  })

  it('classifies South Park from reusable metadata rather than its title', () => {
    const input = {
      overview: 'Follow the misadventures of four irreverent grade-schoolers in a quiet, dysfunctional town.',
      genreNames: ['Animation', 'Comedy'],
      tradition: 'western' as const,
    }
    expect(selectCardDescriptor(input)?.label).toBe('Irreverent Comedy')
    expect(selectCardDescriptor({
      ...input,
      keywords: ['adult animation', 'parody', 'satire', 'social satire'],
    })?.label).toBe('Social Satire')
  })

  it('can avoid repeating a descriptor already communicated by its context', () => {
    const input = { keywords: ['social satire'] }
    expect(selectCardDescriptor(input)?.label).toBe('Social Satire')
    expect(selectCardDescriptor(input, { excludeIds: ['social_satire'] })?.label).toBe('Satire')
  })
})
