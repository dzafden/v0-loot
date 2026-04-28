'use client'

import { X, Star, Plus, Check, Calendar, Tv } from 'lucide-react'
import { LootShow } from '@/lib/loot'
import { getBackdropUrl, getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface ShowDetailModalProps {
  show: LootShow
  isOwned: boolean
  onAdd: (id: number) => void
  onClose: () => void
}

export function ShowDetailModal({ show, isOwned, onAdd, onClose }: ShowDetailModalProps) {
  const backdrop = getBackdropUrl(show.backdropPath, 'w1280')
  const poster   = getPosterUrl(show.posterPath, 'w500')

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div
        className="relative bg-[#0f0f14] rounded-t-3xl overflow-hidden border-t border-white/10 max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full z-30" />

        {/* Hero backdrop */}
        <div className="relative w-full flex-shrink-0" style={{ height: 200 }}>
          {backdrop ? (
            <img src={backdrop} alt="" className="w-full h-full object-cover" aria-hidden />
          ) : (
            <img src={poster || '/placeholder-poster.jpg'} alt="" className="w-full h-full object-cover scale-110 blur-sm opacity-60" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f14] via-[#0f0f14]/60 to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-4 z-30 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-white/20 active:scale-90 transition-all"
            aria-label="Close"
          >
            <X size={18} className="text-white" />
          </button>

          {/* Poster + title */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4">
            <img
              src={poster || '/placeholder-poster.jpg'}
              alt={show.title}
              className="w-20 h-28 object-cover rounded-xl border border-white/20 flex-shrink-0 shadow-2xl"
            />
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="font-black text-white text-2xl leading-tight uppercase tracking-tight text-balance line-clamp-2">
                {show.title}
              </h2>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{show.year} &bull; {show.genre}</span>
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
              <p className="text-zinc-300 text-sm leading-relaxed font-medium">{show.overview}</p>
            </div>
          )}

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
                : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-[.98] shadow-[0_0_20px_var(--primary-glow)]'
            )}
          >
            {isOwned ? (
              <><Check size={18} strokeWidth={3} /> In Your Locker</>
            ) : (
              <><Plus size={18} strokeWidth={3} /> Claim This Show</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
