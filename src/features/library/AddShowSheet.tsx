import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Search, Check, Upload, AlertCircle } from 'lucide-react'
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
import { cn } from '../../lib/utils'
import { PickerTopBar, fullScreenOverlayClass } from '../../components/ui/FullScreenPickerShell'
import { ShowSearchResultDeck } from '../../components/show/ShowSearchResultDeck'

interface Props {
  open: boolean
  onClose: () => void
  onOpenSettings: () => void
}

// ── helpers ──────────────────────────────────────────────────────────────────

function tmdbResultToShow(r: TmdbSearchResult): Show {
  const yr = (r.first_air_date ?? '').slice(0, 4)
  return {
    id: r.id,
    name: r.name,
    year: yr ? Number(yr) : undefined,
    posterPath: r.poster_path ?? null,
    backdropPath: r.backdrop_path ?? null,
    overview: r.overview ?? '',
    genres: [],
    rawGenres: [],
    addedAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── main component ────────────────────────────────────────────────────────────

export function AddShowSheet({ open, onClose, onOpenSettings }: Props) {
  const [mode, setMode] = useState<'search' | 'import'>('search')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<number | null>(null)
  const timer = useRef<number | null>(null)
  const keyOk = hasTmdbKey()
  const ownedShows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const ownedIds = useMemo(() => new Set(ownedShows.map((s) => s.id)), [ownedShows])

  useEffect(() => {
    if (!open) {
      setQ('')
      setResults([])
      setError(null)
      setMode('search')
    }
  }, [open])

  useEffect(() => {
    if (!open || !keyOk) return
    if (timer.current) clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); return }
    timer.current = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        setResults(await searchShows(q.trim()))
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
      } catch { /* best effort */ }
    }
  }

  const addSingle = async (r: TmdbSearchResult) => {
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(fullScreenOverlayClass, 'z-50')}
        >
            <PickerTopBar onClose={onClose} />

            {/* Mode tabs */}
            <div className="flex gap-2 px-4 pt-4 pb-4 flex-shrink-0">
              {(['search', 'import'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors',
                    mode === m
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/60 hover:bg-white/15',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* No API key */}
            {!keyOk && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <AlertCircle size={40} className="text-zinc-600" />
                <p className="text-sm text-white/60">Add a TMDB API key in Settings to search for shows.</p>
                <button
                  onClick={() => { onClose(); onOpenSettings() }}
                  className="rounded-xl bg-white text-black px-5 h-10 text-sm font-black uppercase tracking-widest"
                >
                  Open Settings
                </button>
              </div>
            )}

            {/* Search mode */}
            {keyOk && mode === 'search' && (
              <SearchMode
                q={q}
                setQ={setQ}
                results={results}
                loading={loading}
                error={error}
                adding={adding}
                ownedIds={ownedIds}
                onAdd={addSingle}
              />
            )}

            {/* Import mode */}
            {keyOk && mode === 'import' && (
              <ImportMode ownedIds={ownedIds} />
            )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Search mode ───────────────────────────────────────────────────────────────

function SearchMode({
  q, setQ, results, loading, error, adding, ownedIds, onAdd,
}: {
  q: string
  setQ: (v: string) => void
  results: TmdbSearchResult[]
  loading: boolean
  error: string | null
  adding: number | null
  ownedIds: Set<number>
  onAdd: (r: TmdbSearchResult) => void
}) {
  return (
    <>
      <div className="px-5 pb-3 flex-shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a TV show…"
            className="w-full bg-black/30 border border-white/10 rounded-full py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#f5c453] transition-colors"
          />
        </div>
        {error && <p className="text-xs text-rose-400 mt-2 px-1">{error}</p>}
      </div>

      <ShowSearchResultDeck
        query={q}
        loading={loading}
        results={results}
        error={error}
        isSaved={(result) => ownedIds.has(result.id)}
        isSaving={(result) => adding === result.id}
        onSave={onAdd}
      />
    </>
  )
}

// ── Import mode ───────────────────────────────────────────────────────────────

type ImportStatus = 'added' | 'owned' | 'notfound' | 'failed'
interface ImportResult { line: string; status: ImportStatus; show?: TmdbSearchResult }

function ImportMode({ ownedIds }: { ownedIds: Set<number> }) {
  const [bulkText, setBulkText] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const cancelRef = useRef(false)

  const importLines = async () => {
    const lines = Array.from(
      new Set(
        bulkText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      ),
    )
    if (!lines.length) return

    cancelRef.current = false
    setRunning(true)
    setResults([])
    setProgress(0)
    setTotal(lines.length)

    for (let i = 0; i < lines.length; i++) {
      if (cancelRef.current) break
      const line = lines[i]
      let result: ImportResult

      try {
        const res = await searchShows(line)
        const first = res[0]

        if (!first) {
          result = { line, status: 'notfound' }
        } else if (ownedIds.has(first.id)) {
          result = { line, status: 'owned', show: first }
        } else {
          // Save directly from search result — no extra API calls that hit rate limits.
          // Genre + season data loads on demand when the user opens the show.
          const show = tmdbResultToShow(first)
          await upsertShow(show)
          result = { line, status: 'added', show: first }
        }
      } catch {
        result = { line, status: 'failed' }
      }

      setResults((prev) => [...prev, result])
      setProgress(i + 1)

      // Pace requests: TMDB allows ~40/10 s; 300 ms keeps us well under.
      if (i < lines.length - 1) await sleep(300)
    }

    setRunning(false)
  }

  const cancel = () => { cancelRef.current = true }

  const counts = results.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc },
    {} as Record<ImportStatus, number>,
  )

  return (
    <>
      {/* Input area — only shown before/while not running */}
      {!running && results.length === 0 && (
        <div className="px-5 pb-4 flex-shrink-0">
          <p className="text-xs text-zinc-500 mb-3 font-bold uppercase tracking-widest">One show per line</p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'The Office\nStar Wars: Andor\nSeverance\nBreaking Bad'}
            rows={7}
            className="w-full bg-[#1a1a24] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#4ade80] transition-colors resize-none leading-relaxed"
          />
          <button
            onClick={() => void importLines()}
            disabled={!bulkText.trim()}
            className="mt-3 w-full h-12 rounded-2xl bg-[#4ade80] text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-transform"
          >
            <Upload size={16} strokeWidth={3} />
            Import Lines
          </button>
        </div>
      )}

      {/* Progress header — shown while running or after */}
      {(running || results.length > 0) && (
        <div className="px-5 pb-4 flex-shrink-0">
          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-[#4ade80] rounded-full transition-all duration-300"
              style={{ width: total > 0 ? `${(progress / total) * 100}%` : '0%' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-bold">
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
                  <span className="text-zinc-400">
                    {progress} <span className="text-zinc-600">/ {total}</span>
                  </span>
                </>
              ) : (
                <span className="text-zinc-400 uppercase tracking-widest">Done</span>
              )}
              <div className="flex gap-2">
                {(counts.added ?? 0) > 0 && (
                  <span className="text-[#4ade80]">+{counts.added} added</span>
                )}
                {(counts.owned ?? 0) > 0 && (
                  <span className="text-zinc-500">{counts.owned} owned</span>
                )}
                {(counts.notfound ?? 0) > 0 && (
                  <span className="text-amber-400">{counts.notfound} not found</span>
                )}
                {(counts.failed ?? 0) > 0 && (
                  <span className="text-rose-400">{counts.failed} failed</span>
                )}
              </div>
            </div>
            {running ? (
              <button
                onClick={cancel}
                className="text-xs text-zinc-500 hover:text-white font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => { setResults([]); setProgress(0); setTotal(0) }}
                className="text-xs text-zinc-500 hover:text-white font-bold uppercase tracking-widest"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <AnimatePresence initial={false}>
          {results.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0"
            >
              {r.show?.poster_path ? (
                <img
                  src={imgUrl(r.show.poster_path, 'w185')}
                  alt={r.show.name}
                  className="w-8 h-11 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-11 rounded-lg bg-[#1a1a24] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm text-white truncate leading-tight">
                  {r.show?.name ?? r.line}
                </div>
                {r.show?.name && r.show.name !== r.line && (
                  <div className="text-[10px] text-zinc-600 truncate">searched: {r.line}</div>
                )}
              </div>
              <StatusBadge status={r.status} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: ImportStatus }) {
  switch (status) {
    case 'added':
      return (
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#4ade80]/20 flex items-center justify-center">
          <Check size={13} strokeWidth={3} className="text-[#4ade80]" />
        </span>
      )
    case 'owned':
      return (
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
          <Check size={13} strokeWidth={3} className="text-zinc-500" />
        </span>
      )
    case 'notfound':
      return (
        <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
          ?
        </span>
      )
    case 'failed':
      return (
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center">
          <X size={13} strokeWidth={3} className="text-rose-400" />
        </span>
      )
  }
}
