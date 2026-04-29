import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getSeason,
  getShowDetail,
  hasTmdbKey,
  imgUrl,
  searchShows,
  type TmdbSearchResult,
} from '../../lib/tmdb'
import { cacheSeason, setAllCachedSeasonsWatched, upsertShow } from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { db } from '../../data/db'
import type { Genre, Show } from '../../types'
import { IconClose, IconPlus, IconSearch } from '../../components/ui/Icon'

interface Props {
  open: boolean
  onClose: () => void
  onOpenSettings: () => void
}

export function AddShowSheet({ open, onClose, onOpenSettings }: Props) {
  const [mode, setMode] = useState<'search' | 'import'>('search')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<number | null>(null)
  const [bulkText, setBulkText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importReport, setImportReport] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const keyOk = hasTmdbKey()
  const ownedShows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const ownedIds = useMemo(() => new Set(ownedShows.map((s) => s.id)), [ownedShows])

  useEffect(() => {
    if (!open) {
      setQ('')
      setResults([])
      setError(null)
      setBulkText('')
      setImportReport(null)
      setMode('search')
    }
  }, [open])

  useEffect(() => {
    if (!open || !keyOk) return
    if (timer.current) clearTimeout(timer.current)
    if (!q.trim()) {
      setResults([])
      return
    }
    timer.current = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await searchShows(q.trim())
        setResults(res)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [q, open, keyOk])

  const hydrateSeasonCache = async (
    showId: number,
    seasons: { season_number: number; episode_count: number }[],
  ) => {
    for (const season of seasons) {
      if (season.episode_count <= 0) continue
      try {
        const seasonData = await getSeason(showId, season.season_number)
        await cacheSeason({
          key: `${showId}-${season.season_number}`,
          showId,
          seasonNumber: season.season_number,
          episodes: seasonData.episodes.map((ep) => ({
            episode_number: ep.episode_number,
            name: ep.name,
            still_path: ep.still_path,
          })),
          fetchedAt: Date.now(),
        })
      } catch {
        // Continue hydrating remaining seasons even if one season fetch fails.
      }
    }
  }

  const add = async (r: TmdbSearchResult) => {
    if (ownedIds.has(r.id)) return
    setAdding(r.id)
    try {
      const detail = await getShowDetail(r.id)
      const genres = detail.genres.map((g) => g.name) as string[]
      const yr = (r.first_air_date ?? '').slice(0, 4)
      const show: Show = {
        id: r.id,
        name: r.name,
        year: yr ? Number(yr) : undefined,
        posterPath: r.poster_path ?? null,
        backdropPath: r.backdrop_path ?? null,
        overview: r.overview,
        genres: genres as Genre[],
        rawGenres: genres,
        addedAt: Date.now(),
        updatedAt: Date.now(),
      }
      await upsertShow(show)
      await hydrateSeasonCache(show.id, detail.seasons)
      await setAllCachedSeasonsWatched(show.id, true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(null)
    }
  }

  const importFromLines = async () => {
    const lines = Array.from(
      new Set(
        bulkText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      ),
    )
    if (!lines.length) return

    setImporting(true)
    setImportReport(null)
    let added = 0
    let skipped = 0
    let failed = 0

    for (const line of lines) {
      try {
        const res = await searchShows(line)
        const first = res[0]
        if (!first) {
          failed += 1
          continue
        }
        if (ownedIds.has(first.id)) {
          skipped += 1
          continue
        }
        await add(first)
        added += 1
      } catch {
        failed += 1
      }
    }

    setImporting(false)
    setImportReport(`Added ${added}. Skipped ${skipped}. Failed ${failed}.`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-zinc-950 border-t border-white/10 flex flex-col"
          >
            <div className="px-4 pt-4 pb-2 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Add a show</h2>
                <button onClick={onClose} className="text-white/55">
                  <IconClose />
                </button>
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setMode('search')}
                  className={`h-9 px-3 rounded-lg text-xs font-black uppercase tracking-wider ${mode === 'search' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}
                >
                  Search
                </button>
                <button
                  onClick={() => setMode('import')}
                  className={`h-9 px-3 rounded-lg text-xs font-black uppercase tracking-wider ${mode === 'import' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}
                >
                  Import
                </button>
              </div>

              {mode === 'search' && (
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                    <IconSearch size={16} />
                  </div>
                  <input
                    autoFocus
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search a TV show"
                    disabled={!keyOk}
                    className="w-full rounded-xl bg-white/[0.06] pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                  />
                </div>
              )}

              {mode === 'import' && (
                <div className="space-y-2">
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={'One show per line\nThe Office\nStar Wars: Andor\nSeverance'}
                    className="w-full h-36 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <button
                    onClick={() => void importFromLines()}
                    disabled={!keyOk || importing || !bulkText.trim()}
                    className="rounded-xl bg-[#4ade80] text-black px-4 h-10 text-sm font-black uppercase tracking-widest disabled:opacity-40"
                  >
                    {importing ? 'Importing…' : 'Import Lines'}
                  </button>
                  {importReport && <p className="text-xs text-white/70">{importReport}</p>}
                </div>
              )}

              {error && <p className="text-xs text-rose-300 mt-2">{error}</p>}
            </div>

            {!keyOk && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-white/75">
                  Add a TMDB API key in Settings to search for shows.
                </p>
                <button
                  onClick={() => {
                    onClose()
                    onOpenSettings()
                  }}
                  className="mt-4 rounded-xl bg-white text-black px-4 h-10 text-sm font-semibold"
                >
                  Open Settings
                </button>
              </div>
            )}

            {mode === 'search' && (
              <div className="overflow-y-auto px-2 pb-8 mt-1 flex-1">
                {keyOk && loading && (
                  <p className="px-4 py-3 text-sm text-white/55">Searching…</p>
                )}
                {keyOk && !loading && q.trim() === '' && (
                  <p className="px-4 py-3 text-xs text-white/40">
                    Type a show name to start.
                  </p>
                )}
                <ul className="divide-y divide-white/[0.04]">
                  {results.map((r) => {
                    const isOwned = ownedIds.has(r.id)
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => void add(r)}
                          disabled={adding === r.id || isOwned}
                          className="w-full flex items-center gap-3 p-2 hover:bg-white/[0.03] rounded-xl disabled:opacity-60 text-left"
                        >
                          <div className="h-16 w-12 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                            {r.poster_path && (
                              <img
                                src={imgUrl(r.poster_path, 'w185')}
                                alt={r.name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold leading-tight">
                              {r.name}
                            </div>
                            <div className="text-[11px] text-white/45">
                              {(r.first_air_date ?? '').slice(0, 4) || '—'}
                            </div>
                            {r.overview && (
                              <div className="text-[11px] text-white/45 line-clamp-2 mt-0.5">
                                {r.overview}
                              </div>
                            )}
                          </div>
                          <span
                            className={`grid place-items-center h-8 w-8 rounded-lg ${
                              isOwned
                                ? 'bg-emerald-400/20 text-emerald-300'
                                : adding === r.id
                                  ? 'bg-white/10 text-white/40'
                                  : 'bg-amber-300 text-amber-950'
                            }`}
                          >
                            {isOwned ? '✓' : <IconPlus size={16} />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
