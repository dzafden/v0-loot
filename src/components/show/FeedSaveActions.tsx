import { useState, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Eye } from 'lucide-react'
import { cn } from '../../lib/utils'

export function FeedSaveActions({
  isSeen,
  isWatchlisted,
  onSeen,
  onWatchlist,
  onSuccess,
  size = 'sm',
}: {
  isSeen: boolean
  isWatchlisted: boolean
  onSeen: () => Promise<void>
  onWatchlist: () => Promise<void>
  onSuccess?: (action: 'seen' | 'watchlist') => void
  size?: 'sm' | 'lg'
}) {
  const [saving, setSaving] = useState<'seen' | 'watchlist' | null>(null)
  const [optimisticSeen, setOptimisticSeen] = useState(false)
  const [optimisticWatchlist, setOptimisticWatchlist] = useState(false)
  const [errorAction, setErrorAction] = useState<'seen' | 'watchlist' | null>(null)
  const seen = isSeen || optimisticSeen
  const watchlisted = isWatchlisted || optimisticWatchlist

  const save = async (action: 'seen' | 'watchlist', event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (saving || (action === 'seen' ? seen : watchlisted)) return
    setSaving(action)
    setErrorAction(null)
    try {
      await (action === 'seen' ? onSeen() : onWatchlist())
      if (action === 'seen') setOptimisticSeen(true)
      else setOptimisticWatchlist(true)
      navigator.vibrate?.([6, 20, 10])
      onSuccess?.(action)
    } catch {
      setErrorAction(action)
      navigator.vibrate?.([80])
      window.setTimeout(() => setErrorAction(null), 1800)
    } finally {
      setSaving(null)
    }
  }

  const hitAreaClass = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11'
  const visualClass = size === 'lg' ? 'h-10 w-10' : 'h-9 w-9'
  const iconSize = size === 'lg' ? 19 : 17
  const idleClass = 'border-white/20 bg-black/40 text-white/90'
  const selectedClass = 'border-[#f5c453]/45 bg-[#f5c453]/15 text-[#f5c453]'

  return (
    <div className="flex items-center gap-0.5">
      <motion.button
        whileTap={!seen ? { scale: 0.92 } : undefined}
        onClick={(event) => void save('seen', event)}
        disabled={seen || saving !== null}
        aria-label={seen ? 'Seen and in collection' : 'Mark as seen and add to collection'}
        aria-pressed={seen}
        className={cn('relative grid place-items-center rounded-full', hitAreaClass)}
      >
        <span
          className={cn(
            'grid place-items-center rounded-full border shadow-[0_2px_10px_rgba(0,0,0,0.22)] transition-colors',
            visualClass,
            errorAction === 'seen' ? 'border-rose-300/80 bg-rose-500/85 text-white' : seen ? selectedClass : idleClass,
          )}
        >
          {saving === 'seen' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <Eye size={iconSize} strokeWidth={2.7} />}
        </span>
      </motion.button>
      <motion.button
        whileTap={!watchlisted ? { scale: 0.92 } : undefined}
        onClick={(event) => void save('watchlist', event)}
        disabled={watchlisted || saving !== null}
        aria-label={watchlisted ? 'In watchlist' : 'Add directly to watchlist'}
        aria-pressed={watchlisted}
        className={cn('relative grid place-items-center rounded-full', hitAreaClass)}
      >
        <span
          className={cn(
            'grid place-items-center rounded-full border shadow-[0_2px_10px_rgba(0,0,0,0.22)] transition-colors',
            visualClass,
            errorAction === 'watchlist' ? 'border-rose-300/80 bg-rose-500/85 text-white' : watchlisted ? selectedClass : idleClass,
          )}
        >
          {saving === 'watchlist' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <Bookmark size={iconSize} strokeWidth={2.6} fill={watchlisted ? 'currentColor' : 'none'} />}
        </span>
      </motion.button>
    </div>
  )
}
