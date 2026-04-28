'use client'

import { useState } from 'react'
import { Package, Filter } from 'lucide-react'
import { LootShow } from '@/lib/loot'
import { ShowCard } from '@/components/show-card'
import { cn } from '@/lib/utils'

interface LockerScreenProps {
  ownedShows: LootShow[]
  totalShows: number
}

type SortKey = 'date' | 'rating' | 'alpha'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'date', label: 'Newest' },
  { id: 'rating', label: 'Rating' },
  { id: 'alpha', label: 'A–Z' },
]

export function LockerScreen({ ownedShows, totalShows }: LockerScreenProps) {
  const [sort, setSort] = useState<SortKey>('date')
  const [filterOpen, setFilterOpen] = useState(false)

  const sorted = [...ownedShows].sort((a, b) => {
    switch (sort) {
      case 'rating': return b.rating - a.rating
      case 'alpha':  return a.title.localeCompare(b.title)
      default:       return b.id - a.id
    }
  })

  const pct = Math.round((ownedShows.length / Math.max(totalShows, 1)) * 100)

  const avgRating = ownedShows.length
    ? (ownedShows.reduce((acc, s) => acc + s.rating, 0) / ownedShows.length).toFixed(1)
    : '—'

  const topShow = [...ownedShows].sort((a, b) => b.rating - a.rating)[0]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-10 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
              My Locker
            </h1>
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mt-1">
              {ownedShows.length} / {totalShows} Collected
            </p>
          </div>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border',
              filterOpen
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface-raised text-zinc-400 border-white/10'
            )}
          >
            <Filter size={12} />
            Sort
          </button>
        </div>

        {/* Stats card */}
        <div className="bg-surface-raised rounded-2xl p-4 border border-white/10 flex flex-col gap-3 mb-4">
          {/* Progress bar */}
          <div className="flex justify-between items-center">
            <span className="font-black text-white uppercase tracking-tight text-sm">Collection</span>
            <span className="font-black text-primary text-lg">{pct}%</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-white">{ownedShows.length}</span>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Shows</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-yellow-400">{avgRating}</span>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Avg Rating</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-black text-xl text-primary">{pct}%</span>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sort panel */}
      {filterOpen && (
        <div className="mx-4 mb-4 bg-surface-raised rounded-2xl border border-white/10 p-4 animate-in slide-in-from-top-2 duration-200">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">Sort By</p>
          <div className="flex gap-2">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSort(opt.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all',
                  sort === opt.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-overlay text-zinc-500 hover:text-white'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 px-4 pb-8">
        {ownedShows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 opacity-40">
            <Package size={56} strokeWidth={1.5} className="text-zinc-500" />
            <div className="text-center">
              <p className="font-black text-xl uppercase tracking-tight text-white">Locker Empty</p>
              <p className="text-sm font-bold text-zinc-600 mt-1">Hit the Shop to claim your first show!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {sorted.map(show => (
              <ShowCard key={show.id} show={show} isOwned actionType="none" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
