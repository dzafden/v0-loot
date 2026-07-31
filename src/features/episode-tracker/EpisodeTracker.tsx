import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Show } from '../../types'
import { db } from '../../data/db'
import { getSeason, getShowDetail, imgUrl } from '../../lib/tmdb'
import { cacheSeason, progressKey, setEpisodeWatched, setSeasonWatched } from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/utils'

interface Props {
  show: Show
  onClose: () => void
}

type SeasonMeta = {
  name: string
  posterPath: string | null
}

export function EpisodeTracker({ show, onClose }: Props) {
  const reducedMotion = useReducedMotion()
  const seasons = useDexieQuery(
    ['seasonCache'],
    () => db.seasonCache.where({ showId: show.id }).sortBy('seasonNumber'),
    [],
    [show.id],
  )
  const progress = useDexieQuery(
    ['episodeProgress'],
    () => db.episodeProgress.where({ showId: show.id }).toArray(),
    [],
    [show.id],
  )
  const watchedSet = useMemo(() => new Set(progress.filter((p) => p.watched).map((p) => p.key)), [progress])
  const [loading, setLoading] = useState(true)
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [busySeason, setBusySeason] = useState<number | null>(null)
  const [bulkBusy, setBulkBusy] = useState<null | 'mark' | 'unmark'>(null)
  const [seasonMeta, setSeasonMeta] = useState<Map<number, SeasonMeta>>(new Map())
  const openedInitialSeason = useRef(false)

  // Fetch missing seasons on mount/update (handles partial caches)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const detail = await getShowDetail(show.id)
        if (cancelled) return
        setSeasonMeta(new Map(detail.seasons
          .filter((s) => s.season_number !== 0)
          .map((s): [number, SeasonMeta] => [s.season_number, { name: s.name, posterPath: s.poster_path ?? null }]),
        ))
        const firstSeasonNumber = detail.seasons.find((season) => season.season_number !== 0)?.season_number
        if (!openedInitialSeason.current && firstSeasonNumber !== undefined) {
          setOpenSeasons(new Set([firstSeasonNumber]))
          openedInitialSeason.current = true
        }
        const cachedSeasons = await db.seasonCache.where({ showId: show.id }).toArray()
        const cachedSeasonNumbers = new Set(cachedSeasons.map((s) => s.seasonNumber))
        const cachedByNumber = new Map(cachedSeasons.map((s) => [s.seasonNumber, s]))
        for (const s of detail.seasons) {
          if (s.season_number === 0) continue // skip specials by default
          const cachedSeason = cachedByNumber.get(s.season_number)
          if (cachedSeason && (!cachedSeason.posterPath || !cachedSeason.name)) {
            await cacheSeason({
              ...cachedSeason,
              name: cachedSeason.name ?? s.name,
              posterPath: cachedSeason.posterPath ?? s.poster_path ?? null,
            })
          }
          if (cachedSeasonNumbers.has(s.season_number)) continue
          const data = await getSeason(show.id, s.season_number)
          if (cancelled) return
          await cacheSeason({
            key: `${show.id}-${s.season_number}`,
            showId: show.id,
            seasonNumber: s.season_number,
            name: data.name ?? s.name,
            posterPath: data.poster_path ?? s.poster_path ?? null,
            episodes: data.episodes.map((e) => ({
              episode_number: e.episode_number,
              name: e.name,
              still_path: e.still_path ?? null,
            })),
            fetchedAt: Date.now(),
          })
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [show.id])

  const totalEps = seasons.reduce((s, x) => s + x.episodes.length, 0)
  const watchedEps = progress.filter((p) => p.watched).length
  const allDone = totalEps > 0 && watchedEps >= totalEps
  const heroImage = show.backdropPath ?? show.posterPath ?? null

  // Trigger confetti when transition to all done
  useEffect(() => {
    if (allDone && !reducedMotion) {
      const start = window.setTimeout(() => setConfetti(true), 0)
      const end = window.setTimeout(() => setConfetti(false), 2200)
      return () => {
        window.clearTimeout(start)
        window.clearTimeout(end)
      }
    }
  }, [allDone, reducedMotion])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const toggleSeason = (n: number) => {
    setOpenSeasons((s) => {
      const next = new Set(s)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const markAll = async (watched: boolean) => {
    if (!seasons.length) return
    setBulkBusy(watched ? 'mark' : 'unmark')
    try {
      for (const s of seasons) {
        await setSeasonWatched(
          show.id,
          s.seasonNumber,
          s.episodes.map((x) => x.episode_number),
          watched,
        )
      }
    } finally {
      setBulkBusy(null)
    }
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      className="fixed inset-0 z-[60] flex justify-center bg-[#030406]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="episode-tracker-title"
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: 16 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }}
        className="relative flex h-svh min-h-0 w-full max-w-md flex-col overflow-hidden bg-[#0f0f13] shadow-[0_0_80px_rgba(0,0,0,0.72)]"
      >
        <div className="relative z-20 h-[clamp(220px,32svh,270px)] shrink-0 overflow-hidden border-b border-white/[0.06] bg-black">
          {heroImage ? (
            <img
              src={imgUrl(heroImage, show.backdropPath ? 'original' : 'w500')}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
              aria-hidden
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/34 to-black/12" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-[#0f0f13]/38 to-black/16" />
          <div className="relative z-10 flex h-full flex-col justify-between px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full bg-black/42 text-white/88 backdrop-blur-xl ring-1 ring-white/[0.1] active:scale-95"
                aria-label="Back"
              >
                <ChevronLeft size={22} />
              </button>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/54">Episode progress</p>
              <h2 id="episode-tracker-title" className="max-w-[330px] text-[36px] font-black leading-[0.88] tracking-[-0.075em] text-white text-balance">{show.name}</h2>
              <p className="mt-2 text-sm font-semibold text-white/62">
                {totalEps ? `${watchedEps}/${totalEps} episodes watched` : 'Loading episodes...'}
              </p>
              {totalEps > 0 && (
                <div className="mt-4 h-2 rounded-full bg-white/[0.12] overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${(watchedEps / totalEps) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => void markAll(true)}
                  disabled={bulkBusy !== null || allDone}
                  className="h-11 rounded-[16px] bg-emerald-300/18 px-4 text-xs font-bold text-emerald-200 ring-1 ring-emerald-200/12 disabled:opacity-40 active:scale-[0.98]"
                >
                  {bulkBusy === 'mark' ? 'Marking…' : 'Mark all'}
                </button>
                <button
                  onClick={() => void markAll(false)}
                  disabled={bulkBusy !== null || watchedEps === 0}
                  className="h-11 rounded-[16px] bg-white/[0.09] px-4 text-xs font-bold text-white/72 ring-1 ring-white/[0.06] disabled:opacity-40 active:scale-[0.98]"
                >
                  {bulkBusy === 'unmark' ? 'Clearing…' : 'Clear all'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-[max(2.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
          {error && <p className="px-4 py-3 text-sm text-rose-300">{error}</p>}
          {loading && !seasons.length && (
            <p className="px-4 py-6 text-sm text-white/50">Fetching seasons from TMDB…</p>
          )}
          {seasons.map((s) => {
            const open = openSeasons.has(s.seasonNumber)
            const seasonWatched = s.episodes.filter((e) =>
              watchedSet.has(progressKey(show.id, s.seasonNumber, e.episode_number)),
            ).length
            const meta = seasonMeta.get(s.seasonNumber)
            const posterPath = s.posterPath ?? meta?.posterPath ?? null
            const seasonName = s.name ?? meta?.name ?? `Season ${s.seasonNumber}`
            const seasonComplete = s.episodes.length > 0 && seasonWatched === s.episodes.length
            const seasonPercent = s.episodes.length > 0 ? (seasonWatched / s.episodes.length) * 100 : 0
            return (
              <div key={s.key} className={cn('border-b border-white/5 transition-colors', open && 'bg-white/[0.025]')}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <button
                    onClick={() => toggleSeason(s.seasonNumber)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]"
                    aria-expanded={open}
                    aria-controls={`season-${show.id}-${s.seasonNumber}`}
                  >
                    <span className="relative h-[84px] w-[58px] shrink-0 overflow-hidden rounded-[14px] bg-white/[0.06] shadow-[0_14px_28px_rgba(0,0,0,0.32)] ring-1 ring-white/[0.08]">
                      {posterPath ? (
                        <img src={imgUrl(posterPath, 'w185')} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                      ) : show.backdropPath ? (
                        <img src={imgUrl(show.backdropPath, 'w342')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" loading="lazy" />
                      ) : null}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-transparent" />
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-black uppercase tracking-[-0.02em] text-white">S{s.seasonNumber}</span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[21px] font-black leading-none tracking-[-0.045em] text-white">{seasonName}</span>
                      <span className="mt-1.5 block text-[13px] text-white/50">{seasonWatched}/{s.episodes.length} episodes</span>
                      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <motion.span
                          initial={false}
                          animate={{ width: `${seasonPercent}%` }}
                          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                          className="block h-full rounded-full bg-emerald-300"
                        />
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => {
                        const allWatched = seasonWatched === s.episodes.length
                        setBusySeason(s.seasonNumber)
                        void setSeasonWatched(show.id, s.seasonNumber, s.episodes.map((x) => x.episode_number), !allWatched)
                          .finally(() => setBusySeason(null))
                      }}
                      disabled={busySeason === s.seasonNumber}
                      aria-label={seasonComplete ? `Clear ${seasonName}` : `Mark all episodes in ${seasonName}`}
                      className={cn(
                        'min-h-9 rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-50',
                        seasonComplete ? 'bg-white/[0.1] text-white/62' : 'bg-emerald-400/18 text-emerald-200',
                      )}
                    >
                      {busySeason === s.seasonNumber
                        ? 'Saving…'
                        : seasonComplete
                          ? 'Clear'
                          : 'Mark all'}
                    </button>
                    <button
                      onClick={() => toggleSeason(s.seasonNumber)}
                      className="grid h-9 w-8 place-items-center text-white/70 active:scale-90"
                      aria-label={open ? `Collapse ${seasonName}` : `Expand ${seasonName}`}
                      aria-expanded={open}
                      aria-controls={`season-${show.id}-${s.seasonNumber}`}
                    >
                      <ChevronRight size={19} className={cn('transition-transform', open && 'rotate-90')} />
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      id={`season-${show.id}-${s.seasonNumber}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="divide-y divide-white/5">
                        {s.episodes.map((e) => {
                          const key = progressKey(show.id, s.seasonNumber, e.episode_number)
                          const watched = watchedSet.has(key)
                          return (
                            <li key={key}>
                              <button
                                onClick={() =>
                                  void setEpisodeWatched(
                                    show.id,
                                    s.seasonNumber,
                                    e.episode_number,
                                    !watched,
                                  )
                                }
                                className="flex min-h-12 w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[0.03]"
                                aria-pressed={watched}
                                aria-label={`${watched ? 'Mark unwatched' : 'Mark watched'}: ${seasonName}, episode ${e.episode_number}, ${e.name}`}
                              >
                                <span
                                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${
                                    watched
                                      ? 'bg-emerald-400 border-emerald-300 text-emerald-950'
                                      : 'border-white/30'
                                  }`}
                                >
                                  <AnimatePresence>
                                    {watched && (
                                      <motion.span
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0 }}
                                      >
                                        <Check size={14} strokeWidth={3.2} />
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </span>
                                <span className="w-8 shrink-0 text-xs tabular-nums text-white/45">
                                  {s.seasonNumber}×{String(e.episode_number).padStart(2, '0')}
                                </span>
                                <span className={cn('min-w-0 flex-1 text-[15px] leading-snug transition-colors', watched ? 'text-white/56' : 'text-white/90')}>
                                  {e.name}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <Confetti show={confetti} />
      </motion.div>
    </motion.div>
  )
}

function Confetti({ show }: { show: boolean }) {
  if (!show) return null
  const pieces = Array.from({ length: 36 })
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const x = (i * 47) % 101
        const delay = (i % 7) * 0.055
        const dur = 1.4 + (i % 5) * 0.15
        const colors = ['#ff4d4d', '#ffd84a', '#7ed957', '#4af0ff', '#a259ff', '#ff79c6']
        const c = colors[i % colors.length]
        return (
          <motion.span
            key={i}
            className="absolute top-0 h-2 w-2 rounded-sm"
            style={{ left: `${x}%`, background: c }}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: 720 }}
            transition={{ duration: dur, delay, ease: 'easeIn' }}
          />
        )
      })}
    </div>
  )
}
