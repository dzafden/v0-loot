import type { Show } from '../../types'

export type SmartLensId = 'one-season' | 'quick-start' | 'comfort' | 'dark' | 'weekend-binge'

export interface SmartLens {
  id: SmartLensId
  label: string
  description: string
  shows: Show[]
}

const MIN_WATCHLIST_SIZE = 10
const MIN_LENS_SIZE = 3
const MAX_LENSES = 4

function genreSet(show: Show) {
  return new Set([...(show.rawGenres ?? []), ...(show.genres ?? [])].map((genre) => genre.toLowerCase()))
}

function hasGenre(show: Show, genres: string[]) {
  const showGenres = genreSet(show)
  return genres.some((genre) => showGenres.has(genre))
}

const DEFINITIONS: Omit<SmartLens, 'shows'>[] = [
  { id: 'one-season', label: 'One season', description: 'Complete stories with one season' },
  { id: 'quick-start', label: 'Quick start', description: 'Ten episodes or fewer' },
  { id: 'comfort', label: 'Comfort', description: 'Lighter picks for an easy watch' },
  { id: 'dark', label: 'Dark', description: 'Crime, mystery, horror, and thrillers' },
  { id: 'weekend-binge', label: 'Weekend binge', description: 'Six to twenty-four episodes' },
]

function matches(id: SmartLensId, show: Show) {
  switch (id) {
    case 'one-season':
      return show.seasonCount === 1
    case 'quick-start':
      return typeof show.episodeCount === 'number' && show.episodeCount > 0 && show.episodeCount <= 10
    case 'comfort':
      return hasGenre(show, ['comedy', 'animation', 'family', 'kids'])
    case 'dark':
      return hasGenre(show, ['crime', 'mystery', 'horror', 'thriller'])
    case 'weekend-binge':
      return typeof show.episodeCount === 'number' && show.episodeCount >= 6 && show.episodeCount <= 24
  }
}

export function buildSmartLenses(shows: Show[]): SmartLens[] {
  const uniqueShows = [...new Map(shows.map((show) => [show.id, show])).values()]
  if (uniqueShows.length < MIN_WATCHLIST_SIZE) return []

  return DEFINITIONS
    .map((definition) => ({ ...definition, shows: uniqueShows.filter((show) => matches(definition.id, show)) }))
    .filter((lens) => lens.shows.length >= MIN_LENS_SIZE && lens.shows.length < uniqueShows.length)
    .sort((a, b) => b.shows.length - a.shows.length || DEFINITIONS.findIndex((item) => item.id === a.id) - DEFINITIONS.findIndex((item) => item.id === b.id))
    .slice(0, MAX_LENSES)
}
