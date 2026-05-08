import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
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
import type { Show } from '../../types'
import { LootCard } from '../card/LootCard'
import { reorderTop8, setTop8 } from '../../data/queries'
import { getRarity } from '../../lib/rarity'

interface Props {
  shows: Show[]
  onTap?: (s: Show) => void
}

export function Top8Row({ shows, onTap }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  )

  const handleEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const oldIdx = shows.findIndex((s) => s.id === Number(e.active.id))
    const newIdx = shows.findIndex((s) => s.id === Number(e.over!.id))
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(shows, oldIdx, newIdx)
    void reorderTop8(reordered.map((s) => s.id))
  }

  if (!shows.length) return null

  return (
    <div className="pb-4 pt-2">
      <div className="px-4 mb-3 flex items-baseline justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.28em] font-black text-[#f5c453]/80">
          Top 8 Shrine
        </h2>
        <span className="text-[11px] text-white/40">{shows.length}/8</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
        <SortableContext items={shows.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x">
            <AnimatePresence>
              {shows.map((s, i) => (
                <Top8Item key={s.id} show={s} index={i} onTap={onTap} />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function Top8Item({ show, index, onTap }: { show: Show; index: number; onTap?: (s: Show) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: show.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }
  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      initial={{ opacity: 0, y: -40, scale: 0.6, rotate: -10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 360, damping: 18, delay: index * 0.06 },
      }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className="snap-start shrink-0 relative w-40"
    >
      {/* shockwave ring on entry */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ boxShadow: '0 0 0 0px rgba(255,184,74,0.7)' }}
        animate={{ boxShadow: '0 0 0 18px rgba(255,184,74,0)' }}
        transition={{ duration: 0.9, delay: index * 0.06 + 0.1 }}
      />
      {/* persistent aura */}
      <motion.div
        aria-hidden
        className="absolute -inset-2 rounded-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side, rgba(245,196,83,0.34), rgba(245,196,83,0) 70%)',
        }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <LootCard
        show={show}
        rarity={getRarity(show, null, true)}
        onTap={onTap}
        disableTilt
        onLongPress={(s) => void setTop8(s.id, null)}
      />
      <div className="absolute -top-2 -left-2 grid place-items-center h-8 w-8 rounded-full bg-[#f5c453] text-black font-black text-xs shadow-[0_0_22px_rgba(245,196,83,0.46)]">
        {index + 1}
      </div>
    </motion.div>
  )
}
