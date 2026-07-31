import { describe, expect, it } from 'vitest'
import type { LootShow } from '../../lib/tmdb'
import type { Show } from '../../types'
import { rankOnboardingFollowupCandidates } from './onboardingFollowup'

function anchor(id: number, name: string): Show {
  return {
    id,
    name,
    mediaType: 'tv',
    genres: ['Animation'],
    addedAt: 1,
    updatedAt: 1,
  }
}

function candidate(id: number, title: string, popularity = 20): LootShow {
  return {
    id,
    title,
    posterPath: `/${id}.jpg`,
    backdropPath: null,
    year: '2020',
    genre: 'Animation',
    rating: 8,
    overview: '',
    popularity,
    rawGenres: ['Animation'],
    tradition: 'western',
    mediaType: 'tv',
    vibeIds: [],
    vibeEvidence: {},
  }
}

describe('onboarding follow-up ranking', () => {
  it('prioritizes repeated metadata relationships and title continuity', () => {
    const anchors = [anchor(1, 'Galaxy Heroes'), anchor(2, 'Moon School')]
    const shared = candidate(10, 'Galaxy Heroes: Next Class')
    const popularButLoose = candidate(11, 'Comedy Neighbors', 900)
    const result = rankOnboardingFollowupCandidates([
      { anchorId: 1, kind: 'recommendation', shows: [popularButLoose, shared] },
      { anchorId: 2, kind: 'similar', shows: [shared] },
    ], anchors, new Set())

    expect(result[0].id).toBe(shared.id)
  })

  it('filters owned titles and balances candidates across anchors', () => {
    const anchors = [anchor(1, 'First'), anchor(2, 'Second')]
    const firstGroup = [1, 2, 3, 4, 5].map((id) => candidate(100 + id, `First ${id}`))
    const secondGroup = [1, 2].map((id) => candidate(200 + id, `Second ${id}`))
    const result = rankOnboardingFollowupCandidates([
      { anchorId: 1, kind: 'recommendation', shows: firstGroup },
      { anchorId: 2, kind: 'recommendation', shows: secondGroup },
    ], anchors, new Set([101]), 6)

    expect(result.map((show) => show.id)).not.toContain(101)
    expect(result.filter((show) => show.id >= 200)).toHaveLength(2)
  })

  it('reserves space for every explicit franchise before softer recommendations', () => {
    const anchors = [anchor(1, 'First'), anchor(2, 'Second'), anchor(3, 'Third')]
    const result = rankOnboardingFollowupCandidates([
      { anchorId: 1, kind: 'collection', shows: [candidate(101, 'First 2')] },
      { anchorId: 1, kind: 'recommendation', shows: [candidate(111, 'Popular 1', 900)] },
      { anchorId: 2, kind: 'collection', shows: [candidate(201, 'Second 2')] },
      { anchorId: 2, kind: 'recommendation', shows: [candidate(211, 'Popular 2', 800)] },
      { anchorId: 3, kind: 'collection', shows: [candidate(301, 'Third 2')] },
      { anchorId: 3, kind: 'recommendation', shows: [candidate(311, 'Popular 3', 700)] },
    ], anchors, new Set(), 3)

    expect(result.map((show) => show.id)).toEqual([101, 201, 301])
  })

  it('still represents an anchor when TMDB has no collection record', () => {
    const anchors = [anchor(1, 'Odd Squad'), anchor(2, 'Moon Cats')]
    const result = rankOnboardingFollowupCandidates([
      { anchorId: 1, kind: 'collection', shows: [candidate(101, 'Odd Squad 2')] },
      { anchorId: 2, kind: 'recommendation', shows: [candidate(210, 'Loose Match'), candidate(211, 'Moon Cats Return')] },
      { anchorId: 2, kind: 'similar', shows: [candidate(212, 'Another Match')] },
    ], anchors, new Set(), 2)

    expect(result.map((show) => show.id)).toEqual([101, 211])
  })
})
