import { motion, type MotionValue, useTransform } from 'framer-motion'
import type { OverlayKind } from '../../types'

interface Props {
  kind: OverlayKind
  accent: string
  /** -1..1 input from tilt for holographic shift */
  tiltX?: MotionValue<number>
  tiltY?: MotionValue<number>
}

/**
 * Stacked overlay layer rendered above the poster but below UI badges.
 * The kind picks one of several treatments. Holographic shifts with tilt.
 */
export function CardOverlay({ kind, accent, tiltX, tiltY }: Props) {
  if (kind === 'none') return null

  if (kind === 'vignette') {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 110%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)',
        }}
      />
    )
  }

  if (kind === 'rarity-glow') {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl mix-blend-screen"
        style={{
          background: `radial-gradient(60% 90% at 50% 0%, ${accent}55 0%, transparent 70%), radial-gradient(80% 60% at 50% 100%, ${accent}33 0%, transparent 60%)`,
        }}
      />
    )
  }

  if (kind === 'static-noise') {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          backgroundSize: '160px 160px',
        }}
      />
    )
  }

  if (kind === 'holographic') {
    // Holographic gradient that shifts with tilt
    const x = tiltX ?? null
    const y = tiltY ?? null
    const bgX = x ? useTransform(x, [-1, 1], ['10%', '90%']) : '50%'
    const bgY = y ? useTransform(y, [-1, 1], ['10%', '90%']) : '50%'
    return (
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl mix-blend-color-dodge opacity-60"
        style={{
          backgroundPositionX: bgX as unknown as string,
          backgroundPositionY: bgY as unknown as string,
          backgroundImage:
            'linear-gradient(115deg, transparent 30%, rgba(255,0,180,0.45) 40%, rgba(0,200,255,0.45) 50%, rgba(180,255,80,0.45) 60%, transparent 70%)',
          backgroundSize: '220% 220%',
        }}
      />
    )
  }

  return null
}
