import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, X, Trophy, Compass, Filter } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { progressMap, setTier } from '../../data/queries'
import type { Show, Tier } from '../../types'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'

type TierData = Record<Tier, number[]>
type TierStyle = { color: string; soft: string; text: string; label: Tier }

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']
const TIER_STYLES: Record<Tier, TierStyle> = {
  S: { label: 'S', color: '#fb7185', soft: 'rgba(251,113,133,0.20)', text: 'text-rose-100' },
  A: { label: 'A', color: '#fb923c', soft: 'rgba(251,146,60,0.18)', text: 'text-orange-100' },
  B: { label: 'B', color: '#d9a92f', soft: 'rgba(217,169,47,0.17)', text: 'text-yellow-100' },
  C: { label: 'C', color: '#84cc16', soft: 'rgba(132,204,22,0.15)', text: 'text-lime-100' },
  D: { label: 'D', color: '#38bdf8', soft: 'rgba(56,189,248,0.15)', text: 'text-sky-100' },
}
const NEUTRAL_GLOW = 'rgba(255,255,255,0.07)'

interface Props {
  onGoDiscover: () => void
  onOpenShow: (show: Show) => void
}

function prioritySort(
  progressByShow: Map<number, { watched: number; total: number }>,
  tierByShow: Map<number, Tier>,
) {
  return (a: Show, b: Show) => {
    const atop = typeof a.top8Position === 'number' ? 80 - (a.top8Position ?? 0) : 0
    const btop = typeof b.top8Position === 'number' ? 80 - (b.top8Position ?? 0) : 0
    const awatched = progressByShow.get(a.id)?.watched ?? 0
    const bwatched = progressByShow.get(b.id)?.watched ?? 0
    const arankedPenalty = tierByShow.has(a.id) ? -100 : 0
    const brankedPenalty = tierByShow.has(b.id) ? -100 : 0
    const arecent = Math.max(0, 40 - (Date.now() - a.addedAt) / (1000 * 60 * 60 * 24))
    const brecent = Math.max(0, 40 - (Date.now() - b.addedAt) / (1000 * 60 * 60 * 24))
    const ascore = atop + awatched * 3 + arecent + arankedPenalty
    const bscore = btop + bwatched * 3 + brecent + brankedPenalty
    return bscore === ascore ? b.addedAt - a.addedAt : bscore - ascore
  }
}

function SorterGame({ queue, onFinish }: { queue: Show[]; onFinish: () => void }) {
  const sessionQueue = useRef(queue).current
  const advanceTimer = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  const [hoverTier, setHoverTier] = useState<Tier | null>(null)
  const [settlingTier, setSettlingTier] = useState<Tier | null>(null)
  const [lastPlacement, setLastPlacement] = useState<null | { show: Show; tier: Tier; index: number }>(null)
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const current = sessionQueue.find((show, i) => i >= index && !skipped.has(show.id))
  const currentIndex = current ? sessionQueue.findIndex((show) => show.id === current.id) : -1
  const activeTier = settlingTier ?? hoverTier
  const activeGlow = activeTier ? TIER_STYLES[activeTier].soft : NEUTRAL_GLOW
  const activeColor = activeTier ? TIER_STYLES[activeTier].color : 'rgba(255,255,255,0.14)'

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!current) onFinish()
  }, [current, onFinish])

  async function place(tier: Tier) {
    if (!current || settlingTier) return
    const placedShow = current
    const placedIndex = currentIndex
    setHoverTier(tier)
    setSettlingTier(tier)
    await setTier(placedShow.id, tier)
    setLastPlacement({ show: placedShow, tier, index: placedIndex })
    advanceTimer.current = window.setTimeout(() => {
      setIndex((value) => Math.max(value + 1, placedIndex + 1))
      window.setTimeout(() => {
        setHoverTier(null)
        setSettlingTier(null)
      }, 120)
    }, 560)
  }

  const jumpTo = (nextIndex: number) => {
    setHoverTier(null)
    setSettlingTier(null)
    setIndex(nextIndex)
  }

  const skip = () => {
    if (!current) return
    setSkipped((prev) => new Set(prev).add(current.id))
    jumpTo(Math.max(index + 1, currentIndex + 1))
  }

  async function undoLast() {
    if (!lastPlacement) return
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    await setTier(lastPlacement.show.id, null)
    setSkipped((prev) => {
      const next = new Set(prev)
      next.delete(lastPlacement.show.id)
      return next
    })
    setIndex(lastPlacement.index)
    setHoverTier(null)
    setSettlingTier(null)
    setLastPlacement(null)
  }

  if (!current) return null

  const displayShow = current
  const bg = displayShow?.backdropPath ?? null

  return (
    <div className="fixed inset-0 z-50 bg-[#050507]/98 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200 overflow-hidden">
      <AnimatePresence mode="wait">
        {bg && (
          <motion.img
            key={displayShow.id}
            src={imgUrl(bg, 'original')}
            alt=""
            initial={{ opacity: 0, scale: 1.16, filter: 'blur(22px)' }}
            animate={{ opacity: 0.24, scale: 1.1, filter: 'blur(12px)' }}
            exit={{ opacity: 0, scale: 1.06, filter: 'blur(26px)' }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black/58 via-[#050507]/72 to-[#050507]" />
      <div className="absolute inset-x-0 bottom-0 h-[300px] bg-gradient-to-t from-black via-black/88 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-300" style={{ background: activeGlow }} />

      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-2 flex-shrink-0">
        {lastPlacement ? (
          <button onClick={() => void undoLast()} className="h-10 rounded-full bg-black/62 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/78 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95">
            Undo {lastPlacement.tier}
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}
        <button onClick={onFinish} className="grid h-11 w-11 place-items-center rounded-full bg-black/54 text-white/84 ring-1 ring-white/[0.1] backdrop-blur-xl active:scale-95">
          <X size={22} />
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={displayShow.id}
            initial={{ opacity: 0, y: 36, scale: 0.88, rotateX: 9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: [0, -7, 0], scale: settlingTier ? 1.035 : 1, rotateX: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -42, scale: 0.88, rotate: -1.5, filter: 'blur(12px)' }}
            whileTap={!settlingTier ? { scale: 1.045, y: -16, rotate: 1.2 } : undefined}
            transition={{
              y: settlingTier ? { duration: 0.2 } : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.26 },
              scale: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.24 },
            }}
            className="relative w-[74vw] max-w-[335px] min-w-[245px] aspect-[2/3] overflow-hidden rounded-[38px] bg-black shadow-[0_38px_110px_rgba(0,0,0,0.78)]"
            style={{ boxShadow: `0 36px 110px rgba(0,0,0,0.78), 0 0 0 1px rgba(255,255,255,0.12), 0 0 42px ${activeGlow}, inset 0 0 0 ${activeTier ? 2 : 1}px ${activeColor}` }}
          >
            {displayShow.posterPath ? (
              <img src={imgUrl(displayShow.posterPath, 'w500')} alt={displayShow.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-5xl font-black text-white/34">
                {displayShow.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-transparent to-black/5" />
            <div className="absolute bottom-0 inset-x-0 p-5">
              <h2 className="text-3xl font-black leading-[0.88] tracking-[-0.1em] text-white text-balance">{displayShow.name}</h2>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 px-4 pb-7 flex-shrink-0">
        <motion.div key="tiers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {TIERS.map((tier) => {
              const style = TIER_STYLES[tier]
              const active = activeTier === tier
              return (
                <button
                  key={tier}
                  onPointerEnter={() => setHoverTier(tier)}
                  onPointerLeave={() => setHoverTier(null)}
                  onClick={() => void place(tier)}
                  disabled={Boolean(settlingTier)}
                  className={cn(
                    'h-20 rounded-[24px] font-black text-3xl transition-all active:scale-95 disabled:cursor-default border backdrop-blur-xl',
                    active && 'scale-[1.045]',
                  )}
                  style={{
                    color: style.color,
                    background: active
                      ? `linear-gradient(180deg, ${style.color}3d, rgba(8,8,10,0.96))`
                      : `linear-gradient(180deg, rgba(18,18,22,0.96), rgba(5,5,7,0.98))`,
                    borderColor: active ? `${style.color}99` : `${style.color}44`,
                    boxShadow: active
                      ? `0 18px 42px rgba(0,0,0,0.52), 0 0 28px ${style.color}55, inset 0 1px 0 rgba(255,255,255,0.16)`
                      : `0 14px 30px rgba(0,0,0,0.46), 0 0 14px ${style.color}24, inset 0 1px 0 rgba(255,255,255,0.08)`,
                  }}
                >
                  {tier}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={skip} className="h-11 rounded-[17px] bg-black/72 text-[10px] font-black uppercase tracking-widest text-white/82 ring-1 ring-white/[0.07]">Skip</button>
            <button onClick={skip} className="h-11 rounded-[17px] bg-black/72 text-[10px] font-black uppercase tracking-widest text-white/82 ring-1 ring-white/[0.07]">Not sure</button>
            <button onClick={onFinish} className="h-11 rounded-[17px] bg-black/72 text-[10px] font-black uppercase tracking-widest text-white/82 ring-1 ring-white/[0.07]">Later</button>
            <button onClick={onFinish} className="h-11 rounded-[17px] bg-black/72 text-[10px] font-black uppercase tracking-widest text-white/82 ring-1 ring-white/[0.07]">Stop</button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function TierRow({ tier, shows, onOpenShow }: { tier: Tier; shows: Show[]; onOpenShow: (show: Show) => void }) {
  const style = TIER_STYLES[tier]
  const [expanded, setExpanded] = useState(false)
  const visibleShows = expanded ? shows : shows.slice(0, 7)

  return (
    <div
      className="relative overflow-hidden rounded-[28px] bg-white/[0.032] shadow-[0_18px_46px_rgba(0,0,0,0.32)]"
      style={{
        boxShadow: `inset 0 0 0 1px ${style.color}2f, 0 0 34px ${style.soft}`,
        background: `linear-gradient(90deg, ${style.color}20, rgba(255,255,255,0.032) 24%, rgba(255,255,255,0.02))`,
      }}
    >
      <div className="absolute inset-y-0 left-0 w-[56px]" style={{ background: `linear-gradient(180deg, ${style.color}4d, ${style.color}12)` }} />
      <div className="flex items-stretch">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="relative z-10 w-[58px] self-stretch flex flex-col items-center justify-center gap-1 flex-shrink-0 active:scale-95"
          aria-label={expanded ? `Collapse ${tier} tier` : `Expand ${tier} tier`}
        >
          <span className="font-black text-[38px] leading-none text-white">{tier}</span>
          <span className="text-[9px] font-black tabular-nums text-white/48">{shows.length}</span>
        </button>
        <div className="flex-1 min-w-0">
          {shows.length === 0 ? (
            <div className="h-[74px]" />
          ) : (
            <div className={cn('relative flex gap-2.5 overflow-x-auto no-scrollbar px-3 transition-all', expanded ? 'py-3' : 'h-[94px] py-2')}>
              {visibleShows.map((show) => (
                <button
                  key={show.id}
                  className={cn('relative flex-shrink-0 group cursor-pointer transition-transform active:scale-[0.96]', expanded ? 'w-[86px]' : 'w-[78px]')}
                  onClick={() => onOpenShow(show)}
                  title={show.name}
                >
                  <div
                    className={cn('aspect-[2/3] overflow-hidden bg-black shadow-[0_14px_28px_rgba(0,0,0,0.38)]', expanded ? 'w-[86px] rounded-[18px]' : 'w-[78px] rounded-[17px]')}
                    style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 12px 26px rgba(0,0,0,0.42), 0 0 18px ${style.soft}` }}
                  >
                    {show.posterPath ? (
                      <img src={imgUrl(show.posterPath, 'w342')} alt={show.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                        {show.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {!expanded && shows.length > visibleShows.length && (
                <button
                  onClick={() => setExpanded(true)}
                  className="grid h-[78px] w-[44px] flex-shrink-0 place-items-center rounded-[18px] bg-black/36 text-[10px] font-black text-white/58 ring-1 ring-white/[0.06]"
                >
                  +{shows.length - visibleShows.length}
                </button>
              )}
              {!expanded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#101014]/95 to-transparent" />}
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

  const tierByShow = useMemo(() => {
    const map = new Map<number, Tier>()
    for (const assignment of assignments) map.set(assignment.showId, assignment.tier)
    return map
  }, [assignments])

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
      if (base[assignment.tier]) base[assignment.tier].push(assignment.showId)
    }
    return base
  }, [assignments])

  const filteredIds = useMemo(() => new Set(filteredShows.map((s) => s.id)), [filteredShows])
  const rankingQueue = useMemo(
    () => [...filteredShows].sort(prioritySort(progressByShow, tierByShow)),
    [filteredShows, progressByShow, tierByShow],
  )

  return (
    <>
      <div className="relative flex flex-col min-h-full pb-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-[radial-gradient(circle_at_24%_0%,rgba(255,255,255,0.08),transparent_18rem)]" aria-hidden />

        <div className="relative z-10 px-4 pt-5 pb-6 flex flex-col">
          <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.045] flex-shrink-0">
              <Filter size={14} className="text-white/34" />
            </div>
            <button onClick={() => setRecentOnly((v) => !v)} className={cn('h-9 px-3 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap', recentOnly ? 'bg-white text-black' : 'bg-white/[0.04] text-white/34')}>
              Recent
            </button>
            <button onClick={() => setHideUnfinished((v) => !v)} className={cn('h-9 px-3 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap', hideUnfinished ? 'bg-white text-black' : 'bg-white/[0.04] text-white/34')}>
              Done
            </button>
          </div>

          {rankingQueue.length > 0 && (
            <button
              onClick={() => setSorting(true)}
              className="mb-4 flex h-[76px] items-center justify-between rounded-[26px] bg-white/[0.045] px-4 text-left shadow-[0_18px_46px_rgba(0,0,0,0.32)] transition-transform active:scale-[0.98]"
            >
              <div className="flex -space-x-5 overflow-hidden">
                {rankingQueue.slice(0, 4).map((show) => (
                  <div key={show.id} className="h-16 w-11 overflow-hidden rounded-[12px] bg-black shadow-[0_10px_24px_rgba(0,0,0,0.45)] ring-2 ring-[#111014]">
                    {show.posterPath ? <img src={imgUrl(show.posterPath, 'w342')} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                ))}
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-[19px] bg-[#f5c453] text-black shadow-[0_0_20px_rgba(245,196,83,0.22)]">
                <Play size={18} className="fill-black" />
              </span>
            </button>
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

      {sorting && rankingQueue.length > 0 && (
        <SorterGame queue={rankingQueue} onFinish={() => setSorting(false)} />
      )}
    </>
  )
}
