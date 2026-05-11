import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

type SaveStateButtonProps = {
  saved: boolean
  saving?: boolean
  onSave?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void
  onSuccess?: () => void
  onError?: () => void
  size?: 'sm' | 'md' | 'lg'
  shape?: 'round' | 'soft'
  className?: string
  wrapperClassName?: string
  ariaLabel?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
}

const iconSizes = {
  sm: { check: 14, plus: 16, spinner: 'h-3.5 w-3.5' },
  md: { check: 16, plus: 19, spinner: 'h-4 w-4' },
  lg: { check: 20, plus: 28, spinner: 'h-4 w-4' },
}

export function SaveStateButton({
  saved,
  saving = false,
  onSave,
  onSuccess,
  onError,
  size = 'md',
  shape = 'round',
  className,
  wrapperClassName,
  ariaLabel,
}: SaveStateButtonProps) {
  const controls = useAnimation()
  const [showBurst, setShowBurst] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const icons = iconSizes[size]

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (saved || saving) return
    setSaveError(false)
    try {
      await onSave?.(event)
      navigator.vibrate?.([6, 20, 10])
      setShowBurst(true)
      void controls.start({
        scale: [1, 1.32, 0.9, 1],
        transition: { duration: 0.4, times: [0, 0.28, 0.65, 1], ease: 'easeOut' },
      })
      window.setTimeout(() => setShowBurst(false), 600)
      onSuccess?.()
    } catch {
      setSaveError(true)
      navigator.vibrate?.([80])
      window.setTimeout(() => setSaveError(false), 2000)
      onError?.()
    }
  }

  return (
    <div className={cn('relative', sizeClasses[size], wrapperClassName)}>
      <AnimatePresence>
        {showBurst && (
          <motion.div
            key="burst"
            initial={{ scale: 0.85, opacity: 0.9 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={cn('pointer-events-none absolute inset-0 border-2 border-[#f5c453]', shape === 'round' ? 'rounded-full' : 'rounded-xl')}
          />
        )}
      </AnimatePresence>

      <motion.button
        animate={controls}
        whileTap={!saved ? { scale: 0.72 } : undefined}
        onClick={handleClick}
        disabled={saved || saving}
        aria-label={ariaLabel ?? (saved ? 'Saved' : 'Save')}
        className={cn(
          'relative z-10 grid h-full w-full place-items-center shadow-[0_14px_28px_rgba(0,0,0,0.36)] transition-colors',
          shape === 'round' ? 'rounded-full' : 'rounded-xl',
          saved
            ? 'cursor-default border border-white/10 bg-black/60 text-white backdrop-blur-md'
            : saveError
              ? 'bg-rose-500 text-white'
              : 'bg-[#f5c453] text-black',
          className,
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {saved ? (
            <motion.span
              key="saved"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="grid place-items-center"
            >
              <Check size={icons.check} strokeWidth={3} />
            </motion.span>
          ) : saving ? (
            <motion.span
              key="saving"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.12 }}
              className={cn('animate-spin rounded-full border-2 border-black/30 border-t-black', icons.spinner)}
            />
          ) : (
            <motion.span
              key="plus"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.14 }}
              className="grid place-items-center"
            >
              <Plus size={icons.plus} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
