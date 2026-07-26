import type { AnimationTradition } from '../types'

export const TRADITION_DISPLAY_LABELS: Record<AnimationTradition, string> = {
  anime: 'Anime',
  western: 'Cartoon',
  euro: 'European',
  other: 'International',
}

export function getTraditionDisplayLabel(tradition?: AnimationTradition) {
  return tradition ? TRADITION_DISPLAY_LABELS[tradition] : undefined
}

export function getSecondaryAnimationGenre(rawGenres?: string[]) {
  return rawGenres?.find((genre) => genre && genre !== 'Animation')
}

const GROWN_UP_DENY_IDS = new Set([
  95897, // Overflow
  100937, // Crazy Over His Fingers
])

const GROWN_UP_DENY_TERMS = ['hentai', 'ecchi', 'erotic']

export function isSafeGrownUpAnimation(show: { id: number; name?: string; title?: string; overview?: string }) {
  if (GROWN_UP_DENY_IDS.has(show.id)) return false
  const text = `${show.name ?? ''} ${show.title ?? ''} ${show.overview ?? ''}`.toLowerCase()
  return !GROWN_UP_DENY_TERMS.some((term) => text.includes(term))
}
