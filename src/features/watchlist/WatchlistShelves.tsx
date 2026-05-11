import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, GripVertical, Plus, Trash2 } from 'lucide-react'
import { db } from '../../data/db'
import {
  createWatchlistShelf,
  deleteWatchlistShelf,
  ensureDefaultWatchlistShelves,
  removeFromWatchlistShelf,
  updateWatchlistShelfShows,
  WATCHLIST_SHELF_SUGGESTIONS,
} from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { Show, WatchlistShelf } from '../../types'

interface Props {
  onOpenShow: (show: Show) => void
  onAddToShelf: (shelfId: string) => void
}

type ShelfItem = {
  id: string
  shelfId: string
  show: Show
}

function itemId(shelfId: string, showId: number) {
  return `${shelfId}:${showId}`
}

function parseItemId(id: string | number) {
  const [shelfId, rawShowId] = String(id).split(':')
  return { shelfId, showId: Number(rawShowId) }
}

export function WatchlistShelves({ onOpenShow, onAddToShelf }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const shelves = useDexieQuery(['watchlistShelves'], () => db.watchlistShelves.toArray(), [], [])
  const ownedShows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const watchlistShows = useDexieQuery(['watchlistShows'], () => db.watchlistShows.toArray(), [], [])

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

  const showById = useMemo(() => {
    const map = new Map<number, Show>()
    for (const show of watchlistShows) map.set(show.id, show)
    for (const show of ownedShows) map.set(show.id, show)
    return map
  }, [ownedShows, watchlistShows])

  const shelfItems = useMemo(() => {
    const map = new Map<string, ShelfItem[]>()
    for (const shelf of sortedShelves) {
      map.set(
        shelf.id,
        shelf.showIds
          .map((showId) => {
            const show = showById.get(showId)
            return show ? { id: itemId(shelf.id, show.id), shelfId: shelf.id, show } : null
          })
          .filter(Boolean) as ShelfItem[],
      )
    }
    return map
  }, [showById, sortedShelves])

  useEffect(() => {
    void ensureDefaultWatchlistShelves()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 210, tolerance: 6 } }),
  )

  const findShelf = (id: string | number) => {
    const raw = String(id)
    if (sortedShelves.some((shelf) => shelf.id === raw)) return raw
    if (raw.includes(':')) return parseItemId(raw).shelfId
    return null
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over) return

    const activeRaw = String(event.active.id)
    const overRaw = String(event.over.id)
    const active = parseItemId(activeRaw)
    const sourceShelfId = active.shelfId
    const targetShelfId = findShelf(overRaw)
    if (!targetShelfId) return

    const sourceShelf = sortedShelves.find((shelf) => shelf.id === sourceShelfId)
    const targetShelf = sortedShelves.find((shelf) => shelf.id === targetShelfId)
    if (!sourceShelf || !targetShelf) return

    if (sourceShelfId === targetShelfId) {
      const oldIndex = sourceShelf.showIds.indexOf(active.showId)
      const overIndex = overRaw.includes(':')
        ? sourceShelf.showIds.indexOf(parseItemId(overRaw).showId)
        : sourceShelf.showIds.length - 1
      if (oldIndex < 0 || overIndex < 0 || oldIndex === overIndex) return
      await updateWatchlistShelfShows(sourceShelfId, arrayMove(sourceShelf.showIds, oldIndex, overIndex))
      return
    }

    const nextSourceIds = sourceShelf.showIds.filter((showId) => showId !== active.showId)
    const nextTargetIds = targetShelf.showIds.filter((showId) => showId !== active.showId)
    const insertIndex = overRaw.includes(':')
      ? Math.max(0, nextTargetIds.indexOf(parseItemId(overRaw).showId))
      : nextTargetIds.length
    nextTargetIds.splice(insertIndex < 0 ? nextTargetIds.length : insertIndex, 0, active.showId)

    await updateWatchlistShelfShows(sourceShelfId, nextSourceIds)
    await updateWatchlistShelfShows(targetShelfId, nextTargetIds)
    navigator.vibrate?.([5, 15, 8])
  }

  const createShelf = async (nextName: string) => {
    if (!nextName.trim()) return
    const shelf = await createWatchlistShelf(nextName.trim())
    setName('')
    setCreating(false)
    onAddToShelf(shelf.id)
  }

  return (
    <div className="pb-10">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f5c453]/80">
          <Bookmark size={13} fill="currentColor" /> Watchlist
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-white/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/56 active:scale-95"
        >
          New shelf
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="mb-4 rounded-[28px] bg-white/[0.055] p-3 ring-1 ring-white/[0.07]"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shelf name"
              className="h-12 w-full rounded-[20px] bg-black/36 px-4 text-sm font-black text-white outline-none placeholder:text-white/24"
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
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => void createShelf(name)} disabled={!name.trim()} className="h-11 rounded-[18px] bg-[#f5c453] text-[10px] font-black uppercase tracking-[0.16em] text-black disabled:opacity-30">
                Create + add
              </button>
              <button onClick={() => { setCreating(false); setName('') }} className="h-11 rounded-[18px] bg-white/[0.07] text-[10px] font-black uppercase tracking-[0.16em] text-white/56">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-5">
          {sortedShelves.map((shelf) => (
            <WatchlistShelfRow
              key={shelf.id}
              shelf={shelf}
              items={shelfItems.get(shelf.id) ?? []}
              onAdd={() => onAddToShelf(shelf.id)}
              onOpenShow={onOpenShow}
              onRemove={(showId) => void removeFromWatchlistShelf(shelf.id, showId)}
              onDelete={() => {
                if (confirm(`Delete "${shelf.name}"?`)) void deleteWatchlistShelf(shelf.id)
              }}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}

function WatchlistShelfRow({
  shelf,
  items,
  onAdd,
  onOpenShow,
  onRemove,
  onDelete,
}: {
  shelf: WatchlistShelf
  items: ShelfItem[]
  onAdd: () => void
  onOpenShow: (show: Show) => void
  onRemove: (showId: number) => void
  onDelete: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: shelf.id })

  return (
    <section ref={setNodeRef} className={cn('rounded-[30px] py-3 transition-colors', isOver && 'bg-[#f5c453]/10')}>
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <h3 className="text-[25px] font-black leading-none tracking-[-0.08em] text-white">{shelf.name}</h3>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">{items.length} pick{items.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdd} className="grid h-11 w-11 place-items-center rounded-full bg-[#f5c453] text-black shadow-[0_16px_32px_rgba(245,196,83,0.16)] active:scale-95" aria-label={`Add to ${shelf.name}`}>
            <Plus size={20} strokeWidth={3} />
          </button>
          {items.length === 0 && (
            <button onClick={onDelete} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.055] text-white/34 active:scale-95" aria-label={`Delete ${shelf.name}`}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <SortableContext items={items.map((item) => item.id)} strategy={horizontalListSortingStrategy}>
        {items.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <AnimatePresence>
              {items.map((item) => (
                <SortableWatchlistCard key={item.id} item={item} onOpenShow={onOpenShow} onRemove={onRemove} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <button onClick={onAdd} className="flex min-h-[114px] w-full items-center justify-center rounded-[28px] border border-dashed border-white/[0.14] text-[10px] font-black uppercase tracking-[0.2em] text-white/34 active:scale-[0.99]">
            Add the first pick
          </button>
        )}
      </SortableContext>
    </section>
  )
}

function SortableWatchlistCard({
  item,
  onOpenShow,
  onRemove,
}: {
  item: ShelfItem
  onOpenShow: (show: Show) => void
  onRemove: (showId: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.72 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      className="relative h-[182px] w-[126px] shrink-0 overflow-hidden rounded-[27px] bg-[#151117] shadow-[0_18px_38px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.07] active:scale-[0.98]"
    >
      <button onClick={() => onOpenShow(item.show)} className="absolute inset-0 text-left">
        {item.show.posterPath || item.show.backdropPath ? (
          <img
            src={imgUrl(item.show.posterPath ?? item.show.backdropPath, item.show.posterPath ? 'w342' : 'w500')}
            alt={item.show.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-white/[0.04] text-2xl font-black text-white/26">
            {item.show.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/8 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 text-[15px] font-black leading-[0.95] tracking-[-0.06em] text-white">{item.show.name}</p>
          {item.show.year && <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/34">{item.show.year}</p>}
        </div>
      </button>
      <div className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/42 text-white/44 backdrop-blur-xl">
        <GripVertical size={14} />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.show.id)
        }}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/42 text-white/64 backdrop-blur-xl active:scale-95"
        aria-label={`Remove ${item.show.name} from shelf`}
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  )
}
