'use client'

import { useState } from 'react'
import { Play, X, ChevronDown, Swords, Trophy } from 'lucide-react'
import { LootShow, TierData, TIER_STYLES, TIERS, Tier } from '@/lib/loot'
import { getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface RankingsScreenProps {
  ownedShows: LootShow[]
  tierData: TierData
  onSort: (showId: number, tier: Tier) => void
  onRemoveFromTier: (showId: number, tier: Tier) => void
}

// ── Sorter game ──────────────────────────────────────────────────────────────

function SorterGame({
  unsorted,
  onSort,
  onFinish,
  allShows,
}: {
  unsorted: LootShow[]
  onSort: (showId: number, tier: Tier) => void
  onFinish: () => void
  allShows: LootShow[]
}) {
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null)
  const current = unsorted[0]

  if (!current) return null

  const sorted   = allShows.length - unsorted.length
  const progress = allShows.length ? (sorted / allShows.length) * 100 : 0
  const poster   = getPosterUrl(current.posterPath, 'w500')

  function handleTier(tier: Tier) {
    if (exitDir) return
    // S/A = slide right, C/D = slide left, B = straight up
    const dir = ['S', 'A'].includes(tier) ? 'right' : ['C', 'D'].includes(tier) ? 'left' : 'right'
    setExitDir(dir)
    setTimeout(() => {
      onSort(current.id, tier)
      setExitDir(null)
    }, 280)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/97 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-primary" />
          <h2 className="text-xl font-black uppercase tracking-[0.15em] text-white">Rank It</h2>
        </div>
        <button
          onClick={onFinish}
          className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90"
          aria-label="Exit sorter"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-black text-zinc-600 uppercase tracking-widest">
            {unsorted.length} left to rank
          </span>
          <span className="text-[11px] font-black text-primary uppercase tracking-widest">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Poster card */}
      <div className="flex-1 flex items-center justify-center px-10">
        <div
          className={cn(
            'w-full max-w-[280px] aspect-[2/3] rounded-3xl overflow-hidden border border-white/15 shadow-2xl transition-all duration-280',
            exitDir === 'right' && 'translate-x-[120%] rotate-[15deg] opacity-0',
            exitDir === 'left'  && 'translate-x-[-120%] rotate-[-15deg] opacity-0',
            !exitDir            && 'translate-x-0 rotate-0 opacity-100'
          )}
          style={{ transition: exitDir ? 'all 280ms cubic-bezier(0.4,0,0.2,1)' : undefined }}
        >
          <img
            src={poster || '/placeholder-poster.jpg'}
            alt={current.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-4">
            <h3 className="font-black text-white text-lg uppercase tracking-tight leading-tight line-clamp-2 text-balance">
              {current.title}
            </h3>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{current.year}</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <p className="text-center text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">
        Where does this show belong?
      </p>

      {/* Tier buttons */}
      <div className="px-5 pb-10">
        <div className="grid grid-cols-5 gap-2">
          {TIERS.map(tier => {
            const style = TIER_STYLES[tier]
            return (
              <button
                key={tier}
                onClick={() => handleTier(tier)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl font-black transition-all duration-150 active:scale-90',
                  style.bg,
                  style.text,
                  style.shadow
                )}
              >
                <span className="text-2xl leading-none">{tier}</span>
                <span className="text-[8px] uppercase tracking-widest opacity-70">Tier</span>
              </button>
            )
          })}
        </div>
        <button
          onClick={onFinish}
          className="w-full mt-3 text-zinc-600 text-[11px] font-black uppercase tracking-widest hover:text-white transition-colors py-2"
        >
          Done for now
        </button>
      </div>
    </div>
  )
}

// ── Tier row ─────────────────────────────────────────────────────────────────

function TierRow({
  tier,
  shows,
  onRemove,
}: {
  tier: Tier
  shows: LootShow[]
  onRemove: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const style = TIER_STYLES[tier]

  return (
    <div className={cn('rounded-2xl overflow-hidden border', style.border, 'bg-surface-raised')}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-0 text-left"
      >
        {/* Tier label slab */}
        <div className={cn(
          'w-16 self-stretch flex items-center justify-center flex-shrink-0 flex-col gap-0.5',
          style.bg
        )}>
          <span className={cn('font-black text-3xl leading-none', style.text)}>{tier}</span>
          <span className={cn('text-[8px] font-black uppercase tracking-widest opacity-60', style.text)}>tier</span>
        </div>

        {/* Row meta */}
        <div className="flex-1 flex items-center justify-between px-4 py-3.5">
          <span className="font-black text-white uppercase tracking-tight">{style.label}</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black text-zinc-500">{shows.length} show{shows.length !== 1 ? 's' : ''}</span>
            <ChevronDown
              size={16}
              className={cn('text-zinc-600 transition-transform duration-200', expanded && 'rotate-180')}
            />
          </div>
        </div>
      </button>

      {/* Poster strip */}
      {expanded && (
        <div className="border-t border-white/5">
          {shows.length === 0 ? (
            <p className="text-center text-zinc-700 font-black uppercase tracking-widest text-xs py-5">
              No shows ranked here yet
            </p>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-3 py-3">
              {shows.map(show => {
                const poster = getPosterUrl(show.posterPath, 'w342')
                return (
                  <div
                    key={show.id}
                    className="relative flex-shrink-0 group cursor-pointer"
                    style={{ width: 72 }}
                    onClick={() => onRemove(show.id)}
                  >
                    {/* Poster at proper 2:3 ratio */}
                    <div className="w-[72px] aspect-[2/3] rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={poster || '/placeholder-poster.jpg'}
                        alt={show.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Remove overlay */}
                    <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <X size={18} className="text-white" />
                    </div>
                    {/* Title under poster */}
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-tight leading-tight mt-1 text-center line-clamp-2">
                      {show.title}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function RankingsScreen({ ownedShows, tierData, onSort, onRemoveFromTier }: RankingsScreenProps) {
  const [sorting, setSorting] = useState(false)

  const sortedIds  = Object.values(tierData).flat()
  const unsorted   = ownedShows.filter(s => !sortedIds.includes(s.id))
  const totalRanked = sortedIds.length

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="px-4 pt-10 pb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
                Rankings
              </h1>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mt-1">
                {totalRanked} shows ranked
              </p>
            </div>

            {unsorted.length > 0 && (
              <button
                onClick={() => setSorting(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-200 active:scale-95 bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.45)] hover:brightness-110"
              >
                <Play size={13} className="fill-white" />
                Sort ({unsorted.length})
              </button>
            )}
          </div>

          {/* Unranked strip */}
          {unsorted.length > 0 && (
            <div className="mt-3 bg-surface-raised rounded-2xl p-3 border border-rose-500/25">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2.5">
                {unsorted.length} unranked show{unsorted.length !== 1 ? 's' : ''} waiting
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {unsorted.slice(0, 8).map(s => (
                  <div key={s.id} className="w-10 flex-shrink-0">
                    <div className="w-10 aspect-[2/3] rounded-lg overflow-hidden border border-white/10">
                      <img
                        src={getPosterUrl(s.posterPath, 'w185') || '/placeholder-poster.jpg'}
                        alt={s.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
                {unsorted.length > 8 && (
                  <div className="w-10 flex-shrink-0">
                    <div className="w-10 aspect-[2/3] rounded-lg bg-surface-overlay border border-white/10 flex items-center justify-center">
                      <span className="text-[9px] font-black text-zinc-500">+{unsorted.length - 8}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tier rows */}
        <div className="flex-1 px-4 pb-8 flex flex-col gap-3">
          {ownedShows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 gap-4 opacity-40">
              <Trophy size={56} strokeWidth={1.5} className="text-zinc-500" />
              <div className="text-center">
                <p className="font-black text-xl uppercase tracking-tight text-white">No Shows Yet</p>
                <p className="text-sm font-bold text-zinc-600 mt-1">Claim shows from the Shop first!</p>
              </div>
            </div>
          ) : (
            TIERS.map(tier => {
              const ids   = tierData[tier]
              const shows = ids.map(id => ownedShows.find(s => s.id === id)).filter(Boolean) as LootShow[]
              return (
                <TierRow
                  key={tier}
                  tier={tier}
                  shows={shows}
                  onRemove={(id) => onRemoveFromTier(id, tier)}
                />
              )
            })
          )}
        </div>
      </div>

      {sorting && (
        <SorterGame
          unsorted={unsorted}
          onSort={onSort}
          onFinish={() => setSorting(false)}
          allShows={ownedShows}
        />
      )}
    </>
  )
}
