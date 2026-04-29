import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  children: ReactNode
}

export function Drawer({ open, onClose, side = 'right', children }: Props) {
  const fromX = side === 'right' ? '100%' : '-100%'
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: fromX }}
            animate={{ x: 0 }}
            exit={{ x: fromX }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-0 bottom-0 ${
              side === 'right' ? 'right-0' : 'left-0'
            } w-72 max-w-[80vw] bg-zinc-950 border-l border-white/10 flex flex-col`}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
