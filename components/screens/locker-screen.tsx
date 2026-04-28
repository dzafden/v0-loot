'use client'

import { useState } from 'react'
import { Package, Filter, SortAsc, X, Star } from 'lucide-react'
import { LootShow, RARITIES, Rarity } from '@/lib/loot'
import { ShowCard } from '@/components/show-card'
import { cn } from '@/lib/utils'

interface LockerScreenProps {
  ownedShows: LootShow[]
  totalShows: number
}

type SortKey = 'date' | 'rating' | 'rarity' | 'alpha'
type FilterRarity = Rarity | 'all'

const RARITY_ORDER: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 }

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'date', label: 'Newest' },
  { id: 'rating', label: 'Rating' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'alpha', label: 'A–Z' },
]

const FILTER_OPTIONS: { id: FilterRarity; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'legendary', label: 'Legendary' },
  { id: 'epic', label: 'Epic' },
  { id: 'rare', label: 'Rare' },
  { id: 'common', label: 'Common' },
]

function RarityBar({ shows }: { shows: LootShow[] }) {
  const counts: Record<Rarity, number> = { legendary: 0, epic: 0, rare: 0, common: 0 }
  shows.forEach(s => counts[s.rarity]++)
  const total = shows.length || 1

  return (
    <div className="flex gap-1 h-1.5 rounded-full overflow-hidden w-full">
      {(['legendary', 'epic', 'rare', 'common'] as Rarity[]).map(r => {
        const pct = (counts[r] / total) * 100
        if (!pct) return null
        return (
          <div
            key={r}
            className={cn(RARITIES[r].bg, 'transition-all duration-500')}
            style={{ width: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}

export function LockerScreen({ ownedShows, totalShows }: LockerScreenProps) {
  const [sort, setSort] = useState<SortKey>('date')
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = ownedShows
    .filter(s => filterRarity === 'all' || s.rarity === filterRarity)
    .sort((a, b) => {
      switch (sort) {
        case 'rating': return b.rating - a.rating
        case 'rarity': return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
        case 'alpha': return a.title.localeCompare(b.title)
        default: return b.id - a.id
      }
    })

  const pct = Math.round((ownedShows.length / Math.max(totalShows, 1)) * 100)

  const counts: Record<Rarity, number> = { legendary: 0, epic: 0, rare: 0, common: 0 }
  ownedShows.forEach(s => counts[s.rarity]++)

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
              filterOpen || filterRarity !== 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface-raised text-zinc-400 border-white/10'
            )}
          >
            <Filter size={12} />
            Filter
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-surface-raised rounded-2xl p-4 border border-white/10 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-black text-white uppercase tracking-tight text-sm">Collection Progress</span>
            <span className="font-black text-primary text-lg">{pct}%</span>
          </div>
          <RarityBar shows={ownedShows} />
          {/* Rarity counts */}
          <div className="grid grid-cols-4 gap-2">
            {(['legendary', 'epic', 'rare', 'common'] as Rarity[]).map(r => (
              <div key={r} className="flex flex-col items-center gap-0.5">
                <span className={cn('font-black text-base', RARITIES[r].text)}>{counts[r]}</span>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{RARITIES[r].name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter/Sort panel */}
      {filterOpen && (
        <div className="mx-4 mb-4 bg-surface-raised rounded-2xl border border-white/10 p-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
          <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Sort By</p>
            <div className="flex gap-2 flex-wrap">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSort(opt.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest transition-all',
                    sort === opt.id ? 'bg-primary text-primary-foreground' : 'bg-surface-overlay text-zinc-500 hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Rarity</p>
            <div className="flex gap-2 flex-wrap">
              {FILTER_OPTIONS.map(opt => {
                const r = opt.id !== 'all' ? RARITIES[opt.id as Rarity] : null
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFilterRarity(opt.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border',
                      filterRarity === opt.id
                        ? r ? cn(r.bg, r.id === 'legendary' || r.id === 'common' ? 'text-black' : 'text-white', 'border-transparent') : 'bg-primary text-primary-foreground border-transparent'
                        : 'bg-surface-overlay text-zinc-500 border-white/5 hover:text-white'
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-center opacity-50">
              <p className="font-black text-lg uppercase tracking-tight text-white">No {filterRarity} Shows</p>
              <button onClick={() => setFilterRarity('all')} className="text-primary text-sm font-bold mt-2 uppercase tracking-widest">
                Clear Filter
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(show => (
              <ShowCard key={show.id} show={show} isOwned actionType="none" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
