import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { db } from '../../data/db'
import { deleteCanvasItem, updateCanvasItem } from '../../data/queries'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { CanvasItem, Show } from '../../types'

interface Props {
  onClose: () => void
  onOpenShow: (show: Show) => void
}

type DragState =
  | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number }
  | { kind: 'item'; id: string; startX: number; startY: number; currentX: number; currentY: number; originX: number; originY: number; moved: boolean }
  | null

export function ProfileCanvas({ onClose, onOpenShow }: Props) {
  const items = useDexieQuery(['canvasItems'], () => db.canvasItems.orderBy('createdAt').toArray(), [], [])
  const [scale, setScale] = useState(0.92)
  const [pan, setPan] = useState({ x: -36, y: -20 })
  const [drag, setDrag] = useState<DragState>(null)
  const holdTimer = useRef<number | null>(null)
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  const clearHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  const zoom = (delta: number) => {
    setScale((value) => Math.max(0.55, Math.min(1.8, Number((value + delta).toFixed(2)))))
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 8) clearHold()
    if (drag.kind === 'pan') {
      setPan({ x: drag.originX + dx, y: drag.originY + dy })
      return
    }
    setDrag({ ...drag, currentX: event.clientX, currentY: event.clientY, moved: drag.moved || Math.abs(dx) + Math.abs(dy) > 8 })
  }

  const handlePointerUp = async (event: PointerEvent<HTMLDivElement>) => {
    clearHold()
    if (!drag) return
    if (drag.kind === 'item') {
      const dx = (event.clientX - drag.startX) / scale
      const dy = (event.clientY - drag.startY) / scale
      if (drag.moved || Math.abs(dx) + Math.abs(dy) > 4) {
        await updateCanvasItem(drag.id, { x: drag.originX + dx, y: drag.originY + dy })
      }
    }
    setDrag(null)
  }

  const openById = (id: string) => {
    const item = itemsById.get(id)
    if (!item) return
    onOpenShow(item.show)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-[#050507] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(245,196,83,0.16),transparent_24rem),radial-gradient(circle_at_86%_22%,rgba(168,85,247,0.12),transparent_22rem)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4 pt-4">
        <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full bg-black/38 text-white/86 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95" aria-label="Close canvas">
          <ChevronLeft size={22} />
        </button>
        <div className="rounded-full bg-black/34 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/58 backdrop-blur-xl ring-1 ring-white/[0.08]">
          Canvas
        </div>
        <div className="flex gap-2">
          <button onClick={() => zoom(-0.12)} className="grid h-12 w-12 place-items-center rounded-full bg-black/38 text-white/74 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95" aria-label="Zoom out">
            <Minus size={18} />
          </button>
          <button onClick={() => zoom(0.12)} className="grid h-12 w-12 place-items-center rounded-full bg-black/38 text-white/74 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95" aria-label="Zoom in">
            <Plus size={18} />
          </button>
        </div>
      </header>

      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-x-8 top-[38%] z-10 text-center">
          <p className="text-[38px] font-black leading-[0.85] tracking-[-0.1em] text-white/90">Hold a data point to drop it here.</p>
          <p className="mx-auto mt-4 max-w-[260px] text-sm font-bold text-white/38">Open a show, switch to Data, then press and hold a fact.</p>
        </div>
      )}

      <div
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(event) => {
          setDrag({ kind: 'pan', startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y })
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearHold()
          setDrag(null)
        }}
        onWheel={(event) => {
          event.preventDefault()
          zoom(event.deltaY > 0 ? -0.08 : 0.08)
        }}
      >
        <div
          className="absolute left-0 top-0 h-[1800px] w-[1800px] origin-top-left"
          style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})` }}
        >
          {items.map((item) => (
            <CanvasCard
              key={item.id}
              item={item}
              dragging={drag?.kind === 'item' && drag.id === item.id ? drag : null}
              onPointerDown={(event) => {
                event.stopPropagation()
                setDrag({ kind: 'item', id: item.id, startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY, originX: item.x, originY: item.y, moved: false })
                clearHold()
                holdTimer.current = window.setTimeout(() => openById(item.id), 620)
              }}
              onDelete={() => void deleteCanvasItem(item.id)}
              canvasScale={scale}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CanvasCard({
  item,
  dragging,
  onPointerDown,
  onDelete,
  canvasScale,
}: {
  item: CanvasItem
  dragging: Extract<DragState, { kind: 'item' }> | null
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onDelete: () => void
  canvasScale: number
}) {
  const x = dragging ? dragging.originX + (dragging.currentX - dragging.startX) / canvasScale : item.x
  const y = dragging ? dragging.originY + (dragging.currentY - dragging.startY) / canvasScale : item.y
  const isLogo = item.imageType === 'logo' && item.imagePath
  const isPerson = item.imageType === 'person' && item.imagePath
  const isStat = item.kind === 'rating' || item.kind === 'episodes' || item.kind === 'seasons'

  return (
    <motion.div
      layout
      onPointerDown={onPointerDown}
      className={cn(
        'absolute touch-none select-none overflow-hidden rounded-[30px] bg-black/72 p-3 text-left shadow-[0_24px_70px_rgba(0,0,0,0.56)] ring-1 ring-white/[0.1] backdrop-blur-xl',
        isLogo && 'w-[260px] min-h-[142px]',
        isPerson && 'h-[292px] w-[190px] rounded-[34px] p-0',
        !isLogo && !isPerson && (isStat ? 'w-[190px]' : 'w-[220px]'),
      )}
      style={{ left: x, top: y, scale: item.scale, transformOrigin: 'center center' }}
      whileTap={{ scale: item.scale * 1.035 }}
    >
      <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 88% 0%, ${item.accent ?? '#f5c453'}36, transparent 12rem)` }} />
      {isPerson && (
        <img
          src={imgUrl(item.imagePath!, 'w342')}
          alt={item.value}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}
      {!isLogo && !isPerson && (item.show.backdropPath || item.show.posterPath) && (
        <img
          src={imgUrl(item.show.backdropPath ?? item.show.posterPath, item.show.backdropPath ? 'w500' : 'w342')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.24]"
          draggable={false}
        />
      )}
      <div className={cn('absolute inset-0', isPerson ? 'bg-gradient-to-t from-black/94 via-black/18 to-black/12' : 'bg-gradient-to-t from-black/92 via-black/64 to-black/20')} />
      <div className={cn('relative z-10', isPerson && 'flex h-full flex-col justify-between p-3')}>
        <div className={cn('mb-4 flex items-center justify-between gap-3', isPerson && 'mb-0')}>
          <span className="rounded-full bg-white/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/58">{isLogo ? item.show.name : item.label}</span>
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/34 active:scale-95"
            aria-label="Remove canvas item"
          >
            <Trash2 size={13} />
          </button>
        </div>
        {isLogo ? (
          <div className="grid min-h-[76px] place-items-center px-2">
            <img
              src={imgUrl(item.imagePath!, 'w500')}
              alt={item.show.name}
              className="max-h-[84px] max-w-full object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.85)]"
              draggable={false}
            />
          </div>
        ) : isPerson ? (
          <div>
            <p className="line-clamp-3 text-[25px] font-black leading-[0.88] tracking-[-0.085em] text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.65)]">{item.value.split(' / ')[0]}</p>
            <p className="mt-2 line-clamp-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/62">{item.value.split(' / ')[1] ?? item.show.name}</p>
            <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/28">Hold to inspect</p>
          </div>
        ) : (
          <>
            <p className={cn('line-clamp-4 font-black leading-[0.88] tracking-[-0.085em] text-white', isStat ? 'text-[42px]' : 'text-[26px]')}>{item.value}</p>
            <p className="mt-4 truncate text-[10px] font-black uppercase tracking-[0.18em] text-white/34">{item.show.name}</p>
          </>
        )}
        {!isPerson && <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/20">Hold to inspect</p>}
      </div>
    </motion.div>
  )
}
