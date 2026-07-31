import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, X, Trophy, Compass, Filter, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { progressMap, setTier } from '../../data/queries'
import type { Show, Tier } from '../../types'
import { getShowImages, imgUrl, type TmdbImageAsset } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import { ImdbBadge } from '../../components/ui/ImdbBadge'
import { getVibeTitle } from '../../lib/vibe-engine'
import { getTraditionDisplayLabel } from '../../lib/animation-taxonomy'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { rankGlyphStyle } from '../../components/show/CollectibleMediaCard'

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
const sorterLogoCache = new Map<number, string | null>()

function bestSorterLogo(items: TmdbImageAsset[] = []) {
  return [...items]
    .filter((item) => item.iso_639_1 === 'en' || item.iso_639_1 === null)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]?.file_path ?? null
}

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

function SorterGame({ queue, tierShows, onFinish }: { queue: Show[]; tierShows: Record<Tier, Show[]>; onFinish: () => void }) {
  const reducedMotion = useReducedMotion()
  const sessionQueue = useRef(queue).current
  const advanceTimer = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  const [hoverTier, setHoverTier] = useState<Tier | null>(null)
  const [settlingTier, setSettlingTier] = useState<Tier | null>(null)
  const [lastPlacement, setLastPlacement] = useState<null | { show: Show; tier: Tier; index: number }>(null)
  const [cardVisible, setCardVisible] = useState(true)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const current = sessionQueue[index] ?? null
  const currentIndex = current ? index : -1
  const activeTier = settlingTier ?? hoverTier ?? 'S'
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

  useEffect(() => {
    if (!current) return
    const cached = sorterLogoCache.get(current.id)
    if (cached !== undefined) {
      setLogoPath(cached)
      return
    }
    let cancelled = false
    setLogoPath(null)
    getShowImages(current.id, current.mediaType)
      .then((images) => {
        const next = bestSorterLogo(images.logos)
        sorterLogoCache.set(current.id, next)
        if (!cancelled) setLogoPath(next)
      })
      .catch(() => {
        sorterLogoCache.set(current.id, null)
        if (!cancelled) setLogoPath(null)
      })
    return () => { cancelled = true }
  }, [current])

  async function place(tier: Tier) {
    if (!current || settlingTier) return
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    const placedShow = current
    const placedIndex = currentIndex
    setHoverTier(tier)
    setSettlingTier(tier)
    await setTier(placedShow.id, tier)
    setLastPlacement({ show: placedShow, tier, index: placedIndex })
    advanceTimer.current = window.setTimeout(() => {
      jumpTo(placedIndex + 1)
    }, 260)
  }

  const jumpTo = (nextIndex: number) => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    setCardVisible(false)
    window.setTimeout(() => {
      setHoverTier(null)
      setSettlingTier(null)
      setIndex(nextIndex)
      window.requestAnimationFrame(() => setCardVisible(true))
    }, 40)
  }

  const skip = () => {
    if (!current || settlingTier) return
    jumpTo(currentIndex + 1)
  }

  async function undoLast() {
    if (!lastPlacement) return
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    await setTier(lastPlacement.show.id, null)
    setIndex(lastPlacement.index)
    setHoverTier(null)
    setSettlingTier(null)
    setLastPlacement(null)
  }

  if (!current) return null

  const displayShow = current
  const bg = displayShow?.backdropPath ?? null
  const comparisonShows = tierShows[activeTier].filter((show) => show.id !== displayShow.id).slice(0, 6)
  const vibeLabel = getVibeTitle(displayShow.vibeIds?.[0]) ?? getTraditionDisplayLabel(displayShow.tradition) ?? displayShow.rawGenres?.find((genre) => genre !== 'Animation')

  return (
    <div className="fixed inset-0 z-50 bg-[#050507]/98 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200 overflow-hidden">
      <AnimatePresence mode="wait">
        {bg && (
          <motion.img
            key={displayShow.id}
            src={imgUrl(bg, 'original')}
            alt=""
            initial={reducedMotion ? false : { opacity: 0, scale: 1.16, filter: 'blur(22px)' }}
            animate={{ opacity: 0.24, scale: reducedMotion ? 1 : 1.1, filter: reducedMotion ? 'blur(12px)' : 'blur(12px)' }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 1.06, filter: 'blur(26px)' }}
            transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black/58 via-[#050507]/72 to-[#050507]" />
      <div className="absolute inset-x-0 bottom-0 h-[300px] bg-gradient-to-t from-black via-black/88 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-300" style={{ background: activeGlow }} />

      <div className="relative z-10 flex items-center justify-between px-5 pt-10 pb-2 flex-shrink-0">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/36">Place in your canon</p>
          <p className="mt-1 text-sm font-black text-white/82">{index + 1} of {sessionQueue.length}</p>
        </div>
        <button onClick={onFinish} className="grid h-11 w-11 place-items-center rounded-full bg-black/54 text-white/84 ring-1 ring-white/[0.1] backdrop-blur-xl active:scale-95">
          <X size={22} />
        </button>
      </div>

      <div className="relative z-10 flex-shrink-0 px-5 pt-2">
        <div className="rounded-[22px] bg-black/32 px-3 py-2.5 ring-1 ring-white/[0.08] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.17em]" style={{ color: TIER_STYLES[activeTier].color }}>
              Already in {activeTier}
            </span>
            <span className="text-[9px] font-black text-white/30">{tierShows[activeTier].length}</span>
          </div>
          {comparisonShows.length ? (
            <div className="flex h-14 items-center pl-1">
              {comparisonShows.map((show, occupantIndex) => (
                <button
                  key={show.id}
                  className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[10px] bg-black shadow-[0_8px_18px_rgba(0,0,0,0.44)] ring-2 ring-[#111014]"
                  style={{ marginLeft: occupantIndex ? '-8px' : 0, transform: `rotate(${(occupantIndex - 2.5) * 1.3}deg)`, zIndex: occupantIndex }}
                  title={show.name}
                >
                  {show.posterPath ? <img src={imgUrl(show.posterPath, 'w185')} alt={show.name} className="h-full w-full object-cover" /> : <span>{show.name.slice(0, 1)}</span>}
                </button>
              ))}
              <span className="ml-3 text-[11px] font-semibold text-white/42">Compare before you place it.</span>
            </div>
          ) : (
            <div className="flex h-14 items-center text-[11px] font-semibold text-white/34">This tier is yours to define.</div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-2 min-h-0">
        <AnimatePresence initial={false}>
          {cardVisible && (
          <motion.div
            key={displayShow.id}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.965, filter: 'blur(7px)' }}
            animate={{ opacity: 1, y: reducedMotion || settlingTier ? 0 : [0, -5, 0], scale: settlingTier ? 1.025 : 1, filter: 'blur(0px)' }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.975, filter: 'blur(7px)' }}
            whileTap={!settlingTier ? { scale: 1.045, y: -16, rotate: 1.2 } : undefined}
            transition={{
              y: reducedMotion || settlingTier ? { duration: 0.16 } : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.12 },
              scale: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.12 },
            }}
            className="relative w-[54vw] max-w-[238px] min-w-[190px] aspect-[2/3] overflow-hidden rounded-[30px] bg-black shadow-[0_38px_110px_rgba(0,0,0,0.78)]"
            style={{ boxShadow: `0 36px 110px rgba(0,0,0,0.78), 0 0 0 1px rgba(255,255,255,0.12), 0 0 42px ${activeGlow}, inset 0 0 0 ${activeTier ? 2 : 1}px ${activeColor}` }}
          >
            {displayShow.posterPath ? (
              <img src={imgUrl(displayShow.posterPath, 'w500')} alt={displayShow.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-5xl font-black text-white/34">
                {displayShow.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/5" />
          </motion.div>
          )}
        </AnimatePresence>
        {!logoPath && <h2 className="mt-2 max-w-[290px] text-center text-[19px] font-black leading-tight tracking-[-0.05em] text-white text-balance">{displayShow.name}</h2>}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.13em] text-white/50">
          <ImdbBadge showId={displayShow.id} compact />
          {displayShow.year && <span>{displayShow.year}</span>}
          {vibeLabel && <span>{vibeLabel}</span>}
        </div>
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
                    'grid h-20 place-items-center rounded-[24px] transition-all active:scale-95 disabled:cursor-default border backdrop-blur-xl',
                    active && 'scale-[1.045]',
                  )}
                  style={{
                    background: active
                      ? `linear-gradient(180deg, ${style.color}3d, rgba(8,8,10,0.96))`
                      : `linear-gradient(180deg, rgba(18,18,22,0.96), rgba(5,5,7,0.98))`,
                    borderColor: active ? `${style.color}99` : `${style.color}44`,
                    boxShadow: active
                      ? `0 18px 42px rgba(0,0,0,0.52), 0 0 28px ${style.color}55, inset 0 1px 0 rgba(255,255,255,0.16)`
                      : `0 14px 30px rgba(0,0,0,0.46), 0 0 14px ${style.color}24, inset 0 1px 0 rgba(255,255,255,0.08)`,
                  }}
                >
                  <span className="block text-[43px] leading-none tracking-[-0.08em]" style={rankGlyphStyle(tier)}>
                    {tier}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void undoLast()}
              disabled={!lastPlacement || Boolean(settlingTier)}
              className="h-11 rounded-[17px] bg-black/72 text-[10px] font-black uppercase tracking-widest text-white/82 ring-1 ring-white/[0.07] disabled:opacity-30 disabled:active:scale-100 active:scale-[0.98]"
            >
              {lastPlacement ? `Undo ${lastPlacement.tier}` : 'Undo'}
            </button>
            <button
              onClick={skip}
              disabled={Boolean(settlingTier)}
              className="h-11 rounded-[17px] bg-black/72 text-[10px] font-black uppercase tracking-widest text-white/82 ring-1 ring-white/[0.07] disabled:opacity-30 active:scale-[0.98]"
            >
              Skip
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function TierRow({ tier, shows, onOpenShow }: { tier: Tier; shows: Show[]; onOpenShow: (show: Show) => void }) {
  const style = TIER_STYLES[tier]
  const [expanded, setExpanded] = useState(false)
  const visibleShows = expanded ? shows : shows.slice(0, 8)

  if (shows.length === 0) {
    return (
      <div className="flex h-11 items-center gap-3 rounded-[18px] px-3 ring-1 ring-white/[0.05]" style={{ background: `linear-gradient(90deg, ${style.color}16, rgba(255,255,255,0.018))` }}>
        <span className="w-6 text-center text-[25px] leading-none tracking-[-0.08em]" style={rankGlyphStyle(tier, true)}>{tier}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/24">Empty tier</span>
      </div>
    )
  }

  return (
    <div
      className="relative w-fit max-w-full overflow-hidden rounded-[25px] bg-white/[0.032] shadow-[0_18px_46px_rgba(0,0,0,0.32)]"
      style={{
        boxShadow: `inset 0 0 0 1px ${style.color}2f, 0 12px 34px rgba(0,0,0,0.28)`,
        background: `linear-gradient(90deg, ${style.color}22, rgba(255,255,255,0.028) 30%, rgba(255,255,255,0.016))`,
      }}
    >
      <div className="flex min-h-[116px] items-stretch">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="relative z-10 flex w-[54px] flex-shrink-0 flex-col items-center justify-center gap-1 self-stretch active:scale-95"
          aria-label={expanded ? `Collapse ${tier} tier` : `Expand ${tier} tier`}
        >
          <span className="text-[46px] leading-[0.8] tracking-[-0.08em]" style={rankGlyphStyle(tier)}>{tier}</span>
          <span className="text-[9px] font-black tabular-nums text-white/48">{shows.length}</span>
        </button>
        <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className={cn('relative flex w-max items-center px-3 transition-all', expanded ? 'min-h-[146px] py-3' : 'min-h-[116px] py-2')}>
              {visibleShows.map((show) => (
                <button
                  key={show.id}
                  className={cn('relative flex-shrink-0 group cursor-pointer transition-transform hover:-translate-y-1 active:scale-[0.96]', expanded ? 'w-[82px]' : 'w-[72px]')}
                  style={{ marginLeft: show === visibleShows[0] ? 0 : expanded ? '-10px' : '-14px' }}
                  onClick={() => onOpenShow(show)}
                  title={show.name}
                >
                  <div
                    className={cn('aspect-[2/3] overflow-hidden bg-black shadow-[0_14px_28px_rgba(0,0,0,0.38)]', expanded ? 'w-[82px] rounded-[17px]' : 'w-[72px] rounded-[16px]')}
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
                  className="ml-2 grid h-[72px] w-[42px] flex-shrink-0 place-items-center rounded-[16px] bg-black/36 text-[10px] font-black text-white/58 ring-1 ring-white/[0.06]"
                >
                  +{shows.length - visibleShows.length}
                </button>
              )}
            </div>
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

  const tierShows = useMemo<Record<Tier, Show[]>>(() => {
    const byId = new Map(shows.map((show) => [show.id, show]))
    return Object.fromEntries(TIERS.map((tier) => [tier, tierData[tier].map((id) => byId.get(id)).filter(Boolean)])) as Record<Tier, Show[]>
  }, [shows, tierData])
  const rankedShows = useMemo(() => TIERS.flatMap((tier) => tierShows[tier]), [tierShows])
  const mostRankedVibe = useMemo(() => {
    const counts = new Map<string, number>()
    rankedShows.forEach((show) => {
      const label = getVibeTitle(show.vibeIds?.[0]) ?? getTraditionDisplayLabel(show.tradition)
      if (label) counts.set(label, (counts.get(label) ?? 0) + 1)
    })
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
  }, [rankedShows])

  const filteredIds = useMemo(() => new Set(filteredShows.map((s) => s.id)), [filteredShows])
  const rankingQueue = useMemo(
    () => filteredShows
      .filter((show) => !tierByShow.has(show.id))
      .sort(prioritySort(progressByShow, tierByShow)),
    [filteredShows, progressByShow, tierByShow],
  )

  return (
    <>
      <div className="relative flex flex-col min-h-full pb-40 overflow-hidden">
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
            ) : assignments.length === 0 ? (
              <div className="flex min-h-[58svh] flex-col items-center justify-center px-7 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-[28px] bg-white/[0.04] text-[#f5c453] ring-1 ring-white/[0.07]">
                  <Trophy size={34} strokeWidth={1.7} />
                </div>
                <h1 className="mt-6 text-[30px] font-black tracking-[-0.07em] text-white">Build your canon</h1>
                <p className="mt-2 max-w-[280px] text-[14px] font-semibold leading-relaxed text-white/42">Place each title from S to D by comparing it with the favorites already on your shelves.</p>
                <button onClick={() => setSorting(true)} disabled={!rankingQueue.length} className="mt-7 flex h-14 min-w-[220px] items-center justify-center gap-2 rounded-[22px] bg-[#f5c453] px-6 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[0_18px_42px_rgba(245,196,83,0.2)] active:scale-[0.98] disabled:opacity-40">
                  <Play size={16} className="fill-black" /> Start ranking
                </button>
              </div>
            ) : (
              <>
              {TIERS.map((tier) => {
                const ids = tierData[tier]
                const tierShows = ids
                  .filter((id) => filteredIds.has(id))
                  .map((id) => filteredShows.find((show) => show.id === id))
                  .filter(Boolean) as Show[]
                return <TierRow key={tier} tier={tier} shows={tierShows} onOpenShow={onOpenShow} />
              })}
              <section className="mt-2 rounded-[26px] bg-white/[0.028] p-4 ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/34"><Sparkles size={13} /> Your canon</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[18px] bg-black/24 p-3"><span className="block text-[25px] font-black text-white">{rankedShows.length}</span><span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">Ranked titles</span></div>
                  <div className="rounded-[18px] bg-black/24 p-3"><span className="block truncate text-[16px] font-black text-[#f5c453]">{mostRankedVibe ?? 'Finding it'}</span><span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">Most-ranked vibe</span></div>
                </div>
              </section>
              {rankingQueue.length > 0 && (
                <button onClick={() => setSorting(true)} className="mt-1 flex min-h-[82px] w-full items-center justify-between rounded-[26px] bg-white/[0.045] px-4 text-left ring-1 ring-white/[0.07] active:scale-[0.99]">
                  <span>
                    <span className="block text-[16px] font-black tracking-[-0.03em] text-white">Keep ranking</span>
                    <span className="mt-1 block text-[10px] font-bold text-white/34">{rankingQueue.length} title{rankingQueue.length === 1 ? '' : 's'} waiting</span>
                  </span>
                  <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#f5c453] text-black"><Play size={17} className="fill-black" /></span>
                </button>
              )}
              </>
            )}
          </div>
        </div>
      </div>

      {sorting && rankingQueue.length > 0 && (
        <SorterGame queue={rankingQueue} tierShows={tierShows} onFinish={() => setSorting(false)} />
      )}
    </>
  )
}
