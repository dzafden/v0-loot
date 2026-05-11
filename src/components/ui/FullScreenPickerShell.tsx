import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export const fullScreenOverlayClass = 'fixed inset-0 flex flex-col bg-[#0b090d] backdrop-blur-3xl'

export function FullScreenOverlayShell({
  children,
  className,
  zIndex = 'z-50',
}: {
  children: ReactNode
  className?: string
  zIndex?: string
}) {
  return (
    <div className={cn(fullScreenOverlayClass, zIndex, className)}>
      {children}
    </div>
  )
}

export function PickerCloseButton({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <button
      onClick={onClose}
      className={cn('grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-90', className)}
      aria-label="Close"
    >
      <X size={20} />
    </button>
  )
}

export function PickerTopBar({
  onClose,
  left,
  className,
}: {
  onClose: () => void
  left?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex shrink-0 items-center justify-between px-4 pb-3 pt-12', className)}>
      <div className="min-w-0">{left}</div>
      <PickerCloseButton onClose={onClose} />
    </div>
  )
}
