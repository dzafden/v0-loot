/**
 * Genre Animation Engine
 *
 * Maps a TV genre to a set of Framer Motion variants.
 * Each `AnimationPreset` describes how a card behaves during entry,
 * idle (continuous loop), exit, and direct interaction.
 *
 * The engine is a pure data module — components consume presets via
 * `useGenreAnimation()` so animations can be swapped, tested, and
 * extended without touching the card component.
 */
import type { Variants, Transition } from 'framer-motion'
import type { Genre } from '../types'

export interface AnimationPreset {
  /** Played when the card mounts. */
  entry: Variants
  /** Looping animation while card is visible / hovered. */
  idle: Variants
  /** Played when the card unmounts (filter / delete). */
  exit: Variants
  /** Played on tap / click — discrete punctuation. */
  interact: Variants
  /** Subtle accent color for outline/glow. */
  accent: string
  /** Suggested overlay treatment. */
  overlay?: 'vignette' | 'holographic' | 'rarity-glow' | 'static-noise' | 'none'
  /** Default entry transition (Framer Motion). */
  entryTransition?: Transition
}

const spring = (stiffness = 320, damping = 22): Transition => ({
  type: 'spring',
  stiffness,
  damping,
})

// ---------- presets ----------

const horror: AnimationPreset = {
  accent: '#ff2d2d',
  overlay: 'static-noise',
  entry: {
    initial: { opacity: 0, scale: 0.6, rotate: -8, filter: 'blur(8px) brightness(0.4)' },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      filter: 'blur(0px) brightness(1)',
      transition: { duration: 0.55 },
    },
  },
  idle: {
    animate: {
      filter: ['brightness(1)', 'brightness(0.85)', 'brightness(1.05)', 'brightness(1)'],
      x: [0, -1, 1, 0],
      transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: {
    exit: { opacity: 0, scale: 0.7, filter: 'blur(8px)', transition: { duration: 0.3 } },
  },
  interact: {
    tap: { scale: 0.94, rotate: -2, transition: spring(500, 18) },
  },
  entryTransition: spring(),
}

const comedy: AnimationPreset = {
  accent: '#ffd84a',
  overlay: 'holographic',
  entry: {
    initial: { opacity: 0, y: 80, scale: 0.7, rotate: -12 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: { type: 'spring', stiffness: 400, damping: 14 },
    },
  },
  idle: {
    animate: {
      y: [0, -3, 0, 2, 0],
      rotate: [0, 1.5, 0, -1.5, 0],
      transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: { exit: { opacity: 0, y: 30, rotate: 6, transition: { duration: 0.25 } } },
  interact: {
    tap: { scale: 0.88, rotate: 6, transition: spring(600, 12) },
  },
}

const drama: AnimationPreset = {
  accent: '#a259ff',
  overlay: 'vignette',
  entry: {
    initial: { opacity: 0, y: 24, scale: 0.96 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  },
  idle: {
    animate: {
      scale: [1, 1.012, 1],
      transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: { exit: { opacity: 0, y: -12, transition: { duration: 0.4 } } },
  interact: {
    tap: { scale: 0.97, transition: spring(280, 24) },
  },
}

const sciFi: AnimationPreset = {
  accent: '#4af0ff',
  overlay: 'holographic',
  entry: {
    initial: {
      opacity: 0,
      scale: 0.4,
      rotateY: 90,
      filter: 'hue-rotate(90deg) brightness(1.6)',
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      filter: 'hue-rotate(0deg) brightness(1)',
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  },
  idle: {
    animate: {
      filter: ['brightness(1)', 'brightness(1.08)', 'brightness(1)'],
      transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: { exit: { opacity: 0, scale: 0.6, rotateY: -90, transition: { duration: 0.45 } } },
  interact: {
    tap: { scale: 0.92, rotateY: 8, transition: spring(420, 18) },
  },
}

const action: AnimationPreset = {
  accent: '#ff7a1a',
  overlay: 'rarity-glow',
  entry: {
    initial: { opacity: 0, x: -120, rotate: -16, scale: 0.7 },
    animate: {
      opacity: 1,
      x: 0,
      rotate: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 480, damping: 18 },
    },
  },
  idle: {
    animate: {
      scale: [1, 1.02, 1],
      transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: { exit: { opacity: 0, x: 120, rotate: 16, transition: { duration: 0.25 } } },
  interact: {
    tap: { scale: 0.9, rotate: -3, transition: spring(640, 14) },
  },
}

const romance: AnimationPreset = {
  accent: '#ff79c6',
  overlay: 'vignette',
  entry: {
    initial: { opacity: 0, scale: 0.7, y: 30 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] },
    },
  },
  idle: {
    animate: {
      scale: [1, 1.025, 1],
      filter: ['drop-shadow(0 0 0 rgba(255,121,198,0))', 'drop-shadow(0 0 14px rgba(255,121,198,0.55))', 'drop-shadow(0 0 0 rgba(255,121,198,0))'],
      transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: { exit: { opacity: 0, scale: 0.85, transition: { duration: 0.3 } } },
  interact: { tap: { scale: 0.94, transition: spring(380, 18) } },
}

const thriller: AnimationPreset = {
  accent: '#3aa9ff',
  overlay: 'vignette',
  entry: {
    initial: { opacity: 0, y: -40, filter: 'blur(6px)' },
    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  },
  idle: {
    animate: {
      x: [0, 1.5, -1.5, 0],
      transition: { duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: { exit: { opacity: 0, y: 20, filter: 'blur(6px)', transition: { duration: 0.3 } } },
  interact: { tap: { scale: 0.93, transition: spring(440, 20) } },
}

const animation: AnimationPreset = {
  accent: '#7ed957',
  overlay: 'rarity-glow',
  entry: {
    initial: { opacity: 0, scale: 0.3, rotate: -25 },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: 'spring', stiffness: 340, damping: 11 },
    },
  },
  idle: {
    animate: {
      rotate: [0, 2, -2, 0],
      scale: [1, 1.03, 1],
      transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  exit: { exit: { opacity: 0, scale: 0.4, rotate: 25, transition: { duration: 0.3 } } },
  interact: {
    tap: { scale: 0.85, rotate: -8, transition: spring(580, 12) },
  },
}

const documentary: AnimationPreset = {
  accent: '#c8c0a8',
  overlay: 'none',
  entry: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.45 } },
  },
  idle: { animate: {} },
  exit: { exit: { opacity: 0, transition: { duration: 0.25 } } },
  interact: { tap: { scale: 0.97, transition: spring(280, 26) } },
}

const defaultPreset: AnimationPreset = {
  accent: '#ffffff',
  overlay: 'none',
  entry: {
    initial: { opacity: 0, y: 28, scale: 0.94 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: spring(320, 22),
    },
  },
  idle: { animate: {} },
  exit: { exit: { opacity: 0, scale: 0.94, transition: { duration: 0.25 } } },
  interact: { tap: { scale: 0.95, transition: spring(380, 22) } },
}

/** Reduced-motion fallback — opacity only, no idle. */
export const reducedMotionPreset: AnimationPreset = {
  accent: '#ffffff',
  overlay: 'none',
  entry: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
  },
  idle: { animate: {} },
  exit: { exit: { opacity: 0, transition: { duration: 0.15 } } },
  interact: { tap: { opacity: 0.85, transition: { duration: 0.1 } } },
}

const REGISTRY: Record<Genre, AnimationPreset> = {
  Horror: horror,
  Comedy: comedy,
  Drama: drama,
  'Sci-Fi': sciFi,
  Action: action,
  Romance: romance,
  Thriller: thriller,
  Animation: animation,
  Documentary: documentary,
  Default: defaultPreset,
}

export function getAnimationPreset(genre: string | undefined): AnimationPreset {
  if (!genre) return defaultPreset
  // Normalize a few common variants
  const g = genre.trim()
  if (g === 'Science Fiction' || g === 'Sci Fi' || g === 'Sci-fi') return sciFi
  if (g === 'Animated') return animation
  return REGISTRY[g as Genre] ?? defaultPreset
}

/** Pick the most "characterful" genre from a list (priority order). */
const PRIORITY: Genre[] = [
  'Horror',
  'Sci-Fi',
  'Animation',
  'Action',
  'Thriller',
  'Comedy',
  'Romance',
  'Drama',
  'Documentary',
]

export function pickPrimaryGenre(genres: string[] | undefined): Genre {
  if (!genres?.length) return 'Default'
  for (const g of PRIORITY) {
    if (genres.includes(g)) return g
  }
  // try fuzzy
  const lower = genres.map((g) => g.toLowerCase())
  if (lower.some((g) => g.includes('sci'))) return 'Sci-Fi'
  if (lower.some((g) => g.includes('anim'))) return 'Animation'
  return 'Default'
}
