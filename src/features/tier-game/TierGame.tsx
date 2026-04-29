import { useMemo, useState } from 'react'
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
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import type { Show, Tier } from '../../types'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { clearAllTiers, reorderTier, setTier } from '../../data/queries'
import { LootCard } from '../../components/card/LootCard'
import { getRarity } from '../../lib/rarity'

const TIERS: { id: Tier; label: string; color: string }[] = [
  { id: 'S', label: 'S', color: '#ff4d4d' },
  { id: 'A', label: 'A', color: '#ff9f4a' },
  { id: 'B', label: 'B', color: '#ffd84a' },
  { id: 'C', label: 'C', color: '#7ed957' },
  { id: 'D', label: 'D', color: '#4a90ff' },
]

const POOL = '__pool__'

export function TierGame() {
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const assignments = useDexieQuery(
    ['tierAssignments'],
    () => db.tierAssignments.toArray(),
    [],
    [],
  )

  const [pendingDrop, setPendingDrop] = useState<number | null>(null)

  const grouped = useMemo(() => {
    const map: Record<string, Show[]> = { [POOL]: [], S: [], A: [], B: [], C: [], D: [] }
    const tierByShow = new Map<number, { tier: Tier; position: number }>()
    for (const a of assignments) tierByShow.set(a.showId, { tier: a.tier, position: a.position })
    const sorted = [...shows].sort((a, b) => {
      const ta = tierByShow.get(a.id)
      const tb = tierByShow.get(b.id)
      if (ta && tb) return ta.position - tb.position
      return a.name.localeCompare(b.name)
    })
    for (const s of sorted) {
      const t = tierByShow.get(s.id)
      map[t?.tier ?? POOL].push(s)
    }
    return map
  }, [shows, assignments])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  )

  const findContainer = (id: string | number): string | null => {
    if (typeof id === 'string' && (id === POOL || TIERS.some((t) => t.id === id))) return id as string
    for (const k of Object.keys(grouped)) {
      if (grouped[k].some((s) => s.id === Number(id))) return k
    }
    return null
  }

  const handleEnd = async (e: DragEndEvent) => {
    if (!e.over) return
    const overId = e.over.id
    const activeId = Number(e.active.id)
    const target = findContainer(overId)
    const source = findContainer(activeId)
    if (!target || !source) return

    setPendingDrop(activeId)
    setTimeout(() => setPendingDrop(null), 350)

    if (target === source) {
      // reorder inside container
      const ids = grouped[source].map((s) => s.id)
      const oldIdx = ids.indexOf(activeId)
      const overIdx = ids.indexOf(Number(overId))
      if (oldIdx < 0 || overIdx < 0) return
      const reordered = [...ids]
      reordered.splice(oldIdx, 1)
      reordered.splice(overIdx, 0, activeId)
      if (source !== POOL) await reorderTier(source as Tier, reordered)
      return
    }
    // moved between containers
    if (target === POOL) {
      await setTier(activeId, null)
    } else {
      await setTier(activeId, target as Tier)
    }
  }

  return (
    <div className="px-3 pb-20">
      <div className="flex items-center justify-end py-2">
        <button
          onClick={() => void clearAllTiers()}
          className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-white/80"
        >
          Reset all
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
        <div className="flex flex-col gap-2">
          {TIERS.map((t) => (
            <TierRow
              key={t.id}
              tier={t.id}
              color={t.color}
              shows={grouped[t.id]}
              pendingDrop={pendingDrop}
            />
          ))}
        </div>
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-white/70 mb-2 px-1">Unranked</h2>
          <PoolDrop shows={grouped[POOL]} pendingDrop={pendingDrop} />
        </div>
      </DndContext>
    </div>
  )
}

function TierRow({
  tier,
  color,
  shows,
  pendingDrop,
}: {
  tier: Tier
  color: string
  shows: Show[]
  pendingDrop: number | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tier })
  return (
    <div
      ref={setNodeRef}
      className={`flex items-stretch gap-2 rounded-2xl border ${
        isOver ? 'border-white/40 bg-white/[0.04]' : 'border-white/10 bg-white/[0.02]'
      } overflow-hidden`}
    >
      <div
        className="w-12 grid place-items-center font-black text-2xl text-black"
        style={{ background: color }}
      >
        {tier}
      </div>
      <SortableContext items={shows.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="flex-1 flex flex-wrap gap-2 p-2 min-h-[120px]">
          {shows.map((s) => (
            <SortableTile key={s.id} show={s} bumping={pendingDrop === s.id} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function PoolDrop({ shows, pendingDrop }: { shows: Show[]; pendingDrop: number | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border ${
        isOver ? 'border-white/40 bg-white/[0.04]' : 'border-white/10 bg-white/[0.02]'
      } p-2`}
    >
      <SortableContext items={shows.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {shows.map((s) => (
            <SortableTile key={s.id} show={s} bumping={pendingDrop === s.id} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableTile({ show, bumping }: { show: Show; bumping: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: show.id })
  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      animate={bumping ? { scale: [1, 1.18, 0.96, 1] } : { scale: 1 }}
      transition={bumping ? { duration: 0.4, ease: 'easeOut' } : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
      className="w-20"
    >
      <LootCard show={show} rarity={getRarity(show, null, false)} compact disableTilt />
    </motion.div>
  )
}
