import { useMemo, useState } from 'react'
import { Play, X, Swords, Trophy, Compass } from 'lucide-react'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { progressMap, setTier } from '../../data/queries'
import type { Show, Tier } from '../../types'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'

type TierData = Record<Tier, number[]>

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']

const TIER_STYLES: Record<Tier, { bg: string; text: string; shadow: string }> = {
  S: { bg: 'bg-rose-500', text: 'text-rose-50', shadow: 'shadow-rose-500/60' },
  A: { bg: 'bg-orange-500', text: 'text-orange-50', shadow: 'shadow-orange-500/60' },
  B: { bg: 'bg-yellow-400', text: 'text-yellow-950', shadow: 'shadow-yellow-400/65' },
  C: { bg: 'bg-lime-400', text: 'text-lime-950', shadow: 'shadow-lime-400/65' },
  D: { bg: 'bg-sky-400', text: 'text-sky-950', shadow: 'shadow-sky-400/65' },
}

interface Props {
  onGoDiscover: () => void
  onOpenShow: (show: Show) => void
}

function SorterGame({
  unsorted,
  allShows,
  onFinish,
}: {
  unsorted: Show[]
  allShows: Show[]
  onFinish: () => void
}) {
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null)
  const current = unsorted[0]

  if (!current) return null

  const sorted = allShows.length - unsorted.length
  const progress = allShows.length ? (sorted / allShows.length) * 100 : 0

  async function handleTier(tier: Tier) {
    if (exitDir) return
    const dir = ['S', 'A'].includes(tier) ? 'right' : ['C', 'D'].includes(tier) ? 'left' : 'right'
    setExitDir(dir)
    setTimeout(() => {
      void setTier(current.id, tier)
      setExitDir(null)
    }, 280)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200 overflow-hidden">
      <div className="w-full flex items-center justify-between px-6 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-[#4ade80]" />
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

      <div className="w-full px-6 pb-4 flex justify-center flex-shrink-0">
        <div className="w-[70%] max-w-[220px]">
          <div className="flex justify-between items-end mb-2">
            <span className="font-black uppercase tracking-widest text-xs text-zinc-500">Progress</span>
            <span className="font-black text-sm text-[#4ade80]">
              {allShows.length - unsorted.length}/{allShows.length}
            </span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#4ade80] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0 gap-4">
        <div
          className={cn(
            'rounded-3xl overflow-hidden border border-white/15 shadow-2xl transition-all duration-300 relative',
            'h-full max-h-[360px] w-auto aspect-[2/3]',
            exitDir === 'right' && 'translate-x-[130%] rotate-[15deg] opacity-0',
            exitDir === 'left' && 'translate-x-[-130%] rotate-[-15deg] opacity-0',
          )}
        >
          {current.posterPath ? (
            <img src={imgUrl(current.posterPath, 'w500')} alt={current.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-4xl">
              {current.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-3">
            <h3 className="font-black text-white text-base uppercase tracking-tight leading-tight line-clamp-2">{current.name}</h3>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{current.year ?? '—'}</span>
          </div>
        </div>
        <h2 className="text-center text-sm font-black uppercase tracking-widest text-zinc-500 flex-shrink-0">Where does it rank?</h2>
      </div>

      <div className="w-full px-6 pb-8 pt-4 border-t border-white/10 flex-shrink-0">
        <div className="grid grid-cols-5 gap-2 mb-3">
          {TIERS.map((tier) => {
            const style = TIER_STYLES[tier]
            return (
              <button
                key={tier}
                onClick={() => void handleTier(tier)}
                className={cn('w-full aspect-square rounded-2xl font-black text-2xl flex items-center justify-center transition-transform active:scale-90 shadow-xl', style.bg, style.text, style.shadow)}
              >
                {tier}
              </button>
            )
          })}
        </div>
        <button onClick={onFinish} className="w-full text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors py-2">
          Done for now
        </button>
      </div>
    </div>
  )
}

function TierRow({ tier, shows, onOpenShow }: { tier: Tier; shows: Show[]; onOpenShow: (show: Show) => void }) {
  const [expanded, setExpanded] = useState(true)
  const style = TIER_STYLES[tier]

  return (
    <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#1a1a24] shadow-lg">
      <div className="flex items-stretch">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'w-[72px] self-stretch flex items-center justify-center flex-shrink-0 border-r border-black/20 shadow-inner transition-opacity',
            style.bg,
            style.shadow,
            !expanded && 'opacity-90',
          )}
          aria-label={`Toggle ${tier} tier`}
        >
          <span className={cn('font-black text-5xl leading-none', style.text)}>{tier}</span>
        </button>

        <div className="flex-1 min-w-0">
          {!expanded && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full h-11 px-3 flex items-center justify-end"
            >
              <span className="text-[12px] font-black tabular-nums text-white/45">{shows.length}</span>
            </button>
          )}

          {expanded && (
            <div>
              {shows.length === 0 ? (
                <p className="text-center text-white/10 font-black uppercase tracking-widest text-xs py-5">Empty</p>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-3 py-3">
                  {shows.map((show) => (
                    <button
                      key={show.id}
                      className="relative flex-shrink-0 group cursor-pointer w-[92px]"
                      onClick={() => onOpenShow(show)}
                      title="Open details"
                    >
                      <div className="w-[92px] aspect-[2/3] rounded-xl overflow-hidden border border-white/10">
                        {show.posterPath ? (
                          <img src={imgUrl(show.posterPath, 'w342')} alt={show.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                            {show.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Open</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Rankings({ onGoDiscover, onOpenShow }: Props) {
  const [sorting, setSorting] = useState(false)
  const [recentOnly, setRecentOnly] = useState(false)
  const [hideUnfinished, setHideUnfinished] = useState(false)
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const assignments = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const progressByShow = useDexieQuery(
    ['episodeProgress', 'seasonCache'],
    progressMap,
    new Map<number, { watched: number; total: number }>(),
    [],
  )

  const filteredShows = useMemo(() => {
    const now = Date.now()
    const monthMs = 30 * 24 * 60 * 60 * 1000
    return shows.filter((show) => {
      if (recentOnly && now - show.addedAt > monthMs) return false
      if (hideUnfinished) {
        const p = progressByShow.get(show.id)
        if (!p || p.total <= 0) return false
        return p.watched >= p.total
      }
      return true
    })
  }, [shows, recentOnly, hideUnfinished, progressByShow])

  const tierData = useMemo<TierData>(() => {
    const base: TierData = { S: [], A: [], B: [], C: [], D: [] }
    for (const assignment of assignments) {
      if (base[assignment.tier]) {
        base[assignment.tier].push(assignment.showId)
      }
    }
    return base
  }, [assignments])

  const sortedIds = useMemo(() => new Set(Object.values(tierData).flat()), [tierData])
  const unsorted = useMemo(
    () => filteredShows.filter((show) => !sortedIds.has(show.id)),
    [filteredShows, sortedIds],
  )
  const filteredIds = useMemo(() => new Set(filteredShows.map((s) => s.id)), [filteredShows])

  return (
    <>
      <div className="flex flex-col min-h-full pb-28">
        <div className="sticky top-0 z-30 bg-[#0f0f13]/85 backdrop-blur-xl border-b border-white/5 pt-5 pb-3 px-4" />

        <div className="px-4 pt-4 pb-6 flex flex-col">
          <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setRecentOnly((v) => !v)}
              className={cn(
                'h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap border',
                recentOnly ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-zinc-400 border-white/10',
              )}
            >
              Recent
            </button>
            <button
              onClick={() => setHideUnfinished((v) => !v)}
              className={cn(
                'h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap border',
                hideUnfinished ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-zinc-400 border-white/10',
              )}
            >
              Hide Unfinished
            </button>
          </div>

          {unsorted.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-[#4ade80] to-emerald-600 rounded-[24px] p-[2px] shadow-[0_0_20px_rgba(74,222,128,0.2)]">
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
          )}

          <div className="flex flex-col gap-3 pb-8">
            {filteredShows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                <Trophy size={56} strokeWidth={1.5} className="text-zinc-500" />
                <div className="text-center">
                  <p className="font-black text-xl uppercase tracking-tight text-white">
                    {shows.length === 0 ? 'No Shows Yet' : 'No Matches'}
                  </p>
                  <button onClick={onGoDiscover} className="mt-2 bg-white/10 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-colors inline-flex items-center gap-1.5">
                    <Compass size={13} /> Discover
                  </button>
                </div>
              </div>
            ) : (
              TIERS.map((tier) => {
                const ids = tierData[tier]
                const tierShows = ids
                  .filter((id) => filteredIds.has(id))
                  .map((id) => filteredShows.find((show) => show.id === id))
                  .filter(Boolean) as Show[]
                return <TierRow key={tier} tier={tier} shows={tierShows} onOpenShow={onOpenShow} />
              })
            )}
          </div>
        </div>
      </div>

      {sorting && (
        <SorterGame unsorted={unsorted} allShows={filteredShows} onFinish={() => setSorting(false)} />
      )}
    </>
  )
}
