import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { Show } from '../../types'

export interface ContextAction {
  id: string
  label: string
  icon?: string
  onSelect: (show: Show) => void
  disabled?: boolean
  danger?: boolean
}

interface Props {
  show: Show | null
  anchor: { x: number; y: number } | null
  actions: ContextAction[]
  onClose: () => void
}

export function CardContextMenu({ show, anchor, actions, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!show) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [show, onClose])

  return (
    <AnimatePresence>
      {show && anchor && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="fixed z-50 min-w-[220px] rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur p-1 text-white"
            style={positionStyle(anchor)}
          >
            <div className="px-3 py-2 text-xs uppercase tracking-wider text-white/50">
              {show.name}
            </div>
            <div className="h-px bg-white/10 mb-1" />
            {actions.map((a) => (
              <button
                key={a.id}
                disabled={a.disabled}
                onClick={() => {
                  a.onSelect(show)
                  onClose()
                }}
                className={`w-full text-left rounded-xl px-3 py-2.5 text-sm flex items-center gap-3 transition-colors disabled:opacity-40 ${
                  a.danger ? 'hover:bg-rose-500/20 text-rose-200' : 'hover:bg-white/10'
                }`}
              >
                {a.icon ? <span className="text-base w-5 text-center">{a.icon}</span> : <span className="w-5" />}
                <span>{a.label}</span>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function positionStyle(anchor: { x: number; y: number }) {
  const margin = 12
  const w = 240
  const h = 320
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = anchor.x
  let top = anchor.y
  if (left + w + margin > vw) left = vw - w - margin
  if (top + h + margin > vh) top = Math.max(margin, vh - h - margin)
  return { left, top }
}
