import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Check, Plus, X } from 'lucide-react'
import { db } from '../../data/db'
import {
  addToWatchlistShelf,
  createWatchlistShelf,
  ensureDefaultWatchlistShelves,
  removeFromWatchlistShelf,
  WATCHLIST_SHELF_SUGGESTIONS,
} from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { Show } from '../../types'

interface Props {
  open: boolean
  show: Show | null
  onClose: () => void
}

export function WatchlistShelfPicker({ open, show, onClose }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const shelves = useDexieQuery(['watchlistShelves'], () => db.watchlistShelves.toArray(), [], [])

  const sortedShelves = useMemo(
    () => {
      return [...shelves].sort((a, b) => {
        const ap = typeof a.position === 'number' ? a.position : undefined
        const bp = typeof b.position === 'number' ? b.position : undefined
        if (ap !== undefined || bp !== undefined) return (ap ?? 999) - (bp ?? 999)
        return a.createdAt - b.createdAt
      })
    },
    [shelves],
  )

  useEffect(() => {
    if (!open) return
    void ensureDefaultWatchlistShelves()
  }, [open])

  useEffect(() => {
    if (!open) {
      setCreating(false)
      setName('')
    }
  }, [open])

  const createAndAdd = async (nextName: string) => {
    if (!show || !nextName.trim()) return
    const shelf = await createWatchlistShelf(nextName.trim())
    await addToWatchlistShelf(shelf.id, show)
    setCreating(false)
    setName('')
    navigator.vibrate?.([6, 18, 8])
  }

  return (
    <AnimatePresence>
      {open && show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[70] bg-black/62 backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: 38, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[36px] border-t border-white/[0.08] bg-[#0b090d] shadow-[0_-30px_90px_rgba(0,0,0,0.65)]"
          >
            <div className="relative min-h-[152px] overflow-hidden p-5">
              {(show.backdropPath || show.posterPath) && (
                <img
                  src={imgUrl(show.backdropPath ?? show.posterPath, show.backdropPath ? 'w500' : 'w342')}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                  aria-hidden
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/94 via-black/68 to-black/24" />
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-white/72 active:scale-95"
                aria-label="Close watchlist picker"
              >
                <X size={17} />
              </button>
              <div className="relative z-10 max-w-[78%]">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f5c453]">
                  <Bookmark size={12} fill="currentColor" /> Watchlist
                </div>
                <h2 className="text-[34px] font-black leading-[0.86] tracking-[-0.1em] text-white text-balance">
                  Shelf this show
                </h2>
                <p className="mt-2 line-clamp-1 text-sm font-bold text-white/48">{show.name}</p>
              </div>
            </div>

            <div className="max-h-[58svh] overflow-y-auto px-4 pb-6 pt-4">
              <div className="space-y-2">
                {sortedShelves.map((shelf) => {
                  const hasShow = shelf.showIds.includes(show.id)
                  return (
                    <button
                      key={shelf.id}
                      onClick={async () => {
                        if (hasShow) await removeFromWatchlistShelf(shelf.id, show.id)
                        else await addToWatchlistShelf(shelf.id, show)
                        navigator.vibrate?.(hasShow ? 4 : [6, 18, 8])
                      }}
                      className={cn(
                        'flex min-h-[72px] w-full items-center justify-between rounded-[26px] px-4 text-left ring-1 transition-all active:scale-[0.985]',
                        hasShow
                          ? 'bg-[#f5c453] text-black ring-[#f5c453]/50 shadow-[0_18px_42px_rgba(245,196,83,0.16)]'
                          : 'bg-white/[0.055] text-white ring-white/[0.07]',
                      )}
                    >
                      <span>
                        <span className="block text-[18px] font-black tracking-[-0.04em]">{shelf.name}</span>
                        <span className={cn('mt-1 block text-[10px] font-black uppercase tracking-[0.18em]', hasShow ? 'text-black/52' : 'text-white/32')}>
                          {shelf.showIds.length} pick{shelf.showIds.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className={cn('grid h-11 w-11 place-items-center rounded-full', hasShow ? 'bg-black text-white' : 'bg-[#f5c453] text-black')}>
                        {hasShow ? <Check size={18} strokeWidth={3} /> : <Plus size={19} strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })}
              </div>

              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-white/[0.18] text-[11px] font-black uppercase tracking-[0.18em] text-white/58 active:scale-[0.985]"
                >
                  <Plus size={16} /> New shelf
                </button>
              ) : (
                <div className="mt-3 rounded-[26px] bg-white/[0.055] p-3 ring-1 ring-white/[0.07]">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name the shelf"
                    className="h-12 w-full rounded-[19px] bg-black/36 px-4 text-sm font-black text-white outline-none placeholder:text-white/26"
                  />
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {WATCHLIST_SHELF_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setName(suggestion)}
                        className="shrink-0 rounded-full bg-white/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/58 active:scale-95"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      onClick={() => void createAndAdd(name)}
                      disabled={!name.trim()}
                      className="h-11 rounded-[18px] bg-[#f5c453] text-[11px] font-black uppercase tracking-[0.16em] text-black disabled:opacity-30"
                    >
                      Create + shelf
                    </button>
                    <button
                      onClick={() => {
                        setCreating(false)
                        setName('')
                      }}
                      className="grid h-11 w-11 place-items-center rounded-[18px] bg-white/[0.07] text-white/62"
                      aria-label="Cancel shelf creation"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
