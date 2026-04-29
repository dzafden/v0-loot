'use client'

import { useState } from 'react'
import { Play, X, ChevronDown, Swords, Trophy, Compass, Share } from 'lucide-react'
import { LootShow, TierData, TIER_STYLES, TIERS, Tier } from '@/lib/loot'
import { getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface RankingsScreenProps {
  ownedShows: LootShow[]
  tierData: TierData
  onSort: (showId: number, tier: Tier) => void
  onRemoveFromTier: (showId: number, tier: Tier) => void
  onGoDiscover: () => void
}

// ── Sorter game ───────────────────────────────────────────────────────────────

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

  const sorted = allShows.length - unsorted.length
  const progress = allShows.length ? (sorted / allShows.length) * 100 : 0
  const poster = getPosterUrl(current.posterPath, 'w500')

  function handleTier(tier: Tier) {
    if (exitDir) return
    const dir = ['S', 'A'].includes(tier) ? 'right' : ['C', 'D'].includes(tier) ? 'left' : 'right'
    setExitDir(dir)
    setTimeout(() => {
      onSort(current.id, tier)
      setExitDir(null)
    }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200 overflow-hidden">

      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-6 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-primary" />
          <span className="font-black uppercase tracking-[0.15em] text-white text-base">Ranking Queue</span>
        </div>
        <button
          onClick={onFinish}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all"
          aria-label="Exit sorter"
        >
          <X size={22} className="text-white" />
        </button>
      </div>

      {/* Progress */}
      <div className="w-full px-6 pb-4 flex justify-center flex-shrink-0">
        <div className="w-[70%] max-w-[220px]">
          <div className="flex justify-between items-end mb-2">
            <span className="font-black uppercase tracking-widest text-xs text-zinc-500">Progress</span>
            <span className="font-black text-sm text-primary">{allShows.length - unsorted.length}/{allShows.length}</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Poster — fills remaining space between progress and buttons */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0 gap-4">
        <div
          className={cn(
            'rounded-3xl overflow-hidden border border-white/15 shadow-2xl transition-all duration-300 relative',
            'h-full max-h-[360px] w-auto aspect-[2/3]',
            exitDir === 'right' && 'translate-x-[130%] rotate-[15deg] opacity-0',
            exitDir === 'left' && 'translate-x-[-130%] rotate-[-15deg] opacity-0',
            !exitDir && 'translate-x-0 rotate-0 opacity-100'
          )}
        >
          <img
            src={poster || '/placeholder-poster.jpg'}
            alt={current.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-3">
            <h3 className="font-black text-white text-base uppercase tracking-tight leading-tight line-clamp-2">
              {current.title}
            </h3>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{current.year}</span>
          </div>
        </div>

        <h2 className="text-center text-sm font-black uppercase tracking-widest text-zinc-500 flex-shrink-0">
          Where does it rank?
        </h2>
      </div>

      {/* Bottom buttons — always anchored to bottom */}
      <div className="w-full px-6 pb-8 pt-4 border-t border-white/10 flex-shrink-0">
        <div className="grid grid-cols-5 gap-2 mb-3">
          {TIERS.map(tier => {
            const style = TIER_STYLES[tier]
            return (
              <button
                key={tier}
                onClick={() => handleTier(tier)}
                className={cn(
                  'w-full aspect-square rounded-2xl font-black text-2xl flex items-center justify-center transition-transform active:scale-90 shadow-xl',
                  style.bg, style.text, style.shadow
                )}
              >
                {tier}
              </button>
            )
          })}
        </div>
        <button
          onClick={onFinish}
          className="w-full text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors py-2"
        >
          Done for now
        </button>
      </div>
    </div>
  )

  // ── Tier row ──────────────────────────────────────────────────────────────────

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
      <div className={cn('rounded-2xl overflow-hidden border border-white/5 bg-[#1a1a24] shadow-lg min-h-[80px]')}>
        {/* Row header */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-0 text-left"
        >
          {/* Tier slab */}
          <div className={cn(
            'w-16 self-stretch flex items-center justify-center flex-shrink-0 border-r border-black/20',
            style.bg, style.shadow
          )}>
            <span className={cn('font-black text-4xl leading-none', style.text)}>{tier}</span>
          </div>
          {/* Meta */}
          <div className="flex-1 flex items-center justify-between px-4 py-3">
            <span className="font-black text-white uppercase tracking-tight">{style.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-zinc-500">{shows.length}</span>
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
              <p className="text-center text-white/10 font-black uppercase tracking-widest text-xs py-5">
                Empty
              </p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-3 py-3">
                {shows.map(show => {
                  const poster = getPosterUrl(show.posterPath, 'w342')
                  return (
                    <div
                      key={show.id}
                      className="relative flex-shrink-0 group cursor-pointer w-[72px]"
                      onClick={() => onRemove(show.id)}
                    >
                      <div className="w-[72px] aspect-[2/3] rounded-xl overflow-hidden border border-white/10">
                        <img
                          src={poster || '/placeholder-poster.jpg'}
                          alt={show.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <X size={18} className="text-white" />
                      </div>
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

  export function RankingsScreen({ ownedShows, tierData, onSort, onRemoveFromTier, onGoDiscover }: RankingsScreenProps) {
    const [sorting, setSorting] = useState(false)

    const sortedIds = Object.values(tierData).flat()
    const unsorted = ownedShows.filter(s => !sortedIds.includes(s.id))
    const totalRanked = sortedIds.length
    const sTierCount = tierData.S.length
    const topHeavyPct = totalRanked > 0
      ? Math.round(((tierData.S.length + tierData.A.length) / totalRanked) * 100)
      : 0

    return (
      <>
        <div className="flex flex-col min-h-full">
          {/* Header */}
          <div className="sticky top-0 z-30 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5 pt-10 pb-4 px-4">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Rankings</h1>
          </div>

          <div className="p-4 flex flex-col">
            {/* Action banner */}
            {unsorted.length > 0 ? (
              <div className="mb-6 bg-gradient-to-r from-primary to-emerald-600 rounded-[24px] p-[2px] shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                <div className="bg-[#0f0f13]/90 backdrop-blur-md rounded-[22px] p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-white uppercase tracking-widest text-sm">Unranked Shows</h3>
                    <p className="text-emerald-300 text-xs font-bold mt-1 uppercase tracking-widest">{unsorted.length} waiting to be ranked</p>
                  </div>
                  <button
                    onClick={() => setSorting(true)}
                    className="bg-white text-black px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 flex items-center gap-2 shadow-lg"
                  >
                    <Play size={14} className="fill-black" /> Rank Now
                  </button>
                </div>
              </div>
            ) : ownedShows.length === 0 ? (
              <div className="mb-6 bg-[#1a1a24] rounded-[24px] p-[2px] border border-white/10">
                <div className="bg-[#0f0f13] rounded-[22px] p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-white uppercase tracking-widest text-sm">Nothing to Rank</h3>
                    <p className="text-zinc-500 text-xs font-bold mt-1 uppercase tracking-widest">Go find some shows!</p>
                  </div>
                  <button
                    onClick={onGoDiscover}
                    className="bg-white/10 text-white px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    <Compass size={14} /> Discover
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 bg-[#1a1a24] rounded-[24px] p-[2px] border border-white/10">
                <div className="bg-[#0f0f13] rounded-[22px] p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-white uppercase tracking-widest text-sm">All Caught Up!</h3>
                    <p className="text-primary text-xs font-bold mt-1 uppercase tracking-widest">0 Unranked Shows</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Trophy size={18} className="text-primary" />
                  </div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#1a1a24] p-4 rounded-[20px] border border-white/5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shows Ranked</span>
                <p className="text-3xl font-black mt-1 text-white">{totalRanked}</p>
              </div>
              <div className="bg-[#1a1a24] p-4 rounded-[20px] border border-white/5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Top Heavy</span>
                <p className="text-3xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                  {topHeavyPct}%
                </p>
              </div>
              <div className="col-span-2 bg-gradient-to-r from-rose-500/20 to-transparent p-4 rounded-[20px] border border-rose-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest">S-Tier Shows</span>
                  <p className="text-xl font-black mt-1 text-white">{sTierCount} Masterpiece{sTierCount !== 1 ? 's' : ''}</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all">
                  <Share size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* Tier list */}
            <div className="flex flex-col gap-3 pb-8">
              {ownedShows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                  <Trophy size={56} strokeWidth={1.5} className="text-zinc-500" />
                  <div className="text-center">
                    <p className="font-black text-xl uppercase tracking-tight text-white">No Shows Yet</p>
                    <p className="text-sm font-bold text-zinc-600 mt-1">Claim shows from Discover first</p>
                  </div>
                </div>
              ) : (
                TIERS.map(tier => {
                  const ids = tierData[tier]
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
