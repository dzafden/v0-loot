import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { FranchiseDefinition, Show } from '../../types'
import { completedFranchiseAchievements, franchiseDisplayName } from '../../lib/franchise-achievements'
import { imgUrl } from '../../lib/tmdb'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function FranchiseAchievementRail({
  definitions,
  shows,
}: {
  definitions: FranchiseDefinition[]
  shows: Show[]
}) {
  const reducedMotion = useReducedMotion()
  const achievements = completedFranchiseAchievements(
    definitions,
    new Set(shows.map((show) => show.id)),
  )
  if (!achievements.length) return null

  return (
    <section className="relative z-10 mt-5 mb-4" aria-labelledby="franchise-achievements-title">
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#f5c453]/72">Earned</p>
          <h2 id="franchise-achievements-title" className="mt-1 text-[24px] font-black leading-none tracking-[-0.055em] text-white">Completed worlds</h2>
        </div>
        <span className="pb-0.5 text-[12px] font-semibold text-white/38">{achievements.length} card{achievements.length === 1 ? '' : 's'}</span>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {achievements.map((achievement, index) => {
          const art = achievement.members
            .map((member) => member.backdropPath ?? member.posterPath)
            .filter((path): path is string => Boolean(path))
            .slice(0, 3)
          if (!art.length && achievement.backdropPath) art.push(achievement.backdropPath)
          if (!art.length && achievement.posterPath) art.push(achievement.posterPath)
          const title = franchiseDisplayName(achievement.name)
          return (
            <motion.article
              key={achievement.id}
              initial={reducedMotion ? false : { opacity: 0, x: 18, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.06, 0.24), duration: reducedMotion ? 0 : 0.32 }}
              className="relative aspect-[1.55/1] w-[82vw] max-w-[334px] shrink-0 snap-start overflow-hidden rounded-[27px] bg-[#111416] shadow-[0_22px_54px_rgba(0,0,0,.52)] ring-1 ring-[#f5c453]/34"
              role="img"
              aria-label={`${title} franchise complete: ${achievement.memberIds.length} films watched`}
            >
              <div className="absolute inset-0 flex overflow-hidden" aria-hidden>
                {art.map((path, artIndex) => (
                  <div key={`${path}-${artIndex}`} className="relative h-full flex-1 overflow-hidden first:origin-right last:origin-left">
                    <img src={imgUrl(path, 'w500')} alt="" className="h-full w-full scale-[1.08] object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/28 to-black/38" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/38 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black via-black/72 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,transparent_28%,rgba(255,255,255,.09)_42%,transparent_55%)] opacity-70" aria-hidden />

              <p className="absolute right-4 top-4 max-w-[48%] text-right text-[15px] font-black leading-[0.95] tracking-[-0.04em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,.9)]">{title}</p>

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div className="flex items-end gap-2.5">
                  <span className="text-[58px] font-black italic leading-[0.72] tracking-[-0.09em] text-[#f5c453] [-webkit-text-stroke:1.5px_rgba(0,0,0,.9)] drop-shadow-[0_0_14px_rgba(245,196,83,.28)]">{achievement.memberIds.length}</span>
                  <div className="pb-0.5">
                    <p className="text-[16px] font-black leading-[0.9] tracking-[-0.045em] text-white">films completed</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f5c453]">
                      <Check size={11} strokeWidth={3.2} /> Franchise complete
                    </p>
                  </div>
                </div>
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
