import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Check, ChevronDown, ChevronLeft, Drama, EyeOff, ExternalLink, Plus, Trash2, Tv, X } from 'lucide-react'
import type { CastRole, EmojiCategory, RecommendationContext, Show, Tier } from '../../types'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import {
  applyEmoji,
  cacheSeason,
  createEmojiCategory,
  deleteShow,
  hideDiscoverTitle,
  removeEmoji,
  restoreDiscoverTitle,
  setAllCachedSeasonsWatched,
  setTier,
  progressForShow,
  upsertShow,
  updateShowMetadata,
} from '../../data/queries'
import {
  getCredits,
  getSeason,
  getShowDetail,
  getShowImages,
  getShowWatchProviders,
  getWatchRegion,
  hasTmdbKey,
  imgUrl,
  type TmdbWatchProvider,
  type WatchProviderResult,
} from '../../lib/tmdb'
import { getRarity, RARITIES } from '../../lib/rarity'
import { cn } from '../../lib/utils'
import { WatchlistShelfPicker } from '../watchlist/WatchlistShelfPicker'
import { ImdbBadge } from '../../components/ui/ImdbBadge'

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']
const SUGGESTED_EMOJI = ['❤️', '🔥', '💀', '🥶', '😭', '🍔', '🥲', '🌹', '🥀', '👑', '🎯', '🤡', '🧠', '🎲', '🌶️', '⭐']
type LogoAsset = { file_path: string; vote_average?: number; iso_639_1?: string | null }
type SeasonInfo = { seasons: number; episodes: number }
type TierDetailStyle = { color: string; soft: string; wash: string }
type DetailCastMember = {
  id: number
  name: string
  character: string
  profile_path: string | null
}

const TIER_DETAIL: Record<Tier, TierDetailStyle> = {
  S: { color: '#fb7185', soft: 'rgba(251,113,133,0.22)', wash: 'rgba(251,113,133,0.10)' },
  A: { color: '#fb923c', soft: 'rgba(251,146,60,0.20)', wash: 'rgba(251,146,60,0.10)' },
  B: { color: '#d9a92f', soft: 'rgba(217,169,47,0.20)', wash: 'rgba(217,169,47,0.10)' },
  C: { color: '#84cc16', soft: 'rgba(132,204,22,0.18)', wash: 'rgba(132,204,22,0.09)' },
  D: { color: '#38bdf8', soft: 'rgba(56,189,248,0.18)', wash: 'rgba(56,189,248,0.09)' },
}

const logoCache = new Map<number, string | null>()

function bestLogo(items: LogoAsset[] = []) {
  return [...items]
    .filter((item) => item.iso_639_1 === 'en' || item.iso_639_1 === null)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]?.file_path ?? null
}

function seasonLabel(info: SeasonInfo | null, progress: { watched: number; total: number }) {
  if (info) {
    const seasons = `${info.seasons} season${info.seasons === 1 ? '' : 's'}`
    return info.episodes ? `${seasons} / ${info.episodes} eps` : seasons
  }
  return progress.total > 0 ? `${progress.total} eps` : null
}

interface Props {
  show: Show
  recommendationContext?: RecommendationContext
  onBack: () => void
  onTrackEpisodes: (s: Show) => void
  onAssignRole: (s: Show, personId?: number) => void
}

export function ShowDetail({ show, recommendationContext, onBack, onTrackEpisodes, onAssignRole }: Props) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [episodeBulkBusy, setEpisodeBulkBusy] = useState<null | 'mark' | 'unmark'>(null)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null)
  const [showCast, setShowCast] = useState<DetailCastMember[]>([])
  const [castLoading, setCastLoading] = useState(false)
  const [rankEditorOpen, setRankEditorOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const [watchlistOpen, setWatchlistOpen] = useState(false)
  const [watchProviders, setWatchProviders] = useState<WatchProviderResult | null>(null)
  const persistedShow = useDexieQuery<Show | undefined>(['shows'], () => db.shows.get(show.id), undefined, [show.id])
  const liveShow = persistedShow ?? show
  const owned = Boolean(persistedShow)
  const emojiCategories = useDexieQuery(['emojiCategories'], () => db.emojiCategories.toArray(), [], [])
  const tierAssignment = useDexieQuery(['tierAssignments'], () => db.tierAssignments.get(show.id), undefined, [show.id])
  const cast = useDexieQuery(['castRoles'], () => db.castRoles.where({ showId: show.id }).toArray(), [], [show.id])
  const discoverFeedback = useDexieQuery(['discoverFeedback'], () => db.discoverFeedback.get(show.id), undefined, [show.id])
  const [progress, setProgress] = useState({ watched: 0, total: 0 })
  const [feedbackUndoVisible, setFeedbackUndoVisible] = useState(false)

  useEffect(() => {
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'auto' })
    setStoryOpen(false)
  }, [show.id, scrollEl])

  useEffect(() => {
    progressForShow(show.id).then(setProgress)
  }, [show.id, episodeBulkBusy])

  useEffect(() => {
    if (!hasTmdbKey()) {
      setLogoPath(null)
      setSeasonInfo(null)
      return
    }
    let cancelled = false
    const cachedLogo = logoCache.get(show.id)
    if (cachedLogo !== undefined) setLogoPath(cachedLogo)

    getShowImages(show.id)
      .then((images) => {
        const logo = bestLogo(images.logos)
        logoCache.set(show.id, logo)
        if (!cancelled) setLogoPath(logo)
      })
      .catch(() => {
        logoCache.set(show.id, null)
        if (!cancelled) setLogoPath(null)
      })

    getShowDetail(show.id)
      .then((detail) => {
        if (cancelled) return
        const seasons = detail.seasons.filter((season) => season.season_number !== 0)
        const episodes = seasons.reduce((sum, season) => sum + (season.episode_count ?? 0), 0)
        setSeasonInfo({ seasons: detail.number_of_seasons || seasons.length, episodes })
        void updateShowMetadata(show.id, {
          seasonCount: detail.number_of_seasons || seasons.length,
          episodeCount: detail.number_of_episodes || episodes,
          status: detail.status,
        })
      })
      .catch(() => {
        if (!cancelled) setSeasonInfo(null)
      })

    return () => {
      cancelled = true
    }
  }, [show.id])

  useEffect(() => {
    if (!hasTmdbKey()) {
      setWatchProviders(null)
      return
    }
    let cancelled = false
    getShowWatchProviders(show.id)
      .then((providers) => {
        if (!cancelled) setWatchProviders(providers)
      })
      .catch(() => {
        if (!cancelled) setWatchProviders(null)
      })
    return () => {
      cancelled = true
    }
  }, [show.id])

  useEffect(() => {
    if (!hasTmdbKey()) {
      setShowCast([])
      return
    }

    let cancelled = false
    setCastLoading(true)
    getCredits(show.id)
      .then((credits) => {
        if (cancelled) return
        const withImages = credits.cast.filter((member) => member.profile_path)
        const withoutImages = credits.cast.filter((member) => !member.profile_path)
        setShowCast([...withImages, ...withoutImages].slice(0, 14))
      })
      .catch(() => {
        if (!cancelled) setShowCast([])
      })
      .finally(() => {
        if (!cancelled) setCastLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [show.id])

  const tier = tierAssignment?.tier ?? null
  const isTop8 = typeof liveShow.top8Position === 'number' && liveShow.top8Position >= 0
  const rarity = getRarity(liveShow, tier, isTop8)
  const r = RARITIES[rarity]
  const accent = tier ? TIER_DETAIL[tier].color : r.hex
  const showEmojis = useMemo(() => emojiCategories.filter((c) => c.showIds.includes(show.id)), [emojiCategories, show.id])
  const metadata = [liveShow.year, liveShow.genres?.[0], seasonLabel(seasonInfo, progress)].filter((item): item is string | number => item !== null && item !== undefined && item !== '')

  const handleAddToCollection = async () => {
    await upsertShow({
      ...liveShow,
      addedAt: liveShow.addedAt || Date.now(),
      updatedAt: Date.now(),
    })
    navigator.vibrate?.([6, 20, 10])
  }

  const handleTier = async (nextTier: Tier) => {
    if (!owned) await handleAddToCollection()
    await setTier(show.id, tier === nextTier ? null : nextTier)
    setRankEditorOpen(false)
    navigator.vibrate?.([6, 18, 8])
  }

  const handleDelete = async () => {
    if (!confirm(`Remove "${show.name}" from your collection?`)) return
    await deleteShow(show.id)
    onBack()
  }

  const hideFromDiscover = async () => {
    await hideDiscoverTitle(liveShow)
    setFeedbackUndoVisible(true)
    window.setTimeout(() => setFeedbackUndoVisible(false), 6000)
  }

  const restoreToDiscover = async () => {
    await restoreDiscoverTitle(show.id)
    setFeedbackUndoVisible(false)
  }

  const ensureSeasonCache = async () => {
    const detail = await getShowDetail(show.id)
    const cached = await db.seasonCache.where({ showId: show.id }).toArray()
    const cachedSet = new Set(cached.map((s) => s.seasonNumber))
    for (const season of detail.seasons) {
      if (season.season_number === 0) continue
      if (cachedSet.has(season.season_number)) continue
      const data = await getSeason(show.id, season.season_number)
      await cacheSeason({
        key: `${show.id}-${season.season_number}`,
          showId: show.id,
          seasonNumber: season.season_number,
          name: data.name ?? season.name,
          posterPath: data.poster_path ?? season.poster_path ?? null,
          episodes: data.episodes.map((episode) => ({
            episode_number: episode.episode_number,
            name: episode.name,
          still_path: episode.still_path ?? null,
        })),
        fetchedAt: Date.now(),
      })
    }
  }

  const handleEpisodeBulk = async (watchAll: boolean) => {
    if (!owned) await handleAddToCollection()
    setEpisodeBulkBusy(watchAll ? 'mark' : 'unmark')
    try {
      await ensureSeasonCache()
      await setAllCachedSeasonsWatched(show.id, watchAll)
      const next = await progressForShow(show.id)
      setProgress(next)
    } finally {
      setEpisodeBulkBusy(null)
    }
  }

  return (
    <div ref={setScrollEl} className="fixed inset-0 z-[45] overflow-y-auto overscroll-contain bg-[#060509] pb-24 text-white">
      <div className="relative h-[clamp(330px,42svh,390px)] overflow-hidden">
        {liveShow.backdropPath ? (
          <img
            src={imgUrl(liveShow.backdropPath, 'original')}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.86]"
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/8 via-black/18 to-[#060509]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/20 to-black/8" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#060509] via-[#060509]/76 to-transparent" />

        <header className="relative z-20 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full bg-black/34 text-white/86 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95" aria-label="Back">
            <ChevronLeft size={21} />
          </button>
          <motion.button
            key={tier ?? 'rank'}
            onClick={() => setRankEditorOpen((open) => !open)}
            initial={{ opacity: 0, y: -8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              'grid h-11 min-w-11 place-items-center rounded-[17px] px-3 font-black uppercase backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95',
              tier ? 'text-[16px]' : 'text-[9px] tracking-[0.14em]',
            )}
            style={{
              background: tier ? accent : 'rgba(0,0,0,0.42)',
              color: tier ? '#fff' : accent,
              boxShadow: tier ? `0 16px 38px ${accent}42, inset 0 1px 0 rgba(255,255,255,0.22)` : undefined,
            }}
            aria-label={tier ? `Change ${tier} rank` : 'Rank this show'}
          >
            {tier ?? 'Rank'}
          </motion.button>
        </header>

        <AnimatePresence>
          {rankEditorOpen && (
            <motion.div
              initial={{ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }}
              animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateY(-3px) scale(0.98)' }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="absolute right-4 top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] z-30 origin-top-right"
            >
              <InlineRank tier={tier} onTier={handleTier} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-x-0 bottom-6 z-10 px-5">
          {logoPath ? (
            <img src={imgUrl(logoPath, 'w500')} alt={liveShow.name} className="max-h-[88px] max-w-[72%] object-contain object-left drop-shadow-[0_14px_30px_rgba(0,0,0,0.96)]" />
          ) : (
            <h1 className="max-w-[330px] text-[40px] font-black leading-[0.9] tracking-[-0.08em] text-balance drop-shadow-[0_14px_30px_rgba(0,0,0,0.9)]">{liveShow.name}</h1>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/58">
            <ImdbBadge showId={show.id} compact className="mr-1" />
            {metadata.map((item) => <span key={item}>{item}</span>)}
          </div>

          {recommendationContext && (
            <p className="mt-2 max-w-[300px] text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
              Recommended from {recommendationContext.anchorName}
              {recommendationContext.anchorTier ? ` · ${recommendationContext.anchorTier}-tier` : ''}
              {recommendationContext.sharedGenre ? ` · ${recommendationContext.sharedGenre}` : ''}
            </p>
          )}
        </div>
      </div>

      <main className="relative z-20 px-4 pt-4">
        {liveShow.overview && (
          <section>
            <p className={cn('text-[15px] font-semibold leading-[1.38] text-white/72', !storyOpen && 'line-clamp-3')}>
              {liveShow.overview}
            </p>
            {liveShow.overview.length > 180 && (
              <button onClick={() => setStoryOpen((value) => !value)} className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/34 active:scale-95">
                {storyOpen ? 'Less' : 'More'}
              </button>
            )}
          </section>
        )}

        {!owned ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => void handleAddToCollection()}
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[#f5c453] text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[0_16px_36px_rgba(245,196,83,0.16)] active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={3} />
              Collection
            </button>
            <button
              onClick={() => setWatchlistOpen(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-white/[0.08] text-[10px] font-black uppercase tracking-[0.14em] text-white ring-1 ring-white/[0.08] active:scale-[0.98]"
            >
              <Bookmark size={15} fill="currentColor" />
              Watchlist
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => onTrackEpisodes(liveShow)}
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] text-[10px] font-black uppercase tracking-[0.14em] text-black active:scale-[0.98]"
              style={{ background: accent }}
            >
              <Tv size={16} strokeWidth={2.8} />
              Episodes
            </button>
            <button
              onClick={() => setWatchlistOpen(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-white/[0.08] text-[10px] font-black uppercase tracking-[0.14em] text-white ring-1 ring-white/[0.08] active:scale-[0.98]"
            >
              <Bookmark size={15} fill="currentColor" />
              Watchlist
            </button>
          </div>
        )}

        {watchProviders && <WhereToWatch providers={watchProviders} region={getWatchRegion()} />}

        <div className="mt-3 flex min-h-8 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <VibeRail showId={show.id} applied={showEmojis} accent={accent} />
          </div>
          {!owned && (
            <button
              onClick={() => discoverFeedback?.hiddenUntil && discoverFeedback.hiddenUntil > Date.now()
                ? void restoreToDiscover()
                : void hideFromDiscover()}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/26 transition-colors hover:text-white/58 active:scale-95"
            >
              <EyeOff size={12} />
              {discoverFeedback?.hiddenUntil && discoverFeedback.hiddenUntil > Date.now() ? 'Show again' : 'Not interested'}
            </button>
          )}
        </div>

        <TrackingSection
          show={liveShow}
          progress={progress}
          busy={episodeBulkBusy}
          onOpen={async () => {
            if (!owned) await handleAddToCollection()
            onTrackEpisodes(liveShow)
          }}
          onBulk={handleEpisodeBulk}
          accent={accent}
        />

        <CastSection
          assigned={cast}
          members={showCast}
          loading={castLoading}
          onCast={async () => {
            if (!owned) await handleAddToCollection()
            onAssignRole(liveShow)
          }}
          onCastPerson={async (personId) => {
            if (!owned) await handleAddToCollection()
            onAssignRole(liveShow, personId)
          }}
          accent={accent}
        />

        {owned && (
          <div className="mt-9 flex justify-center border-t border-white/[0.06] pt-5">
            <button onClick={handleDelete} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/18 transition-colors hover:text-rose-300 active:scale-95">
              <Trash2 size={12} />
              Remove from collection
            </button>
          </div>
        )}
      </main>
      <WatchlistShelfPicker open={watchlistOpen} show={liveShow} onClose={() => setWatchlistOpen(false)} />
      {feedbackUndoVisible && (
        <div className="fixed inset-x-4 bottom-24 z-[70] mx-auto flex h-14 max-w-sm items-center justify-between rounded-[20px] bg-[#17141b]/96 px-4 text-[12px] font-bold text-white shadow-[0_22px_54px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.1] backdrop-blur-2xl">
          <span>Hidden from Discover</span>
          <button onClick={() => void restoreToDiscover()} className="h-9 rounded-full bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em] text-black active:scale-95">Undo</button>
        </div>
      )}
    </div>
  )
}

function uniqueProviders(groups: (TmdbWatchProvider[] | undefined)[]) {
  const byId = new Map<number, TmdbWatchProvider>()
  for (const group of groups) {
    for (const provider of group ?? []) byId.set(provider.provider_id, provider)
  }
  return [...byId.values()].sort((a, b) => a.display_priority - b.display_priority)
}

function ProviderLogo({ provider }: { provider: TmdbWatchProvider }) {
  return (
    <span className="flex min-w-0 items-center gap-2" title={provider.provider_name}>
      {provider.logo_path ? (
        <img src={imgUrl(provider.logo_path, 'w185')} alt="" className="h-9 w-9 shrink-0 rounded-[9px] object-cover" />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-white/[0.08] text-[10px] font-black">
          {provider.provider_name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="truncate text-xs font-bold text-white/72">{provider.provider_name}</span>
    </span>
  )
}

function ProviderIcon({ provider }: { provider: TmdbWatchProvider }) {
  return provider.logo_path ? (
    <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-[8px] bg-white/[0.06]" title={provider.provider_name} aria-label={provider.provider_name}>
      <img src={imgUrl(provider.logo_path, 'w185')} alt="" className="h-full w-full object-cover" />
    </span>
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-white/[0.08] text-[9px] font-black text-white/64" title={provider.provider_name} aria-label={provider.provider_name}>
      {provider.provider_name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function WhereToWatch({ providers, region }: { providers: WatchProviderResult; region: string }) {
  const streaming = uniqueProviders([providers.flatrate, providers.free, providers.ads])
  const transactional = uniqueProviders([providers.rent, providers.buy])
  if (!streaming.length && !transactional.length) return null
  const primary = streaming.length ? streaming : transactional
  const hiddenCount = Math.max(0, primary.length - 3)
  const hasMore = streaming.length > 3 || transactional.length > 0

  return (
    <section className="mt-4 border-y border-white/[0.07] py-3">
      <div className="flex min-h-8 items-center gap-3">
        <div>
          <h2 className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.16em] text-white/72">Where to watch</h2>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white/26">{region}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {primary.slice(0, 3).map((provider) => <ProviderIcon key={provider.provider_id} provider={provider} />)}
          {hiddenCount > 0 && (
            <span className="grid h-8 min-w-8 place-items-center rounded-[8px] bg-white/[0.06] px-1 text-[9px] font-black text-white/42">+{hiddenCount}</span>
          )}
        </div>
        {providers.link && (
          <a href={providers.link} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/[0.06] text-white/38 active:scale-95" aria-label="Open streaming options">
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      {hasMore && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/28 active:text-white/52">
            More options
            <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-4">
            {streaming.length > 0 && (
              <div>
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-white/24">Stream</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {streaming.slice(0, 6).map((provider) => <ProviderLogo key={provider.provider_id} provider={provider} />)}
                </div>
              </div>
            )}
            {transactional.length > 0 && (
              <div>
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-white/24">Rent or buy</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {transactional.slice(0, 6).map((provider) => <ProviderLogo key={provider.provider_id} provider={provider} />)}
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  )
}

function InlineRank({ tier, onTier }: { tier: Tier | null; onTier: (tier: Tier) => void }) {
  return (
    <div className="rounded-[20px] bg-[rgba(17,16,20,0.96)] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.1] backdrop-blur-2xl">
      <p className="mb-2 px-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/32">Your rank</p>
      <div className="grid grid-cols-5 gap-1.5">
        {TIERS.map((rank) => {
          const style = TIER_DETAIL[rank]
          const active = tier === rank
          return (
            <button
              key={rank}
              onClick={() => onTier(rank)}
              className={cn('h-11 w-11 rounded-[14px] border text-lg font-black transition-transform active:scale-95', active && 'scale-[1.04]')}
              style={{
                color: style.color,
                background: active ? style.soft : style.wash,
                borderColor: active ? `${style.color}aa` : `${style.color}38`,
                boxShadow: active ? `0 8px 22px ${style.color}38` : undefined,
              }}
              aria-pressed={active}
              aria-label={`${rank} rank`}
            >
              {rank}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CastSection({
  assigned,
  members,
  loading,
  onCast,
  onCastPerson,
  accent,
}: {
  assigned: CastRole[]
  members: DetailCastMember[]
  loading: boolean
  onCast: () => void
  onCastPerson: (personId: number) => void
  accent: string
}) {
  const assignedByPerson = new Map(assigned.filter((role) => role.personId).map((role) => [role.personId!, role]))
  const hasAssigned = assigned.length > 0

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
          <Drama size={14} /> Cast
        </div>
        <button onClick={onCast} className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.16em] text-black active:scale-95" style={{ background: accent }}>
          Cast role
        </button>
      </div>

      {hasAssigned && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {assigned.slice(0, 5).map((role) => (
            <button key={role.id} onClick={onCast} className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.07] py-1 pl-1 pr-3 text-left ring-1 ring-white/[0.06] active:scale-95">
              {role.profilePath ? (
                <img src={imgUrl(role.profilePath, 'w185')} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] text-[10px] font-black text-white/45">{role.characterName.slice(0, 2).toUpperCase()}</span>
              )}
              <span>
                <span className="block text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>{role.roleName}</span>
                <span className="block max-w-[118px] truncate text-[11px] font-black leading-none text-white/80">{role.characterName}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-[152px] w-[106px] shrink-0 animate-pulse rounded-[22px] bg-white/[0.06]" />
          ))}
        </div>
      ) : members.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {members.map((member, index) => {
            const assignedRole = assignedByPerson.get(member.id)
            const disabled = Boolean(assignedRole)
            return (
              <button
                key={`${member.id}-${index}`}
                onClick={() => !disabled && onCastPerson(member.id)}
                disabled={disabled}
                className={cn(
                  'group relative h-[154px] w-[108px] shrink-0 overflow-hidden rounded-[23px] bg-black text-left shadow-[0_16px_36px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.07] transition-transform active:scale-[0.97]',
                  disabled && 'opacity-80',
                )}
              >
                {member.profile_path ? (
                  <img src={imgUrl(member.profile_path, 'w342')} alt={member.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-zinc-900 text-2xl font-black text-white/30">
                    {(member.character || member.name).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/16 to-black/8" />
                <span
                  className={cn('absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full font-black shadow-[0_12px_24px_rgba(0,0,0,0.45)]', assignedRole ? 'bg-white text-black' : 'text-black')}
                  style={assignedRole ? undefined : { background: accent }}
                >
                  {assignedRole ? <Check size={16} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  {assignedRole && <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>{assignedRole.roleName}</p>}
                  <p className="line-clamp-2 text-[13px] font-black leading-[0.95] tracking-[-0.05em] text-white">{member.character || member.name}</p>
                  <p className="mt-1 truncate text-[9px] font-bold text-white/38">{member.name}</p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <button onClick={onCast} className="flex min-h-[94px] w-full items-center justify-between rounded-[28px] bg-white/[0.045] px-4 text-left ring-1 ring-white/[0.06] active:scale-[0.99]">
          <span>
            <span className="block text-[15px] font-black tracking-[-0.04em] text-white/82">Cast info unavailable</span>
            <span className="mt-1 block text-[11px] font-bold text-white/36">Add a role manually</span>
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-full text-black" style={{ background: accent }}>
            <Plus size={19} strokeWidth={3} />
          </span>
        </button>
      )}
    </section>
  )
}

function TrackingSection({
  show,
  progress,
  busy,
  onOpen,
  onBulk,
  accent,
}: {
  show: Show
  progress: { watched: number; total: number }
  busy: null | 'mark' | 'unmark'
  onOpen: () => void
  onBulk: (watchAll: boolean) => void
  accent: string
}) {
  const complete = progress.total > 0 && progress.watched >= progress.total
  const percent = progress.total > 0 ? Math.min(100, (progress.watched / progress.total) * 100) : 0
  const percentLabel = progress.total > 0 ? `${Math.round(percent)}% watched` : 'Choose seasons and episodes'
  const statusLabel = progress.total > 0 ? (complete ? 'All watched' : `${progress.watched}/${progress.total}`) : 'Start'
  return (
    <section className="mt-8 -mx-4">
      <div className="relative overflow-hidden border-y border-white/[0.07] bg-[#101014] shadow-[0_22px_58px_rgba(0,0,0,0.46)]">
        {show.backdropPath ? (
          <img src={imgUrl(show.backdropPath, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.42]" loading="lazy" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/62 to-black/26" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 88% 16%, ${accent}33, transparent 17rem)` }} />

        <div className="relative z-10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
                <Tv size={14} /> Watch tracking
              </div>
              <p className="mt-3 text-[34px] font-black leading-none tracking-[-0.09em] text-white">
                {statusLabel}
              </p>
              <p className="mt-1 text-[12px] font-bold text-white/50">{percentLabel}</p>
            </div>
            <button onClick={onOpen} className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white text-black shadow-[0_14px_28px_rgba(0,0,0,0.4)] active:scale-95" aria-label="Open episode tracker">
              <Tv size={20} strokeWidth={2.8} />
            </button>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/[0.1]">
            <motion.div
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{ type: 'spring', stiffness: 190, damping: 24 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.86))` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={onOpen} className="h-12 rounded-[20px] bg-white/[0.11] px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.98]">
              Episodes
            </button>
            <button onClick={() => onBulk(!complete)} disabled={busy !== null} className="h-12 rounded-[20px] px-4 text-[11px] font-black uppercase tracking-[0.16em] text-black disabled:opacity-50 active:scale-[0.98]" style={{ background: accent }}>
              {busy ? 'Saving' : complete ? 'Unmark all' : 'Mark watched'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function VibeRail({ showId, applied, accent }: { showId: number; applied: EmojiCategory[]; accent: string }) {
  const [creating, setCreating] = useState(false)
  const [emoji, setEmoji] = useState('')
  const [label, setLabel] = useState('')
  const appliedIds = new Set(applied.map((a) => a.id))
  const visible = applied.slice(0, 5)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((category) => {
          const on = appliedIds.has(category.id)
          return (
            <button key={category.id} onClick={() => on ? void removeEmoji(category.id, showId) : void applyEmoji(category.id, showId)} className={cn('min-h-8 rounded-full px-2.5 text-left text-[11px] font-black uppercase tracking-[0.1em] backdrop-blur-xl active:scale-95', on ? 'bg-white text-black' : 'bg-black/36 text-white/70 ring-1 ring-white/[0.08]')}>
              <span className="mr-1 text-sm leading-none">{category.emoji}</span>{category.label}
            </button>
          )
        })}
        {!creating && (
          <button onClick={() => setCreating(true)} className="grid h-8 min-w-8 place-items-center rounded-full bg-black/36 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/52 ring-1 ring-white/[0.08] active:scale-95">
            Vibe
          </button>
        )}
      </div>

      {creating && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-[18px] bg-black/52 p-2 backdrop-blur-xl ring-1 ring-white/[0.08]">
          <div className="mb-2 flex flex-wrap gap-1">
            {SUGGESTED_EMOJI.slice(0, 10).map((suggestion) => (
              <button key={suggestion} onClick={() => setEmoji(suggestion)} className={cn('h-8 w-8 rounded-full text-lg', emoji === suggestion ? 'bg-white text-black' : 'bg-white/[0.06]')}>
                {suggestion}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} placeholder="🥀" className="h-9 w-12 rounded-full bg-white/[0.06] px-2 text-center text-lg outline-none" />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-9 min-w-0 flex-1 rounded-full bg-white/[0.06] px-3 text-xs font-bold text-white outline-none placeholder:text-white/24" />
            <button disabled={!emoji.trim()} onClick={async () => {
              const category = await createEmojiCategory(emoji.trim(), label.trim() || undefined)
              await applyEmoji(category.id, showId)
              setCreating(false)
              setEmoji('')
              setLabel('')
            }} className="grid h-9 w-9 place-items-center rounded-full text-black disabled:opacity-40" style={{ background: accent }}>
              <Check size={14} strokeWidth={3} />
            </button>
            <button onClick={() => { setCreating(false); setEmoji(''); setLabel('') }} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-white/70">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
