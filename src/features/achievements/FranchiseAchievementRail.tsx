import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, X } from 'lucide-react'
import type { EarnedFranchiseAchievement, FranchiseDefinition, FranchiseMember, Show } from '../../types'
import { franchiseAchievementProgress, franchiseDisplayName, type FranchiseAchievementProgress } from '../../lib/franchise-achievements'
import { imgUrl } from '../../lib/tmdb'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/utils'
import { FeedSaveActions } from '../../components/show/FeedSaveActions'
import { addToWatchlistShelf, ensureDefaultWatchlistShelves, upsertShow } from '../../data/queries'

interface Props {
  definitions: FranchiseDefinition[]
  earnedAchievements: EarnedFranchiseAchievement[]
  shows: Show[]
  watchlistShows: Show[]
  onOpenShow: (show: Show) => void
}

function memberAsShow(member: FranchiseMember, definition: FranchiseDefinition, existing?: Show): Show {
  if (existing) return existing
  const now = Date.now()
  return {
    id: member.id,
    name: member.name,
    year: Number(member.releaseDate.slice(0, 4)) || undefined,
    posterPath: member.posterPath,
    backdropPath: member.backdropPath,
    genres: ['Animation'],
    rawGenres: ['Animation'],
    mediaType: 'movie',
    franchiseCollectionId: definition.id,
    franchiseCollectionName: definition.name,
    addedAt: now,
    updatedAt: now,
  }
}

function artworkFor(progress: FranchiseAchievementProgress, showsById: Map<number, Show>) {
  const art = progress.definition.members
    .map((member) => {
      const owned = showsById.get(member.id)
      return owned?.backdropPath ?? owned?.posterPath ?? member.backdropPath ?? member.posterPath
    })
    .filter((path): path is string => Boolean(path))
    .slice(0, 3)
  if (!art.length && progress.definition.backdropPath) art.push(progress.definition.backdropPath)
  if (!art.length && progress.definition.posterPath) art.push(progress.definition.posterPath)
  return art
}

function progressStatus(progress: FranchiseAchievementProgress) {
  if (progress.hasNewChapter) return `${progress.remainingCount} new film${progress.remainingCount === 1 ? '' : 's'} to watch`
  if (progress.isComplete) return 'Collection complete'
  return `${progress.remainingCount} film${progress.remainingCount === 1 ? '' : 's'} left`
}

export function FranchiseAchievementRail({
  definitions,
  earnedAchievements,
  shows,
  watchlistShows,
  onOpenShow,
}: Props) {
  const reducedMotion = useReducedMotion()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const showsById = useMemo(() => new Map(shows.map((show) => [show.id, show])), [shows])
  const watchlistById = useMemo(() => new Map(watchlistShows.map((show) => [show.id, show])), [watchlistShows])
  const progressItems = useMemo(
    () => franchiseAchievementProgress(definitions, earnedAchievements, new Set(shows.map((show) => show.id))),
    [definitions, earnedAchievements, shows],
  )
  const selected = progressItems.find((progress) => progress.definition.id === selectedId) ?? null
  const inProgressCount = progressItems.filter((progress) => !progress.isComplete).length
  const earnedCount = progressItems.filter((progress) => progress.hasBeenEarned).length
  const progressSummary = [
    inProgressCount ? `${inProgressCount} in progress` : '',
    earnedCount ? `${earnedCount} earned` : '',
  ].filter(Boolean).join(' · ')

  useEffect(() => {
    if (selectedId === null) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedId])

  if (!progressItems.length) return null

  const addToDefaultWatchlist = async (show: Show) => {
    const shelves = await ensureDefaultWatchlistShelves()
    const shelf = shelves.find((candidate) => candidate.name === 'Watch next') ?? shelves[0]
    if (shelf) await addToWatchlistShelf(shelf.id, show)
  }

  const openMember = (show: Show) => {
    setSelectedId(null)
    onOpenShow(show)
  }

  return (
    <>
      <section className="relative z-10 mt-5 mb-4" aria-labelledby="franchise-achievements-title">
        <div className="mb-3 flex items-end justify-between gap-3 px-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/42">Keep going</p>
            <h2 id="franchise-achievements-title" className="mt-1 text-[24px] font-black leading-none tracking-[-0.055em] text-white">Collection progress</h2>
          </div>
          <span className="pb-0.5 text-right text-[12px] font-semibold text-white/38">
            {progressSummary}
          </span>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
          {progressItems.map((progress, index) => {
            const art = artworkFor(progress, showsById)
            const title = franchiseDisplayName(progress.definition.name)
            const earned = progress.hasBeenEarned
            const percentage = Math.round((progress.watchedCount / progress.totalCount) * 100)
            return (
              <motion.button
                key={progress.definition.id}
                initial={reducedMotion ? false : { opacity: 0, x: 18, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.06, 0.24), duration: reducedMotion ? 0 : 0.32 }}
                whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                onClick={() => setSelectedId(progress.definition.id)}
                className={cn(
                  'relative aspect-[1.55/1] w-[82vw] max-w-[334px] shrink-0 snap-start overflow-hidden rounded-[27px] bg-[#111416] text-left shadow-[0_22px_54px_rgba(0,0,0,.52)] ring-1',
                  earned ? 'ring-[#f5c453]/34' : 'ring-white/[0.1]',
                )}
                aria-label={`Open ${title} collection: ${progress.watchedCount} of ${progress.totalCount} films watched`}
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
                <div className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-black via-black/76 to-transparent" />
                {earned && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,transparent_28%,rgba(255,255,255,.09)_42%,transparent_55%)] opacity-70" aria-hidden />}

                <p className="absolute right-4 top-4 max-w-[48%] text-right text-[15px] font-black leading-[0.95] tracking-[-0.04em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,.9)]">{title}</p>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex items-end gap-2.5">
                      <span className={cn(
                        'text-[58px] font-black italic leading-[0.72] tracking-[-0.09em] [-webkit-text-stroke:1.5px_rgba(0,0,0,.9)]',
                        earned ? 'text-[#f5c453] drop-shadow-[0_0_14px_rgba(245,196,83,.28)]' : 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,.7)]',
                      )}>{progress.watchedCount}</span>
                      <div className="pb-0.5">
                        <p className="text-[16px] font-black leading-[0.9] tracking-[-0.045em] text-white">of {progress.totalCount} films</p>
                        <p className={cn(
                          'mt-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em]',
                          earned ? 'text-[#f5c453]' : 'text-white/62',
                        )}>
                          {progress.isComplete && <Check size={11} strokeWidth={3.2} />}
                          {progressStatus(progress)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="mb-1 shrink-0 text-white/58" aria-hidden />
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/16" aria-hidden>
                    <div className={cn('h-full rounded-full', earned ? 'bg-[#f5c453]' : 'bg-white')} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </section>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.definition.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[#07080a] text-white"
              role="dialog"
              aria-modal="true"
              aria-labelledby="franchise-progress-dialog-title"
            >
              <div className="mx-auto min-h-full w-full max-w-md pb-[max(2rem,env(safe-area-inset-bottom))]">
                <CollectionProgressDetail
                  progress={selected}
                  showsById={showsById}
                  watchlistById={watchlistById}
                  reducedMotion={reducedMotion}
                  onClose={() => setSelectedId(null)}
                  onOpenShow={openMember}
                  onSeen={upsertShow}
                  onWatchlist={addToDefaultWatchlist}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function CollectionProgressDetail({
  progress,
  showsById,
  watchlistById,
  reducedMotion,
  onClose,
  onOpenShow,
  onSeen,
  onWatchlist,
}: {
  progress: FranchiseAchievementProgress
  showsById: Map<number, Show>
  watchlistById: Map<number, Show>
  reducedMotion: boolean
  onClose: () => void
  onOpenShow: (show: Show) => void
  onSeen: (show: Show) => Promise<void>
  onWatchlist: (show: Show) => Promise<void>
}) {
  const definition = progress.definition
  const title = franchiseDisplayName(definition.name)
  const heroPath = definition.backdropPath ?? definition.members.find((member) => member.backdropPath)?.backdropPath ?? definition.posterPath
  const percentage = Math.round((progress.watchedCount / progress.totalCount) * 100)

  return (
    <>
      <header className="relative min-h-[310px] overflow-hidden bg-[#111416]">
        {heroPath && <img src={imgUrl(heroPath, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-72" aria-hidden />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-black/28 to-[#07080a]" />
        <button
          onClick={onClose}
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid h-11 w-11 place-items-center rounded-full border border-white/[0.1] bg-black/46 text-white/82 backdrop-blur-xl active:scale-95"
          aria-label="Close collection progress"
        >
          <X size={19} />
        </button>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.14em]',
            progress.hasBeenEarned ? 'text-[#f5c453]' : 'text-white/52',
          )}>{progress.hasNewChapter ? 'Earned · new chapter available' : progress.isComplete ? 'Achievement earned' : 'Achievement in progress'}</p>
          <h2 id="franchise-progress-dialog-title" className="mt-2 max-w-[90%] text-[42px] font-black leading-[0.84] tracking-[-0.09em] text-balance">{title}</h2>
          <div className="mt-5 flex items-end justify-between gap-3">
            <p className="text-[17px] font-black tracking-[-0.04em]">{progress.watchedCount} of {progress.totalCount} films watched</p>
            <p className="text-[12px] font-semibold text-white/48">{percentage}%</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/14" aria-label={`${percentage}% complete`}>
            <motion.div
              initial={reducedMotion ? false : { width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: reducedMotion ? 0 : 0.48, ease: 'easeOut' }}
              className={cn('h-full rounded-full', progress.hasBeenEarned ? 'bg-[#f5c453]' : 'bg-white')}
            />
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h3 className="text-[18px] font-black tracking-[-0.04em]">The collection</h3>
          <p className="text-[11px] font-semibold text-white/36">Tap a title for details</p>
        </div>
        <div className="space-y-2.5">
          {definition.members.map((member, index) => {
            const owned = showsById.get(member.id)
            const watchlisted = watchlistById.get(member.id)
            const show = memberAsShow(member, definition, owned ?? watchlisted)
            const artwork = member.posterPath ?? show.posterPath ?? member.backdropPath ?? show.backdropPath
            return (
              <motion.article
                key={member.id}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.035, 0.2), duration: reducedMotion ? 0 : 0.24 }}
                className="flex min-h-[116px] items-center gap-3 overflow-hidden rounded-[24px] bg-white/[0.055] p-2.5 ring-1 ring-white/[0.07]"
              >
                <button onClick={() => onOpenShow(show)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80" aria-label={`Open ${member.name}`}>
                  <span className="relative h-[94px] w-[64px] shrink-0 overflow-hidden rounded-[14px] bg-white/[0.06]">
                    {artwork && <img src={imgUrl(artwork, 'w342')} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    {owned && <span className="absolute bottom-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#f5c453] text-black shadow-lg"><Check size={13} strokeWidth={3.4} /></span>}
                  </span>
                  <span className="min-w-0 py-1">
                    <span className="line-clamp-2 text-[16px] font-black leading-[1.05] tracking-[-0.035em] text-white">{member.name}</span>
                    <span className="mt-2 block text-[11px] font-semibold text-white/38">{member.releaseDate.slice(0, 4)}</span>
                    <span className={cn('mt-1 block text-[10px] font-black uppercase tracking-[0.12em]', owned ? 'text-[#f5c453]' : 'text-white/38')}>
                      {owned ? 'Watched' : watchlisted ? 'In watchlist' : 'Not watched'}
                    </span>
                  </span>
                </button>
                <div className="shrink-0">
                  <FeedSaveActions
                    isSeen={Boolean(owned)}
                    isWatchlisted={Boolean(watchlisted)}
                    onSeen={() => onSeen(show)}
                    onWatchlist={() => onWatchlist(show)}
                    size="sm"
                  />
                </div>
              </motion.article>
            )
          })}
        </div>
      </main>
    </>
  )
}
