import type { CSSProperties, ReactNode } from 'react'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { Tier } from '../../types'

export const TIER_COLORS: Record<Tier, string> = {
  S: '#fb7185',
  A: '#fb923c',
  B: '#d9a92f',
  C: '#84cc16',
  D: '#38bdf8',
}

function particleUnit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function particleRange(seed: number, min: number, max: number) {
  return min + particleUnit(seed) * (max - min)
}

export function RankMark({
  tier,
  featured = false,
  compact = false,
  className,
}: {
  tier?: Tier
  featured?: boolean
  compact?: boolean
  className?: string
}) {
  if (!tier) return null
  const tierColor = TIER_COLORS[tier]
  const sizeClass = compact
    ? featured ? 'h-9 w-9 rounded-[14px] text-[17px]' : 'h-7 w-7 rounded-[10px] text-[13px]'
    : featured ? 'h-11 w-11 rounded-[17px] text-[20px]' : 'h-9 w-9 rounded-[13px] text-[16px]'
  return (
    <div
      className={cn(
        'grid place-items-center border font-black backdrop-blur-xl',
        sizeClass,
        className,
      )}
      style={{
        color: tierColor,
        borderColor: `${tierColor}40`,
        background: 'linear-gradient(180deg, rgba(18,18,22,0.96), rgba(5,5,7,0.98))',
        boxShadow: featured
          ? `0 12px 24px rgba(0,0,0,0.38), 0 0 16px ${tierColor}3a, inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 8px 18px rgba(0,0,0,0.36), 0 0 10px ${tierColor}30, inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <span>{tier}</span>
    </div>
  )
}

export function VibeBubbles({
  showId,
  vibes,
  seedOffset = 0,
  className,
}: {
  showId: number
  vibes?: string[]
  seedOffset?: number
  className?: string
}) {
  if (!vibes?.length) return null
  const particles = Array.from({ length: Math.min(9, Math.max(5, vibes.length * 3)) }, (_, index) => vibes[index % vibes.length])

  return (
    <div className={cn('pointer-events-none absolute bottom-7 right-0 h-32 w-28 overflow-visible', className)}>
      {particles.map((emoji, index) => {
        const seed = showId * 97 + seedOffset * 53 + index * 31 + emoji.codePointAt(0)!
        const originX = particleRange(seed + 1, -4, 18)
        const originY = particleRange(seed + 2, -2, 14)
        const endX = particleRange(seed + 3, -92, -18)
        const endY = particleRange(seed + 4, -126, -48)
        const drift = particleRange(seed + 5, -22, 22)
        const startScale = particleRange(seed + 6, 0.44, 0.74)
        const peakScale = particleRange(seed + 7, 1.08, 1.38)
        const endScale = particleRange(seed + 8, 0.72, 1.12)
        const rotate = particleRange(seed + 9, -28, 28)
        const duration = particleRange(seed + 10, 3.1, 5.9)
        const delay = -particleRange(seed + 11, 0, duration)
        const fontSize = particleRange(seed + 12, 16, 23)
        return (
          <span
            key={`${emoji}-${index}`}
            className="absolute leading-none"
            style={{
              right: `${originX}px`,
              bottom: `${originY}px`,
              fontSize: `${fontSize}px`,
              filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.45))',
              animation: `vibe-bubble ${duration}s ease-out ${delay}s infinite`,
              ['--vibe-x']: `${endX}px`,
              ['--vibe-y']: `${endY}px`,
              ['--vibe-drift']: `${drift}px`,
              ['--vibe-start-scale']: startScale,
              ['--vibe-peak-scale']: peakScale,
              ['--vibe-end-scale']: endScale,
              ['--vibe-rotate']: `${rotate}deg`,
            } as CSSProperties}
          >
            {emoji}
          </span>
        )
      })}
    </div>
  )
}

export function CollectibleMediaCard({
  id,
  title,
  imagePath,
  imageUrl,
  imageSize = 'w342',
  logoPath,
  logoSize = 'w500',
  fallback,
  landscape = false,
  featured = false,
  tier,
  vibes,
  addSlot,
  shineSlot,
  meta,
  className,
  children,
}: {
  id: number
  title: string
  imagePath?: string | null
  imageUrl?: string
  imageSize?: 'w342' | 'w500' | 'original'
  logoPath?: string | null
  logoSize?: 'w500' | 'original'
  fallback?: ReactNode
  landscape?: boolean
  featured?: boolean
  tier?: Tier
  vibes?: string[]
  addSlot?: ReactNode
  shineSlot?: ReactNode
  meta?: ReactNode
  className?: string
  children?: ReactNode
}) {
  const artUrl = imageUrl ?? (imagePath ? imgUrl(imagePath, imageSize) : '')
  const tierColor = tier ? TIER_COLORS[tier] : '#f5c453'

  return (
    <div
      className={cn(
        'group relative h-full w-full overflow-hidden bg-[#151117] text-left shadow-[0_18px_44px_rgba(0,0,0,0.42)]',
        landscape ? 'rounded-[28px]' : 'rounded-[24px]',
        className,
      )}
      style={tier ? {
        boxShadow: `0 18px 44px rgba(0,0,0,0.42), 0 0 0 1.5px ${tierColor}a8, 0 0 28px ${tierColor}33`,
      } : undefined}
    >
      {artUrl ? (
        <img src={artUrl} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        fallback ?? <div className="absolute inset-0 grid place-items-center bg-white/[0.04] text-xl font-black text-white/26">{title.slice(0, 2).toUpperCase()}</div>
      )}
      {landscape ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/22 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-black/8" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/4 to-transparent" />
      )}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_100%,rgba(245,196,83,0.18),transparent_62%)]" />
      {tier && <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 92% 10%, ${tierColor}36, transparent 9rem)` }} />}
      {shineSlot}
      {addSlot && <div className={cn('absolute z-30', landscape ? 'bottom-3 right-3' : 'right-2 top-2')}>{addSlot}</div>}
      {tier && <RankMark tier={tier} featured={featured} className="absolute right-2 top-2 z-20" />}
      <VibeBubbles showId={id} vibes={vibes} seedOffset={featured ? 7 : 2} />
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-10', landscape ? 'top-0 flex flex-col justify-between p-4 pr-16' : 'p-3')}>
        {landscape && logoPath ? (
          <img
            src={imgUrl(logoPath, logoSize)}
            alt={title}
            loading="lazy"
            className="max-h-[68px] max-w-[62%] object-contain object-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]"
          />
        ) : null}
        {children ?? (
          <div>
            {!landscape || !logoPath ? (
              <p className={cn('font-black text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]', landscape ? 'max-w-[62%] text-2xl leading-none tracking-tight' : 'line-clamp-2 text-xs leading-tight tracking-[-0.04em]')}>
                {title}
              </p>
            ) : null}
            {meta}
          </div>
        )}
      </div>
    </div>
  )
}
