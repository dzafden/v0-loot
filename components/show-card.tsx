'use client'

import { useState, useRef } from 'react'
import { Check, Plus, Star } from 'lucide-react'
import { LootShow } from '@/lib/loot'
import { getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface ShowCardProps {
  show: LootShow
  isOwned?: boolean
  onAdd?: (id: number) => void
  onCardClick?: (show: LootShow) => void
  compact?: boolean
  actionType?: 'add' | 'none'
  className?: string
}

export function ShowCard({
  show,
  isOwned = false,
  onAdd,
  onCardClick,
  compact = false,
  actionType = 'add',
  className,
}: ShowCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [flashing, setFlashing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (compact) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const xRot = 8 * ((y - rect.height / 2) / (rect.height / 2))
    const yRot = -8 * ((x - rect.width / 2) / (rect.width / 2))
    setTilt({ x: xRot, y: yRot })
  }

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isOwned && actionType === 'add') {
      setFlashing(true)
      setTimeout(() => setFlashing(false), 400)
      onAdd?.(show.id)
    }
  }

  const posterUrl = getPosterUrl(show.posterPath, compact ? 'w342' : 'w500')

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative group cursor-pointer w-full z-10 transition-transform duration-150 active:scale-95',
        compact ? 'aspect-[2/3]' : 'aspect-[2/3]',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={() => onCardClick?.(show)}
      style={{
        transform: compact
          ? 'none'
          : `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
    >
      {/* Card shell */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 overflow-hidden flex flex-col bg-[#0f0f14]',
          flashing && 'animate-pulse brightness-150'
        )}
      >
        {/* Shine sweep overlay */}
        {!compact && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20 overflow-hidden rounded-2xl">
            <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-shine" />
          </div>
        )}

        {/* Poster */}
        <div className="relative overflow-hidden bg-black h-full w-full">
          <img
            src={posterUrl || '/placeholder-poster.jpg'}
            alt={show.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Rating pill — top right */}
          {!compact && (
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-black/70 backdrop-blur px-2 py-0.5 rounded-full">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-white text-[10px] font-black">{show.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Owned checkmark */}
          {isOwned && !compact && (
            <div className="absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check size={12} strokeWidth={3} className="text-primary-foreground" />
            </div>
          )}

          {/* Bottom info overlay (full card only) */}
          {!compact && (
            <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-3 px-3">
              <div className="flex items-end justify-between gap-2">
                <div className="flex flex-col overflow-hidden min-w-0">
                  <h3 className="font-black text-white text-sm leading-tight uppercase tracking-tight line-clamp-2 text-balance">
                    {show.title}
                  </h3>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 truncate">
                    {show.year} &bull; {show.genre}
                  </span>
                </div>

                {actionType === 'add' && (
                  <button
                    aria-label={isOwned ? 'Already in collection' : `Add ${show.title}`}
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-xl font-black transition-all duration-200 flex items-center justify-center',
                      isOwned
                        ? 'bg-white/10 text-white/40 cursor-default'
                        : 'bg-primary text-primary-foreground hover:brightness-110 hover:scale-105 active:scale-95 shadow-lg'
                    )}
                    onClick={handleAdd}
                  >
                    {isOwned ? <Check size={14} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
