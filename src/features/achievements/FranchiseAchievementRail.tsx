import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, EyeOff, Factory, Layers3, X } from 'lucide-react'
import type { DismissedCollection, EarnedFranchiseAchievement, FranchiseDefinition, FranchiseMember, Show } from '../../types'
import {
  collectionProgressForDefinition,
  collectionFrequencyTreatment,
  franchiseAchievementProgress,
  franchiseDisplayName,
  type FranchiseAchievementProgress,
} from '../../lib/franchise-achievements'
import { hasTmdbKey, imgUrl } from '../../lib/tmdb'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/utils'
import { FeedSaveActions } from '../../components/show/FeedSaveActions'
import { addToWatchlistShelf, dismissCollection, ensureDefaultWatchlistShelves, getOrPersistStudioDefinition, upsertShow } from '../../data/queries'
import { dominantColor } from '../../lib/dominantColor'
import { STUDIOS, type StudioDefinition } from '../../lib/studios'

interface Props {
  definitions: FranchiseDefinition[]
  earnedAchievements: EarnedFranchiseAchievement[]
  dismissedCollections: DismissedCollection[]
  shows: Show[]
  watchlistShows: Show[]
  onOpenShow: (show: Show) => void
  mode?: 'rails' | 'screen'
  onBack?: () => void
  onOpenAll?: () => void
}

type RecordsFilter = 'all' | 'open' | 'record'

function memberAsShow(member: FranchiseMember, definition: FranchiseDefinition, existing?: Show): Show {
  if (existing) return existing
  const now = Date.now()
  const studioId = definition.source === 'tmdb-studio' ? definition.sourceId : undefined
  return {
    id: member.id,
    name: member.name,
    year: Number(member.releaseDate.slice(0, 4)) || undefined,
    posterPath: member.posterPath,
    backdropPath: member.backdropPath,
    genres: ['Animation'],
    rawGenres: ['Animation'],
    mediaType: member.mediaType ?? 'movie',
    franchiseCollectionId: definition.source === 'tmdb-collection' ? definition.id : undefined,
    franchiseCollectionName: definition.source === 'tmdb-collection' ? definition.name : undefined,
    studioIds: studioId ? [studioId] : undefined,
    addedAt: now,
    updatedAt: now,
  }
}

function heroPathFor(definition: FranchiseDefinition, showsById: Map<number, Show>) {
  return definition.backdropPath
    ?? definition.members.map((member) => showsById.get(member.id)?.backdropPath).find(Boolean)
    ?? definition.members.map((member) => member.backdropPath).find(Boolean)
    ?? null
}

function fallbackArtworkFor(definition: FranchiseDefinition, showsById: Map<number, Show>) {
  const art = definition.members
    .map((member) => showsById.get(member.id)?.posterPath ?? member.posterPath)
    .filter((path): path is string => Boolean(path))
    .slice(0, 3)
  if (!art.length && definition.posterPath) art.push(definition.posterPath)
  return art
}

function useArtworkAccent(path: string | null) {
  const src = path ? imgUrl(path, 'w500') : null
  const [resolved, setResolved] = useState({ src: '', color: '#343139' })
  useEffect(() => {
    if (!src) return
    let active = true
    dominantColor(src).then((color) => {
      if (active) setResolved({ src, color })
    })
    return () => { active = false }
  }, [src])
  return resolved.src === src ? resolved.color : '#343139'
}

function collectionNoun(definition: FranchiseDefinition) {
  return definition.members.every((member) => (member.mediaType ?? 'movie') === 'movie') ? 'film' : 'title'
}

function progressStatus(progress: FranchiseAchievementProgress) {
  const noun = collectionNoun(progress.definition)
  if (progress.hasNewChapter) return `${progress.remainingCount} new ${noun}${progress.remainingCount === 1 ? '' : 's'} joined`
  if (progress.isComplete) return `Every ${noun} is in your record`
  if (progress.watchedCount / progress.totalCount < 0.5) return 'Seen the others?'
  return `${progress.remainingCount} ${noun}${progress.remainingCount === 1 ? '' : 's'} left`
}

export function FranchiseAchievementRail({
  definitions,
  earnedAchievements,
  dismissedCollections,
  shows,
  watchlistShows,
  onOpenShow,
  mode = 'rails',
  onBack,
  onOpenAll,
}: Props) {
  const reducedMotion = useReducedMotion()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dismissCandidate, setDismissCandidate] = useState<FranchiseAchievementProgress | null>(null)
  const [studioDirectoryOpen, setStudioDirectoryOpen] = useState(false)
  const [browsedStudio, setBrowsedStudio] = useState<FranchiseDefinition | null>(null)
  const [studioLoadingId, setStudioLoadingId] = useState<number | null>(null)
  const [studioError, setStudioError] = useState('')
  const [recordsFilter, setRecordsFilter] = useState<RecordsFilter>('all')
  const longPressTimer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const showsById = useMemo(() => new Map(shows.map((show) => [show.id, show])), [shows])
  const watchlistById = useMemo(() => new Map(watchlistShows.map((show) => [show.id, show])), [watchlistShows])
  const ownedIds = useMemo(() => new Set(shows.map((show) => show.id)), [shows])
  const earnedByDefinitionId = useMemo(
    () => new Map(earnedAchievements.map((achievement) => [achievement.definitionId, achievement])),
    [earnedAchievements],
  )
  const dismissedIds = useMemo(() => new Set(dismissedCollections.map((item) => item.definitionId)), [dismissedCollections])
  const progressItems = useMemo(
    () => franchiseAchievementProgress(definitions, earnedAchievements, ownedIds, dismissedIds),
    [definitions, dismissedIds, earnedAchievements, ownedIds],
  )
  const franchiseProgress = progressItems.filter((progress) => progress.definition.source === 'tmdb-collection')
  const studioProgress = progressItems.filter((progress) => progress.definition.source === 'tmdb-studio')
  const visibleRecords = progressItems.filter((progress) => {
    if (recordsFilter === 'open') return !progress.isComplete
    if (recordsFilter === 'record') return progress.hasBeenEarned
    return true
  })
  const selected = progressItems.find((progress) => progress.definition.id === selectedId) ?? null
  const browsedProgress = browsedStudio
    ? collectionProgressForDefinition(browsedStudio, earnedByDefinitionId.get(browsedStudio.id), ownedIds)
    : null

  useEffect(() => {
    if (mode !== 'screen' && selectedId === null && !studioDirectoryOpen && !dismissCandidate) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (dismissCandidate) setDismissCandidate(null)
      else if (browsedStudio) setBrowsedStudio(null)
      else if (studioDirectoryOpen) setStudioDirectoryOpen(false)
      else if (selectedId !== null) setSelectedId(null)
      else if (mode === 'screen') onBack?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [browsedStudio, dismissCandidate, mode, onBack, selectedId, studioDirectoryOpen])

  const addToDefaultWatchlist = async (show: Show) => {
    const shelves = await ensureDefaultWatchlistShelves()
    const shelf = shelves.find((candidate) => candidate.name === 'Watch next') ?? shelves[0]
    if (shelf) await addToWatchlistShelf(shelf.id, show)
  }

  const openMember = (show: Show) => {
    setSelectedId(null)
    setBrowsedStudio(null)
    setStudioDirectoryOpen(false)
    onOpenShow(show)
  }

  const startLongPress = (progress: FranchiseAchievementProgress) => {
    if (progress.hasBeenEarned) return
    longPressed.current = false
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(12)
      setDismissCandidate(progress)
    }, 560)
  }

  const clearLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const browseStudio = async (studio: StudioDefinition) => {
    if (studioLoadingId !== null) return
    if (!hasTmdbKey()) {
      setStudioError('Add your TMDB key in Settings to load studio catalogues.')
      return
    }
    setStudioLoadingId(studio.id)
    setStudioError('')
    try {
      const definition = await getOrPersistStudioDefinition(studio.id)
      if (definition) setBrowsedStudio(definition)
      else setStudioError('No eligible animated titles found for this studio.')
    } catch {
      setStudioError('Could not load this studio right now.')
    } finally {
      setStudioLoadingId(null)
    }
  }

  const dismissProgress = async (progress: FranchiseAchievementProgress) => {
    setSelectedId(null)
    setDismissCandidate(null)
    await dismissCollection(progress.definition, progress.watchedCount)
  }

  return (
    <>
      {mode === 'screen' ? (
        <CollectionRecordsOverview
          progressItems={visibleRecords}
          allProgressItems={progressItems}
          showsById={showsById}
          reducedMotion={reducedMotion}
          activeFilter={recordsFilter}
          onFilterChange={setRecordsFilter}
          onBack={onBack}
          onBrowseStudios={() => setStudioDirectoryOpen(true)}
          onOpen={(progress) => {
            if (longPressed.current) {
              longPressed.current = false
              return
            }
            setSelectedId(progress.definition.id)
          }}
          onLongPress={startLongPress}
          onLongPressEnd={clearLongPress}
        />
      ) : (
        <>
          {franchiseProgress.length > 0 && (
            <CollectionRailSection
              eyebrow="Keep going"
              title="Collection progress"
              progressItems={franchiseProgress.slice(0, 8)}
              showsById={showsById}
              reducedMotion={reducedMotion}
              onOpenAll={onOpenAll}
              onOpen={(progress) => {
                if (longPressed.current) {
                  longPressed.current = false
                  return
                }
                setSelectedId(progress.definition.id)
              }}
              onLongPress={startLongPress}
              onLongPressEnd={clearLongPress}
            />
          )}

          {studioProgress.length > 0 && (
            <CollectionRailSection
              eyebrow="A pattern in your taste"
              title="Studios you've been watching"
              progressItems={studioProgress.slice(0, 8)}
              showsById={showsById}
              reducedMotion={reducedMotion}
              onOpenAll={onOpenAll}
              onOpen={(progress) => {
                if (longPressed.current) {
                  longPressed.current = false
                  return
                }
                setSelectedId(progress.definition.id)
              }}
              onLongPress={startLongPress}
              onLongPressEnd={clearLongPress}
            />
          )}

          <StudioDirectoryEntry onOpen={() => setStudioDirectoryOpen(true)} />
        </>
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selected && (
            <CollectionDetailOverlay
              key={selected.definition.id}
              progress={selected}
              showsById={showsById}
              watchlistById={watchlistById}
              reducedMotion={reducedMotion}
              onClose={() => setSelectedId(null)}
              onOpenShow={openMember}
              onSeen={upsertShow}
              onWatchlist={addToDefaultWatchlist}
              onDismiss={selected.hasBeenEarned ? undefined : () => setDismissCandidate(selected)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {studioDirectoryOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[86] overflow-y-auto overscroll-contain bg-[#07080a] text-white" role="dialog" aria-modal="true" aria-labelledby="studio-directory-title">
              <div className="mx-auto min-h-full w-full max-w-md pb-10">
                {browsedProgress ? (
                  <CollectionProgressDetail
                    progress={browsedProgress}
                    showsById={showsById}
                    watchlistById={watchlistById}
                    reducedMotion={reducedMotion}
                    onClose={() => setBrowsedStudio(null)}
                    closeLabel="Back to studios"
                    closeIcon="back"
                    onOpenShow={openMember}
                    onSeen={upsertShow}
                    onWatchlist={addToDefaultWatchlist}
                  />
                ) : (
                  <StudioDirectory
                    loadingId={studioLoadingId}
                    error={studioError}
                    reducedMotion={reducedMotion}
                    onClose={() => setStudioDirectoryOpen(false)}
                    onOpen={browseStudio}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {dismissCandidate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[96] bg-black/68 backdrop-blur-md" onClick={() => setDismissCandidate(null)}>
              <motion.div initial={reducedMotion ? false : { y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[34px] border-t border-white/[0.09] bg-[#0b0c0f] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/18" />
                <p className="text-[26px] font-black leading-[0.95] tracking-[-0.06em]">Not interested in finishing {franchiseDisplayName(dismissCandidate.definition.name)}?</p>
                <p className="mt-3 text-[13px] leading-relaxed text-white/48">It will keep tracking quietly and return if you watch another title. You can also restore it from Settings.</p>
                <button onClick={() => void dismissProgress(dismissCandidate)} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-white text-[11px] font-black uppercase tracking-[0.14em] text-black active:scale-[0.985]"><EyeOff size={16} /> Hide this collection</button>
                <button onClick={() => setDismissCandidate(null)} className="mt-2 h-12 w-full text-[11px] font-black uppercase tracking-[0.14em] text-white/52">Keep it here</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function StudioDirectoryEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="relative z-10 mb-5 mt-4 px-4" aria-labelledby="studio-directory-entry-title">
      <button onClick={onOpen} className="group relative flex min-h-[104px] w-full items-center gap-4 overflow-hidden rounded-[28px] bg-white/[0.045] p-4 text-left ring-1 ring-white/[0.07] active:scale-[0.99]">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-white/[0.07] text-white/72"><Factory size={24} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Animation authorship</span>
          <span id="studio-directory-entry-title" className="mt-1 block text-[21px] font-black leading-none tracking-[-0.045em] text-white">Browse studios</span>
          <span className="mt-2 block text-[12px] leading-snug text-white/42">Explore the people and houses behind what you watch.</span>
        </span>
        <ChevronRight size={19} className="shrink-0 text-white/42 transition-transform group-active:translate-x-0.5" />
      </button>
    </section>
  )
}

function CollectionRecordsOverview({
  progressItems,
  allProgressItems,
  showsById,
  reducedMotion,
  activeFilter,
  onFilterChange,
  onBack,
  onBrowseStudios,
  onOpen,
  onLongPress,
  onLongPressEnd,
}: {
  progressItems: FranchiseAchievementProgress[]
  allProgressItems: FranchiseAchievementProgress[]
  showsById: Map<number, Show>
  reducedMotion: boolean
  activeFilter: RecordsFilter
  onFilterChange: (filter: RecordsFilter) => void
  onBack?: () => void
  onBrowseStudios: () => void
  onOpen: (progress: FranchiseAchievementProgress) => void
  onLongPress: (progress: FranchiseAchievementProgress) => void
  onLongPressEnd: () => void
}) {
  const openCount = allProgressItems.filter((progress) => !progress.isComplete).length
  const recordCount = allProgressItems.filter((progress) => progress.hasBeenEarned).length
  const filters: Array<{ id: RecordsFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: allProgressItems.length },
    { id: 'open', label: 'Open', count: openCount },
    { id: 'record', label: 'In record', count: recordCount },
  ]

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, x: 22 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, x: 14 }}
      transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[#07080a] text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-records-title"
    >
      <div className="mx-auto min-h-full w-full max-w-md pb-[max(2rem,env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080a]/92 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/78 active:scale-95" aria-label="Back to collection">
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Your animation history</p>
              <h1 id="collection-records-title" className="mt-1 text-[30px] font-black leading-none tracking-[-0.065em]">Collection records</h1>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#f5c453]/12 text-[#f5c453]" aria-hidden>
              <Layers3 size={20} />
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar" aria-label="Filter collection records">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={cn(
                  'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[11px] font-black tracking-[-0.01em] transition-colors active:scale-[0.98]',
                  activeFilter === filter.id ? 'bg-white text-black' : 'bg-white/[0.055] text-white/48 ring-1 ring-white/[0.07]',
                )}
                aria-pressed={activeFilter === filter.id}
              >
                {filter.label}<span className={activeFilter === filter.id ? 'text-black/42' : 'text-white/28'}>{filter.count}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 pt-5">
          <div className="mb-4 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/36">{activeFilter === 'all' ? 'Everything in view' : activeFilter === 'open' ? 'Still taking shape' : 'Part of your record'}</p>
              <p className="mt-1 text-[17px] font-black tracking-[-0.04em] text-white/88">{progressItems.length} collection{progressItems.length === 1 ? '' : 's'}</p>
            </div>
            <button onClick={onBrowseStudios} className="flex h-10 items-center gap-2 rounded-full bg-white/[0.055] px-3 text-[10px] font-black text-white/56 ring-1 ring-white/[0.07] active:scale-95">
              <Factory size={14} /> Browse studios
            </button>
          </div>

          {progressItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {progressItems.map((progress, index) => (
                <CollectionRecordGridCard
                  key={progress.definition.id}
                  progress={progress}
                  showsById={showsById}
                  reducedMotion={reducedMotion}
                  index={index}
                  onOpen={() => onOpen(progress)}
                  onPointerDown={() => onLongPress(progress)}
                  onPointerEnd={onLongPressEnd}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    onLongPress(progress)
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[30px] bg-white/[0.035] px-8 text-center ring-1 ring-white/[0.055]">
              <Layers3 size={30} className="text-white/24" />
              <p className="mt-4 text-[19px] font-black tracking-[-0.04em]">Nothing here yet</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/38">As your watching history fills in, matching collections will appear here.</p>
            </div>
          )}
        </main>
      </div>
    </motion.section>
  )
}

function CollectionRecordGridCard({
  progress,
  showsById,
  reducedMotion,
  index,
  onOpen,
  onPointerDown,
  onPointerEnd,
  onContextMenu,
}: {
  progress: FranchiseAchievementProgress
  showsById: Map<number, Show>
  reducedMotion: boolean
  index: number
  onOpen: () => void
  onPointerDown: () => void
  onPointerEnd: () => void
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const definition = progress.definition
  const heroPath = heroPathFor(definition, showsById)
  const fallbackArt = heroPath ? [] : fallbackArtworkFor(definition, showsById)
  const accent = useArtworkAccent(heroPath ?? fallbackArt[0] ?? null)
  const title = franchiseDisplayName(definition.name)
  const earned = progress.hasBeenEarned
  const percentage = Math.round((progress.watchedCount / progress.totalCount) * 100)
  const lowProgress = !earned && progress.watchedCount / progress.totalCount < 0.5
  const noun = collectionNoun(definition)

  return (
    <motion.button
      initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.035, 0.2), duration: reducedMotion ? 0 : 0.28 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      onClick={onOpen}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onContextMenu={onContextMenu}
      className={cn(
        'relative aspect-[0.82/1] min-w-0 overflow-hidden rounded-[24px] text-left ring-1',
        earned ? 'ring-[#f5c453]/30 shadow-[0_18px_40px_rgba(0,0,0,.52)]' : 'ring-white/[0.09] shadow-[0_16px_34px_rgba(0,0,0,.4)]',
      )}
      style={{ backgroundColor: accent }}
      aria-label={`Open ${title}: ${progress.watchedCount} of ${progress.totalCount} ${noun}s in your record`}
    >
      {heroPath ? (
        <img src={imgUrl(heroPath, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" aria-hidden />
      ) : (
        <div className="absolute inset-0 flex overflow-hidden" aria-hidden>
          {fallbackArt.map((path) => <img key={path} src={imgUrl(path, 'w342')} alt="" className="h-full min-w-0 flex-1 object-cover" loading="lazy" />)}
        </div>
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${accent}b8 0%, transparent 52%)` }} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/94" aria-hidden />

      <div className="absolute inset-x-0 top-0 p-3.5">
        <p className="line-clamp-3 text-[17px] font-black leading-[0.92] tracking-[-0.05em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,.95)]">{title}</p>
        {definition.source === 'tmdb-studio' && <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/52">Studio</p>}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-end gap-1.5">
              <span className={cn('text-[44px] font-black italic leading-[0.7] tracking-[-0.1em] [-webkit-text-stroke:1px_rgba(0,0,0,.9)]', earned ? 'text-[#f5c453]' : 'text-white')}>{progress.watchedCount}</span>
              <span className="pb-0.5 text-[12px] font-black leading-none text-white/88">of {progress.totalCount}</span>
            </div>
            <p className={cn('mt-2 line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.08em]', earned ? 'text-[#f5c453]' : 'text-white/60')}>{progressStatus(progress)}</p>
          </div>
          <ChevronRight size={17} className="mb-0.5 shrink-0 text-white/46" aria-hidden />
        </div>
        {!lowProgress && <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/16" aria-hidden><div className={cn('h-full rounded-full', earned ? 'bg-[#f5c453]' : 'bg-white')} style={{ width: `${percentage}%` }} /></div>}
      </div>
    </motion.button>
  )
}

function CollectionRailSection({
  eyebrow,
  title,
  progressItems,
  showsById,
  reducedMotion,
  onOpenAll,
  onOpen,
  onLongPress,
  onLongPressEnd,
}: {
  eyebrow: string
  title: string
  progressItems: FranchiseAchievementProgress[]
  showsById: Map<number, Show>
  reducedMotion: boolean
  onOpenAll?: () => void
  onOpen: (progress: FranchiseAchievementProgress) => void
  onLongPress: (progress: FranchiseAchievementProgress) => void
  onLongPressEnd: () => void
}) {
  const inProgressCount = progressItems.filter((progress) => !progress.isComplete).length
  const earnedCount = progressItems.filter((progress) => progress.hasBeenEarned).length
  const summary = [inProgressCount ? `${inProgressCount} open` : '', earnedCount ? `${earnedCount} in your record` : ''].filter(Boolean).join(' · ')
  const headingId = `collection-rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section className="relative z-10 mb-4 mt-5" aria-labelledby={headingId}>
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/42">{eyebrow}</p>
          <h2 id={headingId} className="mt-1 text-[24px] font-black leading-none tracking-[-0.055em] text-white">{title}</h2>
        </div>
        <div className="flex max-w-[46%] flex-col items-end gap-1.5 pb-0.5">
          <span className="text-right text-[11px] font-semibold leading-tight text-white/34">{summary}</span>
          {onOpenAll && (
            <button onClick={onOpenAll} className="flex items-center gap-0.5 text-[10px] font-black text-white/62 active:text-white" aria-label="See all collection records">
              See all <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {progressItems.map((progress, index) => (
          <CollectionProgressCard
            key={progress.definition.id}
            progress={progress}
            showsById={showsById}
            reducedMotion={reducedMotion}
            index={index}
            onOpen={() => onOpen(progress)}
            onPointerDown={() => onLongPress(progress)}
            onPointerEnd={onLongPressEnd}
            onContextMenu={(event) => {
              event.preventDefault()
              onLongPress(progress)
            }}
          />
        ))}
      </div>
    </section>
  )
}

function CollectionProgressCard({
  progress,
  showsById,
  reducedMotion,
  index,
  onOpen,
  onPointerDown,
  onPointerEnd,
  onContextMenu,
}: {
  progress: FranchiseAchievementProgress
  showsById: Map<number, Show>
  reducedMotion: boolean
  index: number
  onOpen: () => void
  onPointerDown: () => void
  onPointerEnd: () => void
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const definition = progress.definition
  const heroPath = heroPathFor(definition, showsById)
  const fallbackArt = heroPath ? [] : fallbackArtworkFor(definition, showsById)
  const accent = useArtworkAccent(heroPath ?? fallbackArt[0] ?? null)
  const title = franchiseDisplayName(definition.name)
  const earned = progress.hasBeenEarned
  const percentage = Math.round((progress.watchedCount / progress.totalCount) * 100)
  const lowProgress = !earned && progress.watchedCount / progress.totalCount < 0.5
  const noun = collectionNoun(definition)
  const intensity = collectionFrequencyTreatment(progress.totalCount)
  return (
    <motion.button
      initial={reducedMotion ? false : { opacity: 0, x: 18, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.06, 0.24), duration: reducedMotion ? 0 : 0.32 }}
      whileTap={reducedMotion ? undefined : { scale: 0.985 }}
      onClick={onOpen}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onContextMenu={onContextMenu}
      className={cn(
        'relative aspect-[1.55/1] w-[82vw] max-w-[334px] shrink-0 snap-start overflow-hidden rounded-[27px] text-left ring-1',
        earned ? 'ring-[#f5c453]/34' : 'ring-white/[0.1]',
        intensity === 'heirloom' ? 'shadow-[0_24px_64px_rgba(0,0,0,.68)]' : 'shadow-[0_22px_54px_rgba(0,0,0,.52)]',
      )}
      style={{ backgroundColor: accent }}
      aria-label={`Open ${title}: ${progress.watchedCount} of ${progress.totalCount} ${noun}s in your record`}
    >
      {heroPath ? (
        <img src={imgUrl(heroPath, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" aria-hidden />
      ) : (
        <div className="absolute inset-0 flex overflow-hidden" aria-hidden>
          {fallbackArt.map((path) => <img key={path} src={imgUrl(path, 'w342')} alt="" className="h-full min-w-0 flex-1 object-cover" loading="lazy" />)}
        </div>
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(128deg, ${accent}d9 0%, transparent 58%)` }} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-black/26 via-black/8 to-black/92" aria-hidden />
      {earned && intensity !== 'everyday' && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,transparent_28%,rgba(255,255,255,.11)_42%,transparent_55%)] opacity-70" aria-hidden />}
      <p className="absolute right-4 top-4 max-w-[55%] text-right text-[17px] font-black leading-[0.92] tracking-[-0.045em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,.9)]">{title}</p>
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-2.5">
            <span className={cn('text-[58px] font-black italic leading-[0.72] tracking-[-0.09em] [-webkit-text-stroke:1.5px_rgba(0,0,0,.9)]', earned ? 'text-[#f5c453] drop-shadow-[0_0_14px_rgba(245,196,83,.28)]' : 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,.7)]')}>{progress.watchedCount}</span>
            <div className="pb-0.5">
              <p className="text-[16px] font-black leading-[0.9] tracking-[-0.045em] text-white">of {progress.totalCount} {noun}s</p>
              <p className={cn('mt-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em]', earned ? 'text-[#f5c453]' : 'text-white/68')}>
                {progress.isComplete && <Check size={11} strokeWidth={3.2} />}{progressStatus(progress)}
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="mb-1 shrink-0 text-white/58" aria-hidden />
        </div>
        {!lowProgress && <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/16" aria-hidden><div className={cn('h-full rounded-full', earned ? 'bg-[#f5c453]' : 'bg-white')} style={{ width: `${percentage}%` }} /></div>}
      </div>
    </motion.button>
  )
}

function CollectionDetailOverlay(props: Parameters<typeof CollectionProgressDetail>[0]) {
  const { progress, reducedMotion } = props
  return (
    <motion.div key={progress.definition.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[#07080a] text-white" role="dialog" aria-modal="true" aria-labelledby="collection-progress-dialog-title">
      <div className="mx-auto min-h-full w-full max-w-md pb-[max(2rem,env(safe-area-inset-bottom))]"><CollectionProgressDetail {...props} /></div>
    </motion.div>
  )
}

export function CollectionProgressDetail({
  progress,
  showsById,
  watchlistById,
  reducedMotion,
  onClose,
  closeLabel = 'Close collection record',
  closeIcon = 'close',
  onOpenShow,
  onSeen,
  onWatchlist,
  onDismiss,
}: {
  progress: FranchiseAchievementProgress
  showsById: Map<number, Show>
  watchlistById: Map<number, Show>
  reducedMotion: boolean
  onClose: () => void
  closeLabel?: string
  closeIcon?: 'close' | 'back'
  onOpenShow: (show: Show) => void
  onSeen: (show: Show) => Promise<void>
  onWatchlist: (show: Show) => Promise<void>
  onDismiss?: () => void
}) {
  const definition = progress.definition
  const title = franchiseDisplayName(definition.name)
  const heroPath = heroPathFor(definition, showsById) ?? definition.posterPath ?? null
  const accent = useArtworkAccent(heroPath)
  const percentage = progress.totalCount ? Math.round((progress.watchedCount / progress.totalCount) * 100) : 0
  const noun = collectionNoun(definition)
  const stateCopy = progress.hasNewChapter
    ? `This collection is already in your record. ${progress.remainingCount} new ${noun}${progress.remainingCount === 1 ? '' : 's'} joined it.`
    : progress.isComplete
      ? `Every ${title} ${noun} is in your record.`
      : progress.watchedCount / progress.totalCount < 0.5
        ? `You've seen ${progress.watchedCount}. Seen any of the others?`
        : `${progress.watchedCount} of ${progress.totalCount} ${noun}s are in your record.`

  return (
    <>
      <header className="relative min-h-[330px] overflow-hidden" style={{ backgroundColor: accent }}>
        {heroPath && <img src={imgUrl(heroPath, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-78" aria-hidden />}
        <div className="absolute inset-0" style={{ background: `linear-gradient(128deg, ${accent}bd 0%, transparent 58%)` }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-black/24 to-[#07080a]" />
        <button onClick={onClose} className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid h-11 w-11 place-items-center rounded-full border border-white/[0.1] bg-black/46 text-white/82 backdrop-blur-xl active:scale-95" aria-label={closeLabel}>
          {closeIcon === 'back' ? <ChevronLeft size={20} /> : <X size={19} />}
        </button>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className={cn('max-w-[92%] text-[12px] font-semibold leading-snug', progress.hasBeenEarned ? 'text-[#f5c453]' : 'text-white/62')}>{stateCopy}</p>
          <h2 id="collection-progress-dialog-title" className="mt-2 max-w-[92%] text-[42px] font-black leading-[0.84] tracking-[-0.09em] text-balance">{title}</h2>
          <div className="mt-5 flex items-end justify-between gap-3"><p className="text-[17px] font-black tracking-[-0.04em]">{progress.watchedCount} of {progress.totalCount} {noun}s watched</p><p className="text-[12px] font-semibold text-white/48">{percentage}%</p></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/14" aria-label={`${percentage}% complete`}><motion.div initial={reducedMotion ? false : { width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: reducedMotion ? 0 : 0.48, ease: 'easeOut' }} className={cn('h-full rounded-full', progress.hasBeenEarned ? 'bg-[#f5c453]' : 'bg-white')} /></div>
        </div>
      </header>

      <main className="px-4 pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1"><h3 className="text-[18px] font-black tracking-[-0.04em]">{definition.source === 'tmdb-studio' ? 'The studio catalogue' : 'The collection'}</h3><p className="text-[11px] font-semibold text-white/36">Tap a title for details</p></div>
        <div className="space-y-2.5">
          {definition.members.map((member, index) => {
            const owned = showsById.get(member.id)
            const watchlisted = watchlistById.get(member.id)
            const show = memberAsShow(member, definition, owned ?? watchlisted)
            const artwork = member.posterPath ?? show.posterPath ?? member.backdropPath ?? show.backdropPath
            return (
              <motion.article key={`${member.mediaType ?? 'movie'}:${member.id}`} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.035, 0.2), duration: reducedMotion ? 0 : 0.24 }} className="flex min-h-[116px] items-center gap-3 overflow-hidden rounded-[24px] bg-white/[0.055] p-2.5 ring-1 ring-white/[0.07]">
                <button onClick={() => onOpenShow(show)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80" aria-label={`Open ${member.name}`}>
                  <span className="relative h-[94px] w-[64px] shrink-0 overflow-hidden rounded-[14px] bg-white/[0.06]">{artwork && <img src={imgUrl(artwork, 'w342')} alt="" className="h-full w-full object-cover" loading="lazy" />}{owned && <span className="absolute bottom-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#f5c453] text-black shadow-lg"><Check size={13} strokeWidth={3.4} /></span>}</span>
                  <span className="min-w-0 py-1"><span className="line-clamp-2 text-[16px] font-black leading-[1.05] tracking-[-0.035em] text-white">{member.name}</span><span className="mt-2 block text-[11px] font-semibold text-white/38">{member.releaseDate.slice(0, 4)} · {(member.mediaType ?? 'movie') === 'tv' ? 'Series' : 'Film'}</span><span className={cn('mt-1 block text-[10px] font-black uppercase tracking-[0.12em]', owned ? 'text-[#f5c453]' : 'text-white/38')}>{owned ? 'Watched' : watchlisted ? 'In watchlist' : 'Not watched'}</span></span>
                </button>
                <div className="shrink-0"><FeedSaveActions isSeen={Boolean(owned)} isWatchlisted={Boolean(watchlisted)} onSeen={() => onSeen(show)} onWatchlist={() => onWatchlist(show)} size="sm" /></div>
              </motion.article>
            )
          })}
        </div>
        {onDismiss && <button onClick={onDismiss} className="mt-5 flex h-12 w-full items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/42 active:text-white/70"><EyeOff size={15} /> Not for me</button>}
      </main>
    </>
  )
}

function StudioDirectory({
  loadingId,
  error,
  reducedMotion,
  onClose,
  onOpen,
}: {
  loadingId: number | null
  error: string
  reducedMotion: boolean
  onClose: () => void
  onOpen: (studio: StudioDefinition) => void
}) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080a]/92 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center gap-3"><button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-white/72 active:scale-95" aria-label="Close studio directory"><X size={19} /></button><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">Animation authorship</p><h2 id="studio-directory-title" className="mt-1 text-[28px] font-black leading-none tracking-[-0.06em]">Studios</h2></div></div>
        <p className="mt-4 max-w-[340px] text-[13px] leading-relaxed text-white/46">Browse the verified studios behind animation. Personal studio records appear only after your history reveals a real pattern.</p>
        {error && <p className="mt-3 rounded-[16px] bg-rose-500/12 px-3 py-2 text-[12px] font-semibold text-rose-200">{error}</p>}
      </header>
      <main className="space-y-2 px-4 py-4">
        {STUDIOS.map((studio, index) => (
          <motion.button key={studio.id} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.018, 0.2) }} onClick={() => onOpen(studio)} disabled={loadingId !== null} className="flex min-h-[76px] w-full items-center justify-between gap-3 rounded-[24px] bg-white/[0.045] px-4 text-left ring-1 ring-white/[0.065] active:scale-[0.99] disabled:opacity-55">
            <span className="min-w-0"><span className="block truncate text-[18px] font-black tracking-[-0.04em]">{studio.name}</span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/34">{studio.collectible ? 'Studio page · personal record' : 'Studio page'} · about {studio.approxCount} titles</span></span>
            {loadingId === studio.id ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <ChevronRight size={18} className="shrink-0 text-white/36" />}
          </motion.button>
        ))}
      </main>
    </>
  )
}
