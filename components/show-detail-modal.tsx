'use client'

import { X, Star, Zap, Plus, Check, Calendar, Tv } from 'lucide-react'
import { LootShow, RARITIES } from '@/lib/loot'
import { getBackdropUrl, getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface ShowDetailModalProps {
  show: LootShow
  isOwned: boolean
  onAdd: (id: number) => void
  onClose: () => void
}

export function ShowDetailModal({ show, isOwned, onAdd, onClose }: ShowDetailModalProps) {
  const rarity = RARITIES[show.rarity]
  const backdrop = getBackdropUrl(show.backdropPath, 'w1280')
  const poster = getPosterUrl(show.posterPath, 'w500')

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative bg-[#0f0f14] rounded-t-3xl overflow-hidden border-t border-white/10 max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full z-30" />

        {/* Hero backdrop */}
        <div className="relative w-full flex-shrink-0" style={{ height: '200px' }}>
          {backdrop ? (
            <img src={backdrop} alt="" className="w-full h-full object-cover" aria-hidden />
          ) : (
            <img src={poster} alt="" className="w-full h-full object-cover scale-110 blur-sm opacity-60" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f14] via-[#0f0f14]/60 to-transparent" />
          <div className={cn('absolute inset-0 bg-gradient-to-r to-transparent opacity-30', rarity.gradient)} />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-4 z-30 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-white/20 active:scale-90 transition-all"
            aria-label="Close"
          >
            <X size={18} className="text-white" />
          </button>

          {/* Poster + title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4">
            <img
              src={poster}
              alt={show.title}
              className={cn('w-20 h-28 object-cover rounded-xl border-2 flex-shrink-0 shadow-2xl', rarity.border)}
            />
            <div className="flex-1 min-w-0 pb-1">
              {/* Rarity badge */}
              <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest mb-2', rarity.badge)}>
                <Zap size={9} />
                {rarity.name}
              </div>
              <h2 className="font-black text-white text-2xl leading-tight uppercase tracking-tight text-balance">
                {show.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-5">
          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 bg-surface-raised rounded-xl px-3 py-2 border border-white/10 flex-1 justify-center">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="font-black text-white text-base">{show.rating.toFixed(1)}</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Rating</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-raised rounded-xl px-3 py-2 border border-white/10 flex-1 justify-center">
              <Calendar size={14} className="text-blue-400" />
              <span className="font-black text-white text-base">{show.year}</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Year</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-raised rounded-xl px-3 py-2 border border-white/10 flex-1 justify-center">
              <Tv size={14} className="text-primary" />
              <span className="font-black text-white text-sm uppercase">{show.genre}</span>
            </div>
          </div>

          {/* Overview */}
          {show.overview && (
            <div>
              <h3 className="font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-2">Overview</h3>
              <p className="text-zinc-300 text-sm leading-relaxed font-medium">
                {show.overview}
              </p>
            </div>
          )}

          {/* Rarity info */}
          <div className={cn('rounded-2xl p-4 border', rarity.border, 'bg-surface-raised')}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className={rarity.text} />
              <span className={cn('font-black text-sm uppercase tracking-widest', rarity.text)}>
                {rarity.name} Drop
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-medium leading-relaxed">
              {show.rarity === 'legendary' && 'One of the all-time greats. Extremely rare to find in the wild.'}
              {show.rarity === 'epic' && 'Top-tier show with a dedicated fanbase. Hard to beat.'}
              {show.rarity === 'rare' && 'Solid show with strong ratings. Worth adding to your locker.'}
              {show.rarity === 'common' && 'A decent pick. Every great collection starts somewhere.'}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              if (!isOwned) {
                onAdd(show.id)
                onClose()
              }
            }}
            disabled={isOwned}
            className={cn(
              'w-full py-4 rounded-2xl font-black text-base uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2',
              isOwned
                ? 'bg-white/10 text-white/30 cursor-default'
                : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-98 shadow-[0_0_20px_var(--primary-glow)]'
            )}
          >
            {isOwned ? (
              <>
                <Check size={18} strokeWidth={3} />
                In Your Locker
              </>
            ) : (
              <>
                <Plus size={18} strokeWidth={3} />
                Claim This Show
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
