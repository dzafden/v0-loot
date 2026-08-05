import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FranchiseDefinition, FranchiseMember, Show } from '../../types'
import { addToWatchlistShelf, ensureDefaultWatchlistShelves, getOrPersistStudioDefinition, upsertShow } from '../../data/queries'
import { hasTmdbKey, imgUrl } from '../../lib/tmdb'
import { STUDIOS, type StudioDefinition } from '../../lib/studios'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { FeedSaveActions } from '../../components/show/FeedSaveActions'
import { StudioCover, type StudioCatalogueStats } from './StudioCover'

interface Props {
  open: boolean
  requestedStudioId: number | null
  shows: Show[]
  watchlistShows: Show[]
  onClose: () => void
  onOpenShow: (show: Show) => void
}

const STUDIO_GROUPS = [
  { id: 'anime', title: 'Anime studios', studios: STUDIOS.filter((studio) => studio.tradition === 'anime') },
  { id: 'western', title: 'Western animation', studios: STUDIOS.filter((studio) => studio.tradition === 'western') },
  { id: 'euro', title: 'European & independent', studios: STUDIOS.filter((studio) => studio.tradition === 'euro') },
] as const

export function StudioDirectoryBrowser({
  open,
  requestedStudioId,
  shows,
  watchlistShows,
  onClose,
  onOpenShow,
}: Props) {
  const reducedMotion = useReducedMotion()
  const [browsedStudio, setBrowsedStudio] = useState<FranchiseDefinition | null>(null)
  const [directMode, setDirectMode] = useState(requestedStudioId !== null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const showsById = useMemo(() => new Map(shows.map((show) => [show.id, show])), [shows])
  const watchlistById = useMemo(() => new Map(watchlistShows.map((show) => [show.id, show])), [watchlistShows])
  const leaveStudio = useCallback(() => {
    if (directMode) {
      onClose()
      return
    }
    setBrowsedStudio(null)
    setDirectMode(false)
  }, [directMode, onClose])

  useEffect(() => {
    if (!open || !directMode || requestedStudioId === null) return
    const studio = STUDIOS.find((candidate) => candidate.id === requestedStudioId)
    if (!studio) return
    let active = true

    if (!hasTmdbKey()) {
      const timer = window.setTimeout(() => {
        if (!active) return
        setError('Add your TMDB key in Settings to load studio catalogues.')
        setDirectMode(false)
      }, 0)
      return () => {
        active = false
        window.clearTimeout(timer)
      }
    }

    void getOrPersistStudioDefinition(studio.id)
      .then((definition) => {
        if (!active) return
        if (definition) setBrowsedStudio(definition)
        else {
          setError('No eligible animated titles found for this studio.')
          setDirectMode(false)
        }
      })
      .catch(() => {
        if (!active) return
        setError('Could not load this studio right now.')
        setDirectMode(false)
      })

    return () => { active = false }
  }, [directMode, open, requestedStudioId])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (browsedStudio) {
        leaveStudio()
      } else onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [browsedStudio, leaveStudio, onClose, open])

  useEffect(() => {
    if (!browsedStudio) return
    const frame = globalThis.requestAnimationFrame(() => scrollRootRef.current?.scrollTo({ top: 0 }))
    return () => globalThis.cancelAnimationFrame(frame)
  }, [browsedStudio])

  const browseStudio = async (studio: StudioDefinition) => {
    if (loadingId !== null) return
    if (!hasTmdbKey()) {
      setError('Add your TMDB key in Settings to load studio catalogues.')
      return
    }
    setLoadingId(studio.id)
    setError('')
    try {
      const definition = await getOrPersistStudioDefinition(studio.id)
      if (definition) setBrowsedStudio(definition)
      else setError('No eligible animated titles found for this studio.')
    } catch {
      setError('Could not load this studio right now.')
    } finally {
      setLoadingId(null)
    }
  }

  const addToDefaultWatchlist = async (show: Show) => {
    const shelves = await ensureDefaultWatchlistShelves()
    const shelf = shelves.find((candidate) => candidate.name === 'Watch next') ?? shelves[0]
    if (shelf) await addToWatchlistShelf(shelf.id, show)
  }

  const openMember = (show: Show) => {
    setBrowsedStudio(null)
    onOpenShow(show)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={scrollRootRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          className="fixed inset-0 z-[86] overflow-y-auto overscroll-contain bg-[#07080a] text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-directory-title"
        >
          <div className="mx-auto min-h-full w-full max-w-md pb-[max(2rem,env(safe-area-inset-bottom))]">
            {directMode && !browsedStudio ? (
              <DirectStudioLoading studioName={STUDIOS.find((studio) => studio.id === requestedStudioId)?.name ?? 'Studio'} onClose={onClose} />
            ) : browsedStudio ? (
              <StudioCatalogue
                definition={browsedStudio}
                showsById={showsById}
                watchlistById={watchlistById}
                reducedMotion={reducedMotion}
                onBack={leaveStudio}
                onOpenShow={openMember}
                onSeen={upsertShow}
                onWatchlist={addToDefaultWatchlist}
              />
            ) : (
              <StudioDirectory loadingId={loadingId} error={error} reducedMotion={reducedMotion} onClose={onClose} onOpen={browseStudio} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function DirectStudioLoading({ studioName, onClose }: { studioName: string; onClose: () => void }) {
  return (
    <div className="min-h-svh bg-[#07080a] px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-white/78 active:scale-95" aria-label="Back to Discover">
        <ChevronLeft size={20} />
      </button>
      <div className="flex min-h-[62vh] flex-col items-center justify-center text-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/18 border-t-white" aria-hidden />
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/38">Opening</p>
        <p className="mt-2 text-[28px] font-black tracking-[-0.055em] text-white/92">{studioName}</p>
      </div>
    </div>
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
  const [studioStats, setStudioStats] = useState<Record<number, StudioCatalogueStats>>({})
  const updateStudioStats = useCallback((studioId: number, stats: StudioCatalogueStats) => {
    setStudioStats((current) => {
      const previous = current[studioId]
      if (previous?.tvCount === stats.tvCount && previous.movieCount === stats.movieCount) return current
      return { ...current, [studioId]: stats }
    })
  }, [])

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080a]/92 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/78 active:scale-95" aria-label="Back to Discover">
            <ChevronLeft size={20} />
          </button>
          <h2 id="studio-directory-title" className="text-[30px] font-black leading-none tracking-[-0.065em]">Animation studios</h2>
        </div>
        {error && <p className="mt-3 rounded-[16px] bg-rose-500/12 px-3 py-2 text-[12px] font-semibold text-rose-200">{error}</p>}
      </header>

      <main className="px-4 pb-4">
        {STUDIO_GROUPS.map((group) => (
          <section key={group.id} className="pt-7" aria-label={group.id === 'anime' ? group.title : undefined} aria-labelledby={group.id === 'anime' ? undefined : `studio-group-${group.id}`}>
            {group.id !== 'anime' && <h3 id={`studio-group-${group.id}`} className="mb-4 text-[21px] font-black leading-none tracking-[-0.045em] text-white/88">{group.title}</h3>}
            <div className="space-y-6">
              {group.studios.map((studio, index) => (
                <motion.div
                  key={studio.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.018, 0.14), duration: reducedMotion ? 0 : 0.22 }}
                >
                  <button
                    onClick={() => onOpen(studio)}
                    disabled={loadingId !== null}
                    aria-label={`Open all ${studio.name} titles`}
                    className="flex min-h-12 w-full items-center gap-3 text-left transition-opacity active:opacity-60 disabled:opacity-55"
                  >
                    <h4 className="min-w-0 flex-1 text-[20px] font-black leading-none tracking-[-0.045em] text-white/94">{studio.name}</h4>
                    {studioStats[studio.id] && <span className="shrink-0 text-[13px] font-medium text-white/58">{studioStats[studio.id].tvCount + studioStats[studio.id].movieCount} titles</span>}
                    {loadingId === studio.id ? (
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden />
                    ) : (
                      <ChevronRight size={19} className="shrink-0 text-white/48" aria-hidden />
                    )}
                  </button>
                  <StudioCover studioId={studio.id} className="h-[116px] w-full" onCatalogue={(stats) => updateStudioStats(studio.id, stats)} />
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  )
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
    overview: member.overview,
    genres: ['Animation'],
    rawGenres: ['Animation'],
    mediaType: member.mediaType ?? 'movie',
    studioIds: definition.sourceId ? [definition.sourceId] : undefined,
    addedAt: now,
    updatedAt: now,
  }
}

function StudioCatalogue({
  definition,
  showsById,
  watchlistById,
  reducedMotion,
  onBack,
  onOpenShow,
  onSeen,
  onWatchlist,
}: {
  definition: FranchiseDefinition
  showsById: Map<number, Show>
  watchlistById: Map<number, Show>
  reducedMotion: boolean
  onBack: () => void
  onOpenShow: (show: Show) => void
  onSeen: (show: Show) => Promise<unknown>
  onWatchlist: (show: Show) => Promise<unknown>
}) {
  const members = useMemo(
    () => [...definition.members].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    [definition.members],
  )

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080a]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex min-h-12 items-center gap-3">
          <button onClick={onBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/78 active:scale-95" aria-label="Back to studios">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 id="studio-directory-title" className="truncate text-[21px] font-black leading-none tracking-[-0.05em] text-white/94">{definition.name}</h2>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/38">{members.length} title{members.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 pb-5 pt-4">
        {members.map((member, index) => {
          const owned = showsById.get(member.id)
          const watchlisted = watchlistById.get(member.id)
          const show = memberAsShow(member, definition, owned ?? watchlisted)
          const artwork = member.backdropPath ?? member.posterPath
          const overview = (member as FranchiseMember & { overview?: string }).overview
          const typeLabel = (member.mediaType ?? 'movie') === 'tv' ? 'Series' : 'Film'

          return (
            <motion.article
              key={`${member.mediaType}:${member.id}`}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.025, 0.18), duration: reducedMotion ? 0 : 0.28 }}
              className="group overflow-hidden rounded-[26px] bg-[#121216] ring-1 ring-white/[0.08]"
            >
              <button onClick={() => onOpenShow(show)} className="block w-full text-left transition-transform active:scale-[0.992]" aria-label={`Open ${member.name}`}>
                <div className="relative aspect-[16/8.4] overflow-hidden bg-white/[0.035]">
                  {artwork ? (
                    <img src={imgUrl(artwork, 'w500')} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" aria-hidden />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.1),transparent_42%),linear-gradient(145deg,#24242b,#101014)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" aria-hidden />
                  <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
                    <span className="rounded-full bg-black/56 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/72 backdrop-blur-md">{member.releaseDate.slice(0, 4) || 'Year unknown'} · {typeLabel}</span>
                    {owned && <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f5c453] text-black shadow-[0_4px_18px_rgba(245,196,83,0.28)]" aria-label="Watched"><Check size={16} strokeWidth={3} /></span>}
                  </div>
                </div>
                <div className="p-4 pb-2 pt-3.5">
                  <h3 className="line-clamp-2 text-[20px] font-black leading-[1.02] tracking-[-0.045em] text-white/94">{member.name}</h3>
                  {overview ? (
                    <p className="mt-2 line-clamp-3 text-[12px] leading-[1.55] text-white/52">{overview}</p>
                  ) : (
                    <p className="mt-2 text-[11px] font-semibold text-white/32">{typeLabel} · {member.releaseDate.slice(0, 4) || 'Release year unknown'}</p>
                  )}
                </div>
              </button>
              <div className="flex justify-end px-3 pb-3">
                  <FeedSaveActions
                    isSeen={Boolean(owned)}
                    isWatchlisted={Boolean(watchlisted)}
                    onSeen={async () => { await onSeen(show) }}
                    onWatchlist={async () => { await onWatchlist(show) }}
                    size="sm"
                  />
              </div>
            </motion.article>
          )
        })}
      </main>
    </>
  )
}
