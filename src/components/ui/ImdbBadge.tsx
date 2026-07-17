import { useImdbRating } from '../../lib/imdbRatings'
import { cn } from '../../lib/utils'

export function ImdbBadge({
  showId,
  compact = false,
  className,
}: {
  showId: number
  compact?: boolean
  className?: string
}) {
  const imdb = useImdbRating(showId)
  if (!imdb) return null

  const votes = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(imdb.votes)
  return (
    <span
      className={cn(
        'inline-flex items-center overflow-hidden rounded-[8px] bg-black/82 font-black text-white shadow-[0_7px_18px_rgba(0,0,0,0.48)] ring-1 ring-white/10 backdrop-blur-xl',
        compact ? 'h-6 text-[10px]' : 'h-7 text-[11px]',
        className,
      )}
      title={`IMDb ${imdb.rating.toFixed(1)} from ${votes} ratings`}
      aria-label={`IMDb rating ${imdb.rating.toFixed(1)}`}
    >
      <span className="grid h-full place-items-center bg-[#f5c518] px-1.5 text-black">IMDb</span>
      <span className="px-1.5 tabular-nums">{imdb.rating.toFixed(1)}</span>
    </span>
  )
}
