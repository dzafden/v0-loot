import { useMemo } from 'react'
import { getAnimationPreset, reducedMotionPreset, type AnimationPreset } from '../engine/genre-animations'
import { useReducedMotion } from './useReducedMotion'

export function useGenreAnimation(genre: string | undefined): AnimationPreset {
  const reduced = useReducedMotion()
  return useMemo(() => {
    if (reduced) return reducedMotionPreset
    return getAnimationPreset(genre)
  }, [genre, reduced])
}
