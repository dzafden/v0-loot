import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Show } from '../../types'
import { db } from '../../data/db'
import { getSeason, getShowDetail, imgUrl } from '../../lib/tmdb'
import { cacheSeason, progressKey, setEpisodeWatched, setSeasonWatched } from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'
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
  const watchedSet = new Set(progress.filter((p) => p.watched).map((p) => p.key))
  const [loading, setLoading] = useState(false)
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [busySeason, setBusySeason] = useState<number | null>(null)
  const [bulkBusy, setBulkBusy] = useState<null | 'mark' | 'unmark'>(null)
  const [seasonMeta, setSeasonMeta] = useState<Map<number, SeasonMeta>>(new Map())

  // Fetch missing seasons on mount/update (handles partial caches)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const detail = await getShowDetail(show.id)
        if (cancelled) return
        setSeasonMeta(new Map(detail.seasons
          .filter((s) => s.season_number !== 0)
          .map((s): [number, SeasonMeta] => [s.season_number, { name: s.name, posterPath: s.poster_path ?? null }]),
        ))
        const cachedSeasonNumbers = new Set(seasons.map((s) => s.seasonNumber))
        const cachedByNumber = new Map(seasons.map((s) => [s.seasonNumber, s]))
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
  }, [show.id, seasons])

  const totalEps = seasons.reduce((s, x) => s + x.episodes.length, 0)
  const watchedEps = progress.filter((p) => p.watched).length
  const allDone = totalEps > 0 && watchedEps >= totalEps
  const heroImage = show.backdropPath ?? show.posterPath ?? null

  // Trigger confetti when transition to all done
  useEffect(() => {
    if (allDone) {
      setConfetti(true)
      const t = setTimeout(() => setConfetti(false), 2200)
      return () => clearTimeout(t)
    }
  }, [allDone])

  const toggleSeason = (n: number) => {
    setOpenSeasons((s) => {
      const next = new Set(s)
      next.has(n) ? next.delete(n) : next.add(n)
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-[#0f0f13]"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="absolute inset-0 bg-[#0f0f13] overflow-hidden flex flex-col"
      >
        <div className="relative z-20 min-h-[250px] overflow-hidden border-b border-white/[0.06] bg-black">
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
          <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-between px-4 pb-4 pt-4">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full bg-black/42 text-2xl leading-none text-white/88 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95"
                aria-label="Back"
              >
                ‹
              </button>
            </div>

            <div>
              <h2 className="max-w-[330px] text-[36px] font-black leading-[0.88] tracking-[-0.09em] text-white text-balance">{show.name}</h2>
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
                  className="h-11 px-4 rounded-[18px] text-xs font-black uppercase tracking-widest bg-emerald-300/18 text-emerald-200 ring-1 ring-emerald-200/12 disabled:opacity-40 active:scale-[0.98]"
                >
                  {bulkBusy === 'mark' ? 'Marking...' : 'Mark All'}
                </button>
                <button
                  onClick={() => void markAll(false)}
                  disabled={bulkBusy !== null || watchedEps === 0}
                  className="h-11 px-4 rounded-[18px] text-xs font-black uppercase tracking-widest bg-white/[0.09] text-white/72 ring-1 ring-white/[0.06] disabled:opacity-40 active:scale-[0.98]"
                >
                  {bulkBusy === 'unmark' ? 'Unmarking...' : 'Unmark All'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-10">
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
                      className={cn(
                        'rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] disabled:opacity-50',
                        seasonComplete ? 'bg-white/[0.1] text-white/62' : 'bg-emerald-400/18 text-emerald-200',
                      )}
                    >
                      {busySeason === s.seasonNumber
                        ? 'Saving'
                        : seasonComplete
                          ? 'Unmark'
                          : 'Mark'}
                    </button>
                    <button
                      onClick={() => toggleSeason(s.seasonNumber)}
                      className={cn('grid h-9 w-8 place-items-center text-xl text-white/70 transition-transform active:scale-90', open && 'rotate-90')}
                      aria-label={open ? `Collapse ${seasonName}` : `Expand ${seasonName}`}
                    >
                      ›
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {open && (
                    <motion.div
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
                                className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[0.03]"
                              >
                                <span
                                  className={`grid place-items-center h-6 w-6 rounded-md border transition-colors ${
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
                                        className="text-xs font-black"
                                      >
                                        ✓
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </span>
                                <span className="text-xs text-white/45 w-8 tabular-nums">
                                  {s.seasonNumber}×{String(e.episode_number).padStart(2, '0')}
                                </span>
                                <span className={cn('text-base transition-colors', watched ? 'text-white/56' : 'text-white/90')}>
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
        const x = Math.random() * 100
        const delay = Math.random() * 0.4
        const dur = 1.4 + Math.random() * 0.8
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
