import { useEffect, useMemo, useState, type ButtonHTMLAttributes } from 'react'
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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import { db } from '../../data/db'
import {
  createWatchlistShelf,
  deleteWatchlistShelf,
  ensureDefaultWatchlistShelves,
  removeFromWatchlistShelf,
  reorderWatchlistShelves,
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
  newShelfSignal?: number
}

type ShelfItem = {
  id: string
  shelfId: string
  show: Show
}

function itemId(shelfId: string, showId: number) {
  return `${shelfId}:${showId}`
}

const SHELF_SORT_PREFIX = 'watchlist-shelf:'

function shelfSortId(shelfId: string) {
  return `${SHELF_SORT_PREFIX}${shelfId}`
}

function isShelfSortId(id: string | number) {
  return String(id).startsWith(SHELF_SORT_PREFIX)
}

function parseShelfSortId(id: string | number) {
  return String(id).slice(SHELF_SORT_PREFIX.length)
}

function parseItemId(id: string | number) {
  const [shelfId, rawShowId] = String(id).split(':')
  return { shelfId, showId: Number(rawShowId) }
}

export function WatchlistShelves({ onOpenShow, onAddToShelf, newShelfSignal = 0 }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [collapsedShelfIds, setCollapsedShelfIds] = useState<Set<string>>(() => new Set())
  const shelves = useDexieQuery(['watchlistShelves'], () => db.watchlistShelves.toArray(), [], [])
  const ownedShows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const watchlistShows = useDexieQuery(['watchlistShows'], () => db.watchlistShows.toArray(), [], [])

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

  useEffect(() => {
    if (newShelfSignal > 0) setCreating(true)
  }, [newShelfSignal])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 210, tolerance: 6 } }),
  )

  const findShelf = (id: string | number) => {
    const raw = String(id)
    if (isShelfSortId(raw)) return parseShelfSortId(raw)
    if (sortedShelves.some((shelf) => shelf.id === raw)) return raw
    if (raw.includes(':')) return parseItemId(raw).shelfId
    return null
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over) return

    const activeRaw = String(event.active.id)
    const overRaw = String(event.over.id)
    if (isShelfSortId(activeRaw)) {
      const sourceShelfId = parseShelfSortId(activeRaw)
      const targetShelfId = findShelf(overRaw)
      if (!targetShelfId || sourceShelfId === targetShelfId) return
      const oldIndex = sortedShelves.findIndex((shelf) => shelf.id === sourceShelfId)
      const newIndex = sortedShelves.findIndex((shelf) => shelf.id === targetShelfId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
      await reorderWatchlistShelves(arrayMove(sortedShelves.map((shelf) => shelf.id), oldIndex, newIndex))
      navigator.vibrate?.([4, 12, 4])
      return
    }
    if (!activeRaw.includes(':')) return

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
        <SortableContext items={sortedShelves.map((shelf) => shelfSortId(shelf.id))} strategy={rectSortingStrategy}>
          <div className="space-y-5">
            {sortedShelves.map((shelf) => (
              <SortableWatchlistShelf
                key={shelf.id}
                shelf={shelf}
                items={shelfItems.get(shelf.id) ?? []}
                collapsed={collapsedShelfIds.has(shelf.id)}
                onToggleCollapsed={() => {
                  setCollapsedShelfIds((current) => {
                    const next = new Set(current)
                    if (next.has(shelf.id)) next.delete(shelf.id)
                    else next.add(shelf.id)
                    return next
                  })
                }}
                onAdd={() => onAddToShelf(shelf.id)}
                onOpenShow={onOpenShow}
                onRemove={(showId) => void removeFromWatchlistShelf(shelf.id, showId)}
                onDelete={() => {
                  const suffix = shelf.showIds.length ? ` and remove ${shelf.showIds.length} pick${shelf.showIds.length === 1 ? '' : 's'} from it` : ''
                  if (confirm(`Delete "${shelf.name}"${suffix}?`)) void deleteWatchlistShelf(shelf.id)
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableWatchlistShelf({
  shelf,
  items,
  collapsed,
  onToggleCollapsed,
  onAdd,
  onOpenShow,
  onRemove,
  onDelete,
}: {
  shelf: WatchlistShelf
  items: ShelfItem[]
  collapsed: boolean
  onToggleCollapsed: () => void
  onAdd: () => void
  onOpenShow: (show: Show) => void
  onRemove: (showId: number) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shelfSortId(shelf.id) })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 60 : undefined,
    opacity: isDragging ? 0.76 : 1,
  }

  return (
    <motion.div ref={setNodeRef} style={style} layout>
      <WatchlistShelfRow
        shelf={shelf}
        items={items}
        collapsed={collapsed}
        shelfHandleProps={{ ...attributes, ...listeners } as ButtonHTMLAttributes<HTMLButtonElement>}
        onToggleCollapsed={onToggleCollapsed}
        onAdd={onAdd}
        onOpenShow={onOpenShow}
        onRemove={onRemove}
        onDelete={onDelete}
      />
    </motion.div>
  )
}

function WatchlistShelfRow({
  shelf,
  items,
  collapsed,
  shelfHandleProps,
  onToggleCollapsed,
  onAdd,
  onOpenShow,
  onRemove,
  onDelete,
}: {
  shelf: WatchlistShelf
  items: ShelfItem[]
  collapsed: boolean
  shelfHandleProps: ButtonHTMLAttributes<HTMLButtonElement>
  onToggleCollapsed: () => void
  onAdd: () => void
  onOpenShow: (show: Show) => void
  onRemove: (showId: number) => void
  onDelete: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: shelf.id })

  return (
    <motion.section
      ref={setNodeRef}
      layout
      transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.82 }}
      className={cn('rounded-[30px] py-2 transition-colors', isOver && 'bg-[#f5c453]/10')}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <button
            {...shelfHandleProps}
            className="grid h-9 w-9 shrink-0 touch-none place-items-center rounded-full bg-white/[0.055] text-white/38 active:scale-95"
            aria-label={`Move ${shelf.name}`}
          >
            <GripVertical size={14} />
          </button>
          <button onClick={onToggleCollapsed} className="min-w-0 text-left active:scale-[0.99]" aria-expanded={!collapsed}>
            <h3 className="truncate text-[23px] font-black leading-none tracking-[-0.08em] text-white">{shelf.name}</h3>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">{items.length} pick{items.length === 1 ? '' : 's'}</p>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapsed}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.055] text-white/48 active:scale-95"
            aria-label={collapsed ? `Expand ${shelf.name}` : `Collapse ${shelf.name}`}
            aria-expanded={!collapsed}
          >
            <ChevronDown size={17} className={cn('transition-transform duration-300', collapsed && '-rotate-90')} />
          </button>
          <button onClick={onAdd} className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c453] text-black shadow-[0_16px_32px_rgba(245,196,83,0.16)] active:scale-95" aria-label={`Add to ${shelf.name}`}>
            <Plus size={18} strokeWidth={3} />
          </button>
          <button onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.045] text-white/30 active:scale-95" aria-label={`Delete ${shelf.name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {collapsed ? (
        <motion.button
          key="collapsed"
          layout
          transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.82 }}
          onClick={onToggleCollapsed}
          className="relative flex h-20 w-full items-center overflow-hidden rounded-[25px] bg-white/[0.035] px-3 text-left ring-1 ring-white/[0.045] active:scale-[0.99]"
        >
          {items.length > 0 ? (
            <div className="flex -space-x-4">
              {items.slice(0, 6).map((item) => (
                <div key={item.id} className="h-14 w-11 overflow-hidden rounded-[12px] bg-white/[0.05] shadow-[0_10px_24px_rgba(0,0,0,0.35)] ring-1 ring-black/30">
                  {item.show.posterPath || item.show.backdropPath ? (
                    <img
                      src={imgUrl(item.show.posterPath ?? item.show.backdropPath, item.show.posterPath ? 'w185' : 'w342')}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/[0.06]" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/28">Empty shelf</span>
          )}
          <div className="ml-auto rounded-full bg-black/24 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
            Expand
          </div>
        </motion.button>
      ) : (
        <motion.div layout transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.82 }}>
          <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
            {items.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {items.map((item) => (
                  <SortableWatchlistCard key={item.id} item={item} onOpenShow={onOpenShow} onRemove={onRemove} />
                ))}
              </div>
            ) : (
              <button onClick={onAdd} className="flex min-h-[114px] w-full items-center justify-center rounded-[28px] border border-dashed border-white/[0.14] text-[10px] font-black uppercase tracking-[0.2em] text-white/34 active:scale-[0.99]">
                Add the first pick
              </button>
            )}
          </SortableContext>
        </motion.div>
      )}
    </motion.section>
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
      className="relative aspect-[5/7] w-full overflow-hidden rounded-[22px] bg-[#151117] shadow-[0_14px_30px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.07] active:scale-[0.98]"
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
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="line-clamp-2 text-[13px] font-black leading-[0.94] tracking-[-0.055em] text-white">{item.show.name}</p>
          {item.show.year && <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/34">{item.show.year}</p>}
        </div>
      </button>
      <div className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/34 text-white/42 backdrop-blur-xl">
        <GripVertical size={12} />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.show.id)
        }}
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/34 text-white/62 backdrop-blur-xl active:scale-95"
        aria-label={`Remove ${item.show.name} from shelf`}
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  )
}
