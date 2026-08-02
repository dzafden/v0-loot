import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { MediaType, Show } from '../../types'
import { getShowDetail, imgUrl } from '../../lib/tmdb'
import { getStudio, STUDIOS } from '../../lib/studios'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface FeaturedStudioWorld {
  studioId: number
  representativeId: number
  representativeMediaType: MediaType
}

const FEATURED_STUDIO_WORLDS: FeaturedStudioWorld[] = [
  { studioId: 10342, representativeId: 129, representativeMediaType: 'movie' },
  { studioId: 21444, representativeId: 95479, representativeMediaType: 'tv' },
  { studioId: 11537, representativeId: 14836, representativeMediaType: 'movie' },
  { studioId: 23948, representativeId: 441130, representativeMediaType: 'movie' },
]

interface Props {
  shows: Show[]
  onBrowseAll: () => void
  onOpenStudio: (studioId: number) => void
}

export function StudioFeedRail({ shows, onBrowseAll, onOpenStudio }: Props) {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const loadStarted = useRef(false)
  const [artworkByStudio, setArtworkByStudio] = useState<Record<number, string>>({})
  const watchedByStudio = useMemo(() => {
    const counts = new Map<number, number>()
    for (const show of shows) {
      for (const studioId of new Set(show.studioIds ?? [])) {
        counts.set(studioId, (counts.get(studioId) ?? 0) + 1)
      }
    }
    return counts
  }, [shows])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const loadArtwork = () => {
      if (loadStarted.current) return
      loadStarted.current = true
      void Promise.all(FEATURED_STUDIO_WORLDS.map(async (world) => {
        try {
          const detail = await getShowDetail(world.representativeId, world.representativeMediaType)
          return [world.studioId, detail.backdrop_path ?? detail.poster_path ?? ''] as const
        } catch {
          return [world.studioId, ''] as const
        }
      })).then((entries) => {
        setArtworkByStudio(Object.fromEntries(entries.filter(([, path]) => Boolean(path))))
      })
    }

    if (typeof IntersectionObserver === 'undefined') {
      globalThis.requestAnimationFrame(loadArtwork)
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      loadArtwork()
    }, { rootMargin: '480px 0px' })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="mb-10 mt-5" aria-labelledby="studio-feed-title">
      <div className="mb-4 flex items-end justify-between gap-4 px-4">
        <div className="min-w-0">
          <h2 id="studio-feed-title" className="text-[28px] font-black leading-none tracking-[-0.055em] text-white/94">Studios</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/46">The houses behind the worlds you love.</p>
        </div>
        <button onClick={onBrowseAll} className="group flex h-11 shrink-0 items-center gap-1 text-[12px] font-semibold text-white/52 transition-colors hover:text-white active:scale-[0.98]">
          Browse all {STUDIOS.length}<ChevronRight size={16} className="transition-transform group-active:translate-x-0.5" />
        </button>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {FEATURED_STUDIO_WORLDS.map((world, index) => {
          const studio = getStudio(world.studioId)
          if (!studio) return null
          const artwork = artworkByStudio[studio.id]
          const watchedCount = watchedByStudio.get(studio.id) ?? 0
          const context = watchedCount > 0
            ? `${watchedCount} ${watchedCount === 1 ? 'title' : 'titles'} in your record`
            : `About ${studio.approxCount} ${studio.approxCount === 1 ? 'title' : 'titles'}`

          return (
            <motion.button
              key={studio.id}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.045, 0.14), duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onOpenStudio(studio.id)}
              className="group relative h-[214px] w-[252px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-[#111116] text-left shadow-[0_18px_44px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.08] active:scale-[0.985]"
              aria-label={`Open ${studio.name} studio page`}
            >
              {artwork ? (
                <img src={imgUrl(artwork, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" aria-hidden />
              ) : (
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.08),transparent_42%),linear-gradient(145deg,#17171d,#0b0b0e)]" aria-hidden />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black via-black/22 to-black/5" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 z-10 p-4">
                <span className="block text-[20px] font-black leading-none tracking-[-0.045em] text-white/94">{studio.name}</span>
                <span className="mt-2 block text-[11px] font-medium text-white/48">{context}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
