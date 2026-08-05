import { useEffect, useRef, useState } from 'react'
import { getStudioCatalogue, imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'

interface StudioTitlePreview {
  id: number
  mediaType: 'tv' | 'movie'
  artwork: string | null
}

export interface StudioCatalogueStats {
  tvCount: number
  movieCount: number
}

interface StudioCoverData extends StudioCatalogueStats {
  studioId: number
  titles: StudioTitlePreview[]
}

const studioCoverCache = new Map<number, StudioCoverData>()

export function StudioCover({
  studioId,
  className,
  onCatalogue,
}: {
  studioId: number
  className?: string
  onCatalogue: (stats: StudioCatalogueStats) => void
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [resolved, setResolved] = useState<StudioCoverData | null>(() => studioCoverCache.get(studioId) ?? null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      const frame = globalThis.requestAnimationFrame(() => {
        setNearViewport(true)
      })
      return () => globalThis.cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setNearViewport(true)
      observer.disconnect()
    }, { rootMargin: '460px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nearViewport || resolved?.studioId === studioId) return
    let active = true
    void getStudioCatalogue(studioId, 1)
      .then((catalogue) => {
        const selected = [...catalogue.results]
          .filter((show) => Boolean(show.poster_path ?? show.backdrop_path))
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
          .slice(0, 5)
        const titles = selected.map((show) => ({
          id: show.id,
          mediaType: show.mediaType ?? 'tv',
          artwork: show.poster_path ?? show.backdrop_path ?? null,
        } satisfies StudioTitlePreview))
        const next = { studioId, titles, tvCount: catalogue.tvCount, movieCount: catalogue.movieCount }
        studioCoverCache.set(studioId, next)
        if (active) setResolved(next)
      })
      .catch(() => {
        const next = { studioId, titles: [], tvCount: 0, movieCount: 0 }
        studioCoverCache.set(studioId, next)
        if (active) setResolved(next)
      })
    return () => { active = false }
  }, [nearViewport, resolved?.studioId, studioId])

  useEffect(() => {
    if (!resolved || resolved.studioId !== studioId) return
    onCatalogue({ tvCount: resolved.tvCount, movieCount: resolved.movieCount })
  }, [onCatalogue, resolved, studioId])

  const titles = resolved?.studioId === studioId ? resolved.titles : []

  return (
    <span
      ref={ref}
      className={cn('flex gap-2 overflow-hidden', className)}
      aria-hidden
    >
      {titles.length ? (
        titles.map((title) => (
          <span key={`${title.mediaType}:${title.id}`} className="h-full min-w-0 flex-1 overflow-hidden rounded-[12px] bg-white/[0.05]">
            {title.artwork && <img src={imgUrl(title.artwork, 'w342')} alt="" className="h-full w-full object-cover" />}
          </span>
        ))
      ) : (
        <span className="h-full flex-1 bg-white/[0.03]" />
      )}
    </span>
  )
}
