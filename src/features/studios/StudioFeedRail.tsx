import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { getStudio, STUDIOS } from '../../lib/studios'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { StudioCover, type StudioCatalogueStats } from './StudioCover'

const FEATURED_STUDIO_IDS = [10342, 21444] as const

interface Props {
  onBrowseAll: () => void
  onOpenStudio: (studioId: number) => void
}

export function StudioFeedRail({ onBrowseAll, onOpenStudio }: Props) {
  const reducedMotion = useReducedMotion()
  const [studioStats, setStudioStats] = useState<Record<number, StudioCatalogueStats>>({})
  const updateStudioStats = useCallback((studioId: number, stats: StudioCatalogueStats) => {
    setStudioStats((current) => {
      const previous = current[studioId]
      if (previous?.tvCount === stats.tvCount && previous.movieCount === stats.movieCount) return current
      return { ...current, [studioId]: stats }
    })
  }, [])

  return (
    <section className="mb-10 mt-7" aria-labelledby="studio-feed-title">
      <div className="mb-4 flex items-center justify-between gap-4 px-4">
        <h2 id="studio-feed-title" className="text-[28px] font-black leading-none tracking-[-0.055em] text-white/94">Studios</h2>
        <button onClick={onBrowseAll} className="group flex h-11 shrink-0 items-center gap-1 text-[13px] font-semibold text-white/58 transition-colors hover:text-white active:opacity-60">
          All {STUDIOS.length}<ChevronRight size={16} className="transition-transform group-active:translate-x-0.5" aria-hidden />
        </button>
      </div>

      <div className="space-y-6 px-4">
        {FEATURED_STUDIO_IDS.map((studioId, index) => {
          const studio = getStudio(studioId)
          if (!studio) return null
          const stats = studioStats[studio.id]

          return (
            <motion.div
              key={studio.id}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ delay: reducedMotion ? 0 : index * 0.05, duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                onClick={() => onOpenStudio(studio.id)}
                className="flex min-h-12 w-full items-center gap-3 text-left active:opacity-60"
                aria-label={`Open all ${studio.name} titles`}
              >
                <h3 className="min-w-0 flex-1 text-[20px] font-black leading-none tracking-[-0.045em] text-white/94">{studio.name}</h3>
                {stats && <span className="shrink-0 text-[13px] font-medium text-white/58">{stats.tvCount + stats.movieCount} titles</span>}
                <ChevronRight size={19} className="shrink-0 text-white/48" aria-hidden />
              </button>
              <StudioCover studioId={studio.id} className="h-[96px] w-full" onCatalogue={(next) => updateStudioStats(studio.id, next)} />
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
