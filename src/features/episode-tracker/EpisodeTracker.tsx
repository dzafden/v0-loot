import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Show } from '../../types'
import { db } from '../../data/db'
import { getSeason, getShowDetail } from '../../lib/tmdb'
import { cacheSeason, progressKey, setEpisodeWatched, setSeasonWatched } from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'

interface Props {
  show: Show
  onClose: () => void
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

  // Fetch missing seasons on mount/update (handles partial caches)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const detail = await getShowDetail(show.id)
        const cachedSeasonNumbers = new Set(seasons.map((s) => s.seasonNumber))
        for (const s of detail.seasons) {
          if (s.season_number === 0) continue // skip specials by default
          if (cachedSeasonNumbers.has(s.season_number)) continue
          const data = await getSeason(show.id, s.season_number)
          if (cancelled) return
          await cacheSeason({
            key: `${show.id}-${s.season_number}`,
            showId: show.id,
            seasonNumber: s.season_number,
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
        <div className="px-4 pt-4 pb-3 bg-[#0f0f13]/95 backdrop-blur border-b border-white/5 z-20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{show.name}</h2>
              <p className="text-sm text-white/60 mt-0.5">
                {totalEps ? `${watchedEps}/${totalEps} episodes watched` : 'Loading episodes…'}
              </p>
            </div>
            <button onClick={onClose} className="rounded-xl bg-white/10 px-3 h-10 text-sm font-semibold">
              Back
            </button>
          </div>
          {totalEps > 0 && (
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${(watchedEps / totalEps) * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void markAll(true)}
              disabled={bulkBusy !== null || allDone}
              className="h-10 px-3 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-400/20 text-emerald-300 disabled:opacity-40"
            >
              {bulkBusy === 'mark' ? 'Marking…' : 'Mark All'}
            </button>
            <button
              onClick={() => void markAll(false)}
              disabled={bulkBusy !== null || watchedEps === 0}
              className="h-10 px-3 rounded-xl text-xs font-black uppercase tracking-widest bg-white/10 text-white/80 disabled:opacity-40"
            >
              {bulkBusy === 'unmark' ? 'Unmarking…' : 'Unmark All'}
            </button>
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
            return (
              <div key={s.key} className="border-b border-white/5">
                <button
                  onClick={() => toggleSeason(s.seasonNumber)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">Season {s.seasonNumber}</span>
                    <span className="text-sm text-white/55">
                      {seasonWatched}/{s.episodes.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const allWatched = seasonWatched === s.episodes.length
                        setBusySeason(s.seasonNumber)
                        void setSeasonWatched(show.id, s.seasonNumber, s.episodes.map((x) => x.episode_number), !allWatched)
                          .finally(() => setBusySeason(null))
                      }}
                      disabled={busySeason === s.seasonNumber}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      {busySeason === s.seasonNumber
                        ? 'Saving…'
                        : seasonWatched === s.episodes.length
                          ? 'Unmark season'
                          : 'Mark season'}
                    </button>
                    <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                  </div>
                </button>
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
                                <span className={`text-base ${watched ? 'text-white/60 line-through' : ''}`}>
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
