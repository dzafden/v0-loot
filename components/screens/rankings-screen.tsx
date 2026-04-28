'use client'

import { useState } from 'react'
import { Play, X, ChevronDown, Swords, Trophy } from 'lucide-react'
import { LootShow, TierData, TIER_STYLES, TIERS, Tier } from '@/lib/loot'
import { ShowCard } from '@/components/show-card'
import { getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface RankingsScreenProps {
  ownedShows: LootShow[]
  tierData: TierData
  onSort: (showId: number, tier: Tier) => void
  onRemoveFromTier: (showId: number, tier: Tier) => void
}

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
  const [exitClass, setExitClass] = useState(false)
  const current = unsorted[0]

  if (!current) return null

  function handleTier(tier: Tier) {
    if (exitClass) return
    setExitClass(true)
    setTimeout(() => {
      onSort(current.id, tier)
      setExitClass(false)
    }, 280)
  }

  const totalToSort = unsorted.length
  const sorted = allShows.length - totalToSort
  const progress = allShows.length ? (sorted / allShows.length) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
      {/* Close */}
      <button
        onClick={onFinish}
        className="absolute top-6 right-6 p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90"
        aria-label="Exit sorter"
      >
        <X size={22} className="text-white" />
      </button>

      {/* Title */}
      <div className="text-center mb-2">
        <div className="flex items-center gap-2 justify-center mb-1">
          <Swords size={18} className="text-primary" />
          <h2 className="text-2xl font-black uppercase tracking-[0.15em] text-white">Rank It</h2>
          <Swords size={18} className="text-primary" />
        </div>
        <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
          Where does this show belong?
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-[300px] mb-6">
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right mt-1">
          {totalToSort} remaining
        </p>
      </div>

      {/* Current card */}
      <div
        className={cn(
          'w-full max-w-[260px] transition-all duration-280',
          exitClass ? 'card-exit' : 'opacity-100 scale-100'
        )}
      >
        <ShowCard show={current} actionType="none" />
      </div>

      {/* Tier buttons */}
      <div className="mt-8 flex gap-3 flex-wrap justify-center w-full max-w-[320px]">
        {TIERS.map(tier => {
          const style = TIER_STYLES[tier]
          return (
            <button
              key={tier}
              onClick={() => handleTier(tier)}
              className={cn(
                'w-[58px] h-[58px] rounded-2xl font-black text-3xl flex items-center justify-center transition-all duration-150 active:scale-90',
                style.bg,
                style.text,
                style.shadow
              )}
            >
              {tier}
            </button>
          )
        })}
      </div>

      {/* Skip row */}
      <button
        onClick={onFinish}
        className="mt-6 text-zinc-600 text-[11px] font-black uppercase tracking-widest hover:text-white transition-colors"
      >
        Done for now
      </button>
    </div>
  )
}

export function RankingsScreen({ ownedShows, tierData, onSort, onRemoveFromTier }: RankingsScreenProps) {
  const [sorting, setSorting] = useState(false)
  const [expandedTiers, setExpandedTiers] = useState<Record<Tier, boolean>>({
    S: true, A: true, B: true, C: true, D: true
  })

  const sortedIds = Object.values(tierData).flat()
  const unsorted = ownedShows.filter(s => !sortedIds.includes(s.id))
  const totalRanked = sortedIds.length

  function toggleTier(tier: Tier) {
    setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))
  }

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
                {totalRanked} Shows Ranked
              </p>
            </div>

            {unsorted.length > 0 && (
              <button
                onClick={() => setSorting(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-200 active:scale-95',
                  'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.45)] hover:brightness-110'
                )}
              >
                <Play size={14} className="fill-white" />
                Sort ({unsorted.length})
              </button>
            )}
          </div>

          {/* Unsorted preview strip */}
          {unsorted.length > 0 && (
            <div className="mt-3 bg-surface-raised rounded-2xl p-3 border border-rose-500/30">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">
                Unranked Loot — {unsorted.length} show{unsorted.length !== 1 ? 's' : ''} waiting
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {unsorted.slice(0, 8).map(s => (
                  <div key={s.id} className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
                    <img src={getPosterUrl(s.posterPath, 'w185')} alt={s.title} className="w-full h-full object-cover" />
                  </div>
                ))}
                {unsorted.length > 8 && (
                  <div className="w-10 h-14 flex-shrink-0 rounded-lg bg-surface-overlay border border-white/10 flex items-center justify-center">
                    <span className="text-[10px] font-black text-zinc-500">+{unsorted.length - 8}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tiers */}
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
              const ids = tierData[tier]
              const style = TIER_STYLES[tier]
              const isExpanded = expandedTiers[tier]

              return (
                <div
                  key={tier}
                  className="bg-surface-raised rounded-2xl border border-white/10 overflow-hidden"
                >
                  {/* Tier header */}
                  <button
                    onClick={() => toggleTier(tier)}
                    className="w-full flex items-center gap-0 text-left"
                  >
                    <div className={cn('w-14 self-stretch flex items-center justify-center font-black text-4xl flex-shrink-0', style.bg, style.text, style.shadow)}>
                      {tier}
                    </div>
                    <div className="flex-1 flex items-center justify-between px-3 py-3">
                      <span className="font-black text-white uppercase tracking-tight text-sm">{style.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-zinc-600">{ids.length}</span>
                        <ChevronDown
                          size={16}
                          className={cn('text-zinc-600 transition-transform duration-200', isExpanded ? 'rotate-180' : '')}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Shows */}
                  {isExpanded && (
                    <div className={cn(
                      'border-t border-white/5',
                      ids.length === 0 ? 'px-4 py-4' : 'p-3'
                    )}>
                      {ids.length === 0 ? (
                        <p className="text-center text-zinc-700 font-black uppercase tracking-widest text-xs">
                          Empty — rank some shows above
                        </p>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {ids.map(id => {
                            const show = ownedShows.find(s => s.id === id)
                            if (!show) return null
                            return (
                              <div
                                key={id}
                                className="w-[72px] flex-shrink-0 relative group cursor-pointer"
                                onClick={() => onRemoveFromTier(id, tier)}
                              >
                                <ShowCard show={show} compact actionType="none" />
                                <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                  <X size={20} className="text-white" />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
