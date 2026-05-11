import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Plus, Search, X } from 'lucide-react'
import { db } from '../../data/db'
import {
  addToWatchlistShelf,
  createWatchlistShelf,
  ensureDefaultWatchlistShelves,
  WATCHLIST_SHELF_SUGGESTIONS,
} from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { getShowDetail, hasTmdbKey, searchShows, type TmdbSearchResult } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { Genre, Show } from '../../types'
import { PickerTopBar, fullScreenOverlayClass } from '../../components/ui/FullScreenPickerShell'
import { ShowSearchResultDeck } from '../../components/show/ShowSearchResultDeck'

interface Props {
  open: boolean
  shelfId?: string | null
  onClose: () => void
  onOpenSettings: () => void
}

function tmdbResultToShow(r: TmdbSearchResult, genres: string[] = []): Show {
  const year = (r.first_air_date ?? '').slice(0, 4)
  return {
    id: r.id,
    name: r.name,
    year: year ? Number(year) : undefined,
    posterPath: r.poster_path ?? null,
    backdropPath: r.backdrop_path ?? null,
    overview: r.overview ?? '',
    genres: genres as Genre[],
    rawGenres: genres,
    addedAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function WatchlistSearchSheet({ open, shelfId, onClose, onOpenSettings }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeShelfId, setActiveShelfId] = useState<string | null>(shelfId ?? null)
  const [creating, setCreating] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const timer = useRef<number | null>(null)
  const keyOk = hasTmdbKey()
  const shelves = useDexieQuery(['watchlistShelves'], () => db.watchlistShelves.toArray(), [], [])

  const sortedShelves = useMemo(
    () => {
      const priority = new Map([
        ['Watch next', 0],
        ['Someday', 1],
      ])
      return [...shelves].sort((a, b) => {
        const ap = priority.get(a.name)
        const bp = priority.get(b.name)
        if (ap !== undefined || bp !== undefined) return (ap ?? 99) - (bp ?? 99)
        return a.createdAt - b.createdAt
      })
    },
    [shelves],
  )
  const activeShelf = sortedShelves.find((shelf) => shelf.id === activeShelfId) ?? sortedShelves[0]

  useEffect(() => {
    if (!open) return
    void ensureDefaultWatchlistShelves()
  }, [open])

  useEffect(() => {
    if (shelfId) setActiveShelfId(shelfId)
  }, [shelfId])

  useEffect(() => {
    if (!activeShelfId && sortedShelves[0]) setActiveShelfId(sortedShelves[0].id)
  }, [activeShelfId, sortedShelves])

  useEffect(() => {
    if (!open) {
      setQ('')
      setResults([])
      setError(null)
      setAdding(null)
      setCreating(false)
      setNewShelfName('')
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
        setResults(await searchShows(q.trim()))
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [q, open, keyOk])

  const addResult = async (result: TmdbSearchResult) => {
    if (!activeShelf) return
    setAdding(result.id)
    setError(null)
    try {
      let genres: string[] = []
      try {
        const detail = await getShowDetail(result.id)
        genres = detail.genres.map((genre) => genre.name)
      } catch {
        // Watchlist can still save the object; details hydrate later if needed.
      }
      await addToWatchlistShelf(activeShelf.id, tmdbResultToShow(result, genres))
      navigator.vibrate?.([6, 18, 8])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(null)
    }
  }

  const createShelf = async () => {
    if (!newShelfName.trim()) return
    const shelf = await createWatchlistShelf(newShelfName.trim())
    setActiveShelfId(shelf.id)
    setCreating(false)
    setNewShelfName('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={cn(fullScreenOverlayClass, 'z-[70]')}
        >
          <PickerTopBar onClose={onClose} />

          {!keyOk ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <AlertCircle size={40} className="text-white/24" />
              <p className="text-sm font-bold text-white/52">Add a TMDB API key in Settings to search for shows.</p>
              <button
                onClick={() => {
                  onClose()
                  onOpenSettings()
                }}
                className="h-11 rounded-[18px] bg-white px-5 text-[11px] font-black uppercase tracking-[0.18em] text-black"
              >
                Open settings
              </button>
            </div>
          ) : (
            <>
              <div className="px-4 pb-3">
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                  {sortedShelves.map((shelf) => (
                    <button
                      key={shelf.id}
                      onClick={() => setActiveShelfId(shelf.id)}
                      className={cn(
                        'shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]',
                        activeShelf?.id === shelf.id ? 'bg-[#f5c453] text-black' : 'bg-white/[0.07] text-white/50',
                      )}
                    >
                      {shelf.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setCreating(true)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/58"
                    aria-label="Create shelf"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {creating && (
                  <div className="mb-3 rounded-[24px] bg-white/[0.055] p-3 ring-1 ring-white/[0.07]">
                    <input
                      autoFocus
                      value={newShelfName}
                      onChange={(e) => setNewShelfName(e.target.value)}
                      placeholder="Shelf name"
                      className="h-11 w-full rounded-[18px] bg-black/40 px-4 text-sm font-black text-white outline-none placeholder:text-white/26"
                    />
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {WATCHLIST_SHELF_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setNewShelfName(suggestion)}
                          className="shrink-0 rounded-full bg-white/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/58"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button onClick={() => void createShelf()} disabled={!newShelfName.trim()} className="h-10 rounded-[17px] bg-[#f5c453] text-[10px] font-black uppercase tracking-[0.16em] text-black disabled:opacity-30">
                        Create shelf
                      </button>
                      <button onClick={() => setCreating(false)} className="grid h-10 w-10 place-items-center rounded-[17px] bg-white/[0.07] text-white/62" aria-label="Cancel">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/34" />
                  <input
                    autoFocus
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={`Search for ${activeShelf?.name ?? 'a shelf'}...`}
                    className="h-12 w-full rounded-full bg-white/[0.07] pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-white/24 ring-1 ring-white/[0.07] focus:ring-[#f5c453]/50"
                  />
                </div>
                {error && <p className="mt-2 px-1 text-xs font-bold text-rose-300">{error}</p>}
              </div>

              <ShowSearchResultDeck
                query={q}
                loading={loading}
                results={results}
                error={error}
                emptyLabel="Type to find a show"
                noResultsLabel="No matches"
                isSaved={(result) => Boolean(activeShelf?.showIds.includes(result.id))}
                isSaving={(result) => adding === result.id}
                onSave={addResult}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
