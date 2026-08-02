import { useEffect, useRef, useState } from 'react'
import { getStudioSpotlight, imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'

const spotlightCache = new Map<number, string | null>()

export function StudioCover({ studioId, className }: { studioId: number; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [resolved, setResolved] = useState<{ studioId: number; path: string | null } | null>(() => {
    if (!spotlightCache.has(studioId)) return null
    return { studioId, path: spotlightCache.get(studioId) ?? null }
  })

  useEffect(() => {
    const node = ref.current
    if (!node || nearViewport) return
    if (typeof IntersectionObserver === 'undefined') {
      const frame = globalThis.requestAnimationFrame(() => setNearViewport(true))
      return () => globalThis.cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      setNearViewport(true)
    }, { rootMargin: '460px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [nearViewport])

  useEffect(() => {
    if (!nearViewport || resolved?.studioId === studioId) return
    let active = true
    void getStudioSpotlight(studioId)
      .then((show) => {
        const path = show?.backdrop_path ?? show?.poster_path ?? null
        spotlightCache.set(studioId, path)
        if (active) setResolved({ studioId, path })
      })
      .catch(() => {
        spotlightCache.set(studioId, null)
        if (active) setResolved({ studioId, path: null })
      })
    return () => { active = false }
  }, [nearViewport, resolved?.studioId, studioId])

  const path = resolved?.studioId === studioId ? resolved.path : null
  return (
    <span ref={ref} className={cn('block overflow-hidden bg-[#141419]', className)} aria-hidden>
      {path ? (
        <img src={imgUrl(path, 'w500')} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full bg-[radial-gradient(circle_at_72%_20%,rgba(255,255,255,0.09),transparent_42%),linear-gradient(145deg,#1c1c22,#0b0b0e)]" />
      )}
    </span>
  )
}
