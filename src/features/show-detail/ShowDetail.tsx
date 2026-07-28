import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Check, ChevronDown, ChevronLeft, Drama, EyeOff, ExternalLink, Play, Plus, Trash2, Trophy, Tv, X } from 'lucide-react'
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
  getCompanyShows,
  getSeason,
  getShowDetail,
  getShowImages,
  getShowVideos,
  getShowWatchProviders,
  getWatchRegion,
  hasTmdbKey,
  imgUrl,
  tmdbToLoot,
  type TmdbSearchResult,
  type TmdbVideoAsset,
  type TmdbCreator,
  type TmdbCrewMember,
  type TmdbProductionCompany,
  type TmdbWatchProvider,
  type WatchProviderResult,
} from '../../lib/tmdb'
import { selectAnimationStudios, selectCreators, type CreativeLead } from '../../lib/creative-credits'
import { getRarity, RARITIES } from '../../lib/rarity'
import { cn } from '../../lib/utils'
import { WatchlistShelfPicker } from '../watchlist/WatchlistShelfPicker'
import { ImdbBadge } from '../../components/ui/ImdbBadge'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { dominantColor } from '../../lib/dominantColor'

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']
const SUGGESTED_EMOJI = ['❤️', '🔥', '💀', '🥶', '😭', '🍔', '🥲', '🌹', '🥀', '👑', '🎯', '🤡', '🧠', '🎲', '🌶️', '⭐']
type LogoAsset = { file_path: string; vote_average?: number; iso_639_1?: string | null }
type SeasonInfo = { seasons: number; episodes: number }
type DetailInfo = { tagline: string; runtime: number | null; network: string | null; status: string | null }
type NextEpisodeInfo = { label: string; name: string; stillPath: string | null }
type TierDetailStyle = { color: string; soft: string; wash: string }
type DetailCastMember = {
  id: number
  name: string
  character: string
  profile_path: string | null
}
type StudioTitle = { show: Show; logoPath: string | null }

const TIER_DETAIL: Record<Tier, TierDetailStyle> = {
  S: { color: '#fb7185', soft: 'rgba(251,113,133,0.22)', wash: 'rgba(251,113,133,0.10)' },
  A: { color: '#fb923c', soft: 'rgba(251,146,60,0.20)', wash: 'rgba(251,146,60,0.10)' },
  B: { color: '#d9a92f', soft: 'rgba(217,169,47,0.20)', wash: 'rgba(217,169,47,0.10)' },
  C: { color: '#84cc16', soft: 'rgba(132,204,22,0.18)', wash: 'rgba(132,204,22,0.09)' },
  D: { color: '#38bdf8', soft: 'rgba(56,189,248,0.18)', wash: 'rgba(56,189,248,0.09)' },
}

const logoCache = new Map<number, string | null>()
const studioTitleCache = new Map<number, StudioTitle[]>()

function studioResultToShow(result: TmdbSearchResult): Show {
  const loot = tmdbToLoot({ ...result, mediaType: 'tv' })
  const now = Date.now()
  return {
    id: loot.id,
    name: loot.title,
    year: loot.year === '—' ? undefined : Number(loot.year),
    posterPath: loot.posterPath,
    backdropPath: loot.backdropPath,
    overview: loot.overview,
    genres: loot.rawGenres as Show['genres'],
    rawGenres: loot.rawGenres,
    mediaType: 'tv',
    tradition: loot.tradition,
    vibeIds: loot.vibeIds,
    vibeEvidence: loot.vibeEvidence,
    cardDescriptor: loot.cardDescriptor,
    addedAt: now,
    updatedAt: now,
  }
}

function readableArtworkAccent(hex: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!match) return '#f5c453'
  const rgb = match.slice(1).map((value) => Number.parseInt(value, 16))
  const luminance = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114
  const amount = luminance < 118 ? 0.42 : luminance < 150 ? 0.24 : 0.08
  const adjusted = rgb.map((value) => Math.round(value + (255 - value) * amount))
  return `#${adjusted.map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

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

function runtimeLabel(minutes: number | null) {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`
}

interface Props {
  show: Show
  recommendationContext?: RecommendationContext
  onBack: () => void
  onTrackEpisodes: (s: Show) => void
  onAssignRole: (s: Show, personId?: number) => void
  onOpenShow: (s: Show) => void
}

export function ShowDetail({ show, recommendationContext, onBack, onTrackEpisodes, onAssignRole, onOpenShow }: Props) {
  const reducedMotion = useReducedMotion()
  const mediaType = show.mediaType ?? 'tv'
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [episodeBulkBusy, setEpisodeBulkBusy] = useState<null | 'mark' | 'unmark'>(null)
  const [logoPath, setLogoPath] = useState<string | null>(() => logoCache.get(show.id) ?? null)
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null)
  const [showCast, setShowCast] = useState<DetailCastMember[]>([])
  const [detailCreators, setDetailCreators] = useState<TmdbCreator[]>([])
  const [showCrew, setShowCrew] = useState<TmdbCrewMember[]>([])
  const [animationStudios, setAnimationStudios] = useState<TmdbProductionCompany[]>([])
  const [studioTitles, setStudioTitles] = useState<StudioTitle[]>([])
  const [studioTitlesLoading, setStudioTitlesLoading] = useState(false)
  const [castLoading, setCastLoading] = useState(() => hasTmdbKey())
  const [detailInfo, setDetailInfo] = useState<DetailInfo>({ tagline: '', runtime: null, network: null, status: null })
  const [videos, setVideos] = useState<TmdbVideoAsset[]>([])
  const [selectedVideo, setSelectedVideo] = useState<TmdbVideoAsset | null>(null)
  const [artworkAccent, setArtworkAccent] = useState<string | null>(null)
  const [rankEditorOpen, setRankEditorOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const [watchlistOpen, setWatchlistOpen] = useState(false)
  const [watchProviders, setWatchProviders] = useState<WatchProviderResult | null>(null)
  const [openedAt] = useState(() => Date.now())
  const persistedShow = useDexieQuery<Show | undefined>(['shows'], () => db.shows.get(show.id), undefined, [show.id])
  const liveShow = persistedShow ?? show
  const owned = Boolean(persistedShow)
  const emojiCategories = useDexieQuery(['emojiCategories'], () => db.emojiCategories.toArray(), [], [])
  const tierAssignment = useDexieQuery(['tierAssignments'], () => db.tierAssignments.get(show.id), undefined, [show.id])
  const cast = useDexieQuery(['castRoles'], () => db.castRoles.where({ showId: show.id }).toArray(), [], [show.id])
  const nextEpisode = useDexieQuery<NextEpisodeInfo | null>(
    ['episodeProgress', 'seasonCache'],
    async () => {
      const [cachedSeasons, watchedRows] = await Promise.all([
        db.seasonCache.where({ showId: show.id }).sortBy('seasonNumber'),
        db.episodeProgress.where({ showId: show.id }).toArray(),
      ])
      const watched = new Set(watchedRows.filter((row) => row.watched).map((row) => `${row.seasonNumber}:${row.episodeNumber}`))
      for (const season of cachedSeasons) {
        const episode = season.episodes.find((candidate) => !watched.has(`${season.seasonNumber}:${candidate.episode_number}`))
        if (episode) return {
          label: `S${season.seasonNumber} E${episode.episode_number}`,
          name: episode.name,
          stillPath: episode.still_path ?? null,
        }
      }
      return null
    },
    null,
    [show.id],
  )
  const discoverFeedback = useDexieQuery(['discoverFeedback'], () => db.discoverFeedback.get(show.id), undefined, [show.id])
  const [progress, setProgress] = useState({ watched: 0, total: 0 })
  const [feedbackUndoVisible, setFeedbackUndoVisible] = useState(false)
  const creativeLead = useMemo(
    () => selectCreators(mediaType, detailCreators, showCrew),
    [detailCreators, mediaType, showCrew],
  )

  useEffect(() => {
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'auto' })
  }, [scrollEl])

  useEffect(() => {
    if (mediaType === 'movie') {
      return
    }
    progressForShow(show.id).then(setProgress)
  }, [show.id, mediaType, episodeBulkBusy])

  useEffect(() => {
    if (!hasTmdbKey()) {
      return
    }
    let cancelled = false
    getShowImages(show.id, mediaType)
      .then((images) => {
        const logo = bestLogo(images.logos)
        logoCache.set(show.id, logo)
        if (!cancelled) setLogoPath(logo)
      })
      .catch(() => {
        logoCache.set(show.id, null)
        if (!cancelled) setLogoPath(null)
      })

    getShowDetail(show.id, mediaType)
      .then((detail) => {
        if (cancelled) return
        setDetailInfo({
          tagline: detail.tagline ?? '',
          runtime: detail.runtime ?? null,
          network: detail.networks?.[0]?.name ?? null,
          status: detail.status ?? null,
        })
        setDetailCreators(detail.created_by ?? [])
        setAnimationStudios(selectAnimationStudios(detail.production_companies ?? []))
        if (mediaType === 'movie') {
          setSeasonInfo(null)
          return
        }
        const seasons = (detail.seasons ?? []).filter((season) => season.season_number !== 0)
        const episodes = seasons.reduce((sum, season) => sum + (season.episode_count ?? 0), 0)
        setSeasonInfo({ seasons: detail.number_of_seasons || seasons.length, episodes })
        void updateShowMetadata(show.id, {
          seasonCount: detail.number_of_seasons || seasons.length,
          episodeCount: detail.number_of_episodes || episodes,
          status: detail.status,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setSeasonInfo(null)
          setDetailInfo({ tagline: '', runtime: null, network: null, status: null })
          setDetailCreators([])
          setAnimationStudios([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [show.id, mediaType])

  useEffect(() => {
    const studio = animationStudios[0]
    if (!studio || mediaType !== 'tv' || !hasTmdbKey()) {
      setStudioTitles([])
      setStudioTitlesLoading(false)
      return
    }

    const cached = studioTitleCache.get(studio.id)
    if (cached) {
      setStudioTitles(cached.filter((title) => title.show.id !== show.id))
      setStudioTitlesLoading(false)
      return
    }

    let cancelled = false
    setStudioTitlesLoading(true)
    getCompanyShows(studio.id)
      .then((results) => results.slice(0, 13))
      .then((results) => Promise.all(results.map(async (result) => {
        let titleLogo = logoCache.get(result.id)
        if (titleLogo === undefined) {
          try {
            const images = await getShowImages(result.id, 'tv')
            titleLogo = bestLogo(images.logos)
          } catch {
            titleLogo = null
          }
          logoCache.set(result.id, titleLogo)
        }
        return { show: studioResultToShow(result), logoPath: titleLogo }
      })))
      .then((titles) => {
        studioTitleCache.set(studio.id, titles)
        if (!cancelled) setStudioTitles(titles.filter((title) => title.show.id !== show.id).slice(0, 12))
      })
      .catch(() => {
        if (!cancelled) setStudioTitles([])
      })
      .finally(() => {
        if (!cancelled) setStudioTitlesLoading(false)
      })

    return () => { cancelled = true }
  }, [animationStudios, mediaType, show.id])

  useEffect(() => {
    const art = liveShow.backdropPath || liveShow.posterPath
    if (!art) {
      return
    }
    let cancelled = false
    dominantColor(imgUrl(art, liveShow.backdropPath ? 'w500' : 'w342')).then((color) => {
      if (!cancelled) setArtworkAccent(readableArtworkAccent(color))
    })
    return () => { cancelled = true }
  }, [liveShow.backdropPath, liveShow.posterPath])

  useEffect(() => {
    if (!hasTmdbKey()) {
      return
    }
    let cancelled = false
    getShowVideos(show.id, mediaType)
      .then(({ results }) => {
        if (cancelled) return
        const youtube = results.filter((video) => video.site === 'YouTube')
        const priority = (video: TmdbVideoAsset) => {
          if (video.type === 'Trailer') return 0
          if (video.type === 'Clip') return 1
          if (video.type === 'Teaser') return 2
          if (video.type === 'Opening Credits') return 3
          if (video.type === 'Featurette') return 4
          return 5
        }
        setVideos([...youtube].sort((a, b) => priority(a) - priority(b)).slice(0, 8))
      })
      .catch(() => { if (!cancelled) setVideos([]) })
    return () => { cancelled = true }
  }, [show.id, mediaType])

  useEffect(() => {
    if (!hasTmdbKey()) {
      return
    }
    let cancelled = false
    getShowWatchProviders(show.id, getWatchRegion(), mediaType)
      .then((providers) => {
        if (!cancelled) setWatchProviders(providers)
      })
      .catch(() => {
        if (!cancelled) setWatchProviders(null)
      })
    return () => {
      cancelled = true
    }
  }, [show.id, mediaType])

  useEffect(() => {
    if (!hasTmdbKey()) {
      return
    }

    let cancelled = false
    getCredits(show.id, mediaType)
      .then((credits) => {
        if (cancelled) return
        const withImages = credits.cast.filter((member) => member.profile_path)
        const withoutImages = credits.cast.filter((member) => !member.profile_path)
        setShowCast([...withImages, ...withoutImages].slice(0, 14))
        setShowCrew(credits.crew ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setShowCast([])
          setShowCrew([])
        }
      })
      .finally(() => {
        if (!cancelled) setCastLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [show.id, mediaType])

  const tier = tierAssignment?.tier ?? null
  const isTop8 = typeof liveShow.top8Position === 'number' && liveShow.top8Position >= 0
  const rarity = getRarity(liveShow, tier, isTop8)
  const r = RARITIES[rarity]
  const fallbackAccent = tier ? TIER_DETAIL[tier].color : r.hex
  const accent = artworkAccent ?? fallbackAccent
  const showEmojis = useMemo(() => emojiCategories.filter((c) => c.showIds.includes(show.id)), [emojiCategories, show.id])
  const heroFacts = [
    liveShow.year,
    mediaType === 'movie' ? runtimeLabel(detailInfo.runtime) ?? 'Film' : seasonLabel(seasonInfo, progress),
  ].filter((item): item is string | number => item !== null && item !== undefined && item !== '')
  const fullyWatched = progress.total > 0 && progress.watched >= progress.total
  const primaryAction = !owned
    ? { label: 'Collection', icon: Plus, onClick: () => void handleAddToCollection() }
    : mediaType === 'tv' && !fullyWatched
      ? {
          label: progress.watched > 0 ? `Continue${nextEpisode ? ` · ${nextEpisode.label}` : ''}` : 'Start watching',
          icon: Tv,
          onClick: () => onTrackEpisodes(liveShow),
        }
      : null
  const trailer = videos.find((video) => video.type === 'Trailer') ?? videos[0] ?? null
  const resolvedPrimary = primaryAction ?? (trailer ? { label: 'Play trailer', icon: Play, onClick: () => setSelectedVideo(trailer) } : null)
  const ResolvedPrimaryIcon = resolvedPrimary?.icon
  const providerName = watchProviders
    ? uniqueProviders([watchProviders.flatrate, watchProviders.free, watchProviders.ads, watchProviders.rent, watchProviders.buy])[0]?.provider_name ?? null
    : null
  const factItems = mediaType === 'tv'
    ? [
        { value: seasonInfo?.seasons ? `${seasonInfo.seasons}` : '—', label: seasonInfo?.seasons === 1 ? 'season' : 'seasons' },
        { value: seasonInfo?.episodes ? `${seasonInfo.episodes}` : progress.total ? `${progress.total}` : '—', label: 'episodes' },
        { value: providerName ?? detailInfo.status?.replace(' Series', '') ?? 'TV', label: providerName ? 'streaming' : 'status' },
      ]
    : [
        { value: runtimeLabel(detailInfo.runtime) ?? 'Film', label: 'runtime' },
        { value: liveShow.rawGenres?.find((genre) => genre !== 'Animation') ?? liveShow.genres[0] ?? 'Movie', label: 'genre' },
        { value: providerName ?? detailInfo.status ?? 'Released', label: providerName ? 'streaming' : 'status' },
      ]
  const progressPercent = progress.total > 0 ? Math.min(100, Math.round((progress.watched / progress.total) * 100)) : 0
  const discoverIsHidden = Boolean(discoverFeedback?.hiddenUntil && discoverFeedback.hiddenUntil > openedAt)

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
    if (mediaType === 'movie') return
    const detail = await getShowDetail(show.id, 'tv')
    const cached = await db.seasonCache.where({ showId: show.id }).toArray()
    const cachedSet = new Set(cached.map((s) => s.seasonNumber))
    for (const season of detail.seasons ?? []) {
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
    if (!owned) return
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
    <motion.div
      ref={setScrollEl}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, scale: 0.98, y: 8 }}
      transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[45] origin-center overflow-y-auto overscroll-contain bg-[#030406] pb-24 text-white"
      style={{ backgroundImage: `radial-gradient(circle at 50% 8%, ${accent}1f, transparent 32rem)` }}
    >
      <div className="mx-auto min-h-full w-full max-w-md overflow-hidden bg-[#06080a] shadow-[0_0_80px_rgba(0,0,0,0.72)]">
        <section className="relative flex min-h-[clamp(520px,70svh,620px)] items-end overflow-hidden px-5 pb-7">
          {liveShow.backdropPath || liveShow.posterPath ? (
            <img
              src={imgUrl(liveShow.backdropPath || liveShow.posterPath, liveShow.backdropPath ? 'original' : 'w500')}
              alt=""
              className={cn('absolute inset-0 h-full w-full opacity-[0.9]', liveShow.backdropPath ? 'object-cover' : 'object-cover object-top')}
              aria-hidden
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-[#06080a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/52 via-black/5 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#06080a] via-[#06080a]/80 to-transparent" />
          <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 82% 18%, ${accent}2b, transparent 18rem)` }} />

          <header className="absolute inset-x-0 top-0 z-20 flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full bg-black/38 text-white/88 backdrop-blur-xl ring-1 ring-white/[0.12] active:scale-95" aria-label="Back">
              <ChevronLeft size={22} />
            </button>
            <ImdbBadge showId={show.id} className="ml-auto" />
          </header>

          <div className="relative z-10 w-full">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/62">
              {detailInfo.network ?? (mediaType === 'movie' ? 'Feature film' : 'Television series')}
            </p>
            {logoPath ? (
              <img src={imgUrl(logoPath, 'w500')} alt={liveShow.name} className="max-h-[92px] max-w-[78%] object-contain object-left drop-shadow-[0_14px_30px_rgba(0,0,0,0.96)]" />
            ) : (
              <h1 className="max-w-[350px] text-[43px] font-black leading-[0.9] tracking-[-0.075em] text-balance drop-shadow-[0_14px_30px_rgba(0,0,0,0.95)]">{liveShow.name}</h1>
            )}
            {detailInfo.tagline && <p className="mt-3 max-w-[340px] text-[14px] font-medium leading-[1.45] text-white/68">{detailInfo.tagline}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-semibold text-white/68">
              {heroFacts.map((item, index) => (
                <span key={item} className="inline-flex items-center gap-3">
                  {index > 0 && <span className="h-1 w-1 rounded-full bg-white/28" aria-hidden />}
                  {item}
                </span>
              ))}
              {detailInfo.status && <span className="rounded-full border border-white/[0.12] bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.06em] text-white/58">{detailInfo.status.replace(' Series', '')}</span>}
            </div>

            <div className="mt-6 flex items-center gap-2">
              {resolvedPrimary ? (
                <button
                  onClick={resolvedPrimary.onClick}
                  className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] px-4 text-[14px] font-bold text-black shadow-[0_14px_32px_rgba(0,0,0,0.3)] active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 76%, white), ${accent})`, boxShadow: `0 14px 34px ${accent}2d` }}
                >
                  {ResolvedPrimaryIcon && <ResolvedPrimaryIcon size={18} strokeWidth={3} />}
                  <span className="truncate">{resolvedPrimary.label}</span>
                </button>
              ) : (
                <div className="flex h-12 flex-1 items-center justify-center rounded-[14px] border border-white/[0.1] bg-white/[0.04] text-[14px] font-bold text-white/58">In collection</div>
              )}
              {trailer && resolvedPrimary?.label !== 'Play trailer' && (
                <button onClick={() => setSelectedVideo(trailer)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/[0.14] bg-black/34 text-white backdrop-blur-xl active:scale-95" aria-label="Play trailer">
                  <Play size={17} fill="currentColor" />
                </button>
              )}
              <button onClick={() => setWatchlistOpen(true)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/[0.14] bg-black/34 text-white/82 backdrop-blur-xl active:scale-95" aria-label="Add to watchlist">
                <Bookmark size={18} />
              </button>
              <motion.button
                key={tier ?? 'rank'}
                onClick={() => setRankEditorOpen((open) => !open)}
                className="grid h-12 min-w-12 shrink-0 place-items-center rounded-full border bg-black/34 px-2 text-[14px] font-black uppercase backdrop-blur-xl active:scale-95"
                style={{ color: tier ? TIER_DETAIL[tier].color : 'rgba(255,255,255,.82)', borderColor: tier ? `${TIER_DETAIL[tier].color}72` : 'rgba(255,255,255,.14)' }}
                aria-label={tier ? `Change ${tier} rank` : 'Rank this title'}
              >
                {tier ?? <Trophy size={18} />}
              </motion.button>
            </div>

            <AnimatePresence>
              {rankEditorOpen && (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -3, scale: 0.98 }}
                  transition={{ duration: reducedMotion ? 0 : 0.18 }}
                  className="mt-2 flex origin-top-right justify-end"
                >
                  <InlineRank tier={tier} onTier={handleTier} />
                </motion.div>
              )}
            </AnimatePresence>

            {mediaType === 'tv' && progress.total > 0 && progress.watched > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-semibold text-white/48">
                  <span>{progress.watched} of {progress.total} watched</span>
                  <span style={{ color: accent }}>{progressPercent}%</span>
                </div>
                <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.12]">
                  <motion.div className="h-full rounded-full" animate={{ width: `${progressPercent}%` }} style={{ background: `linear-gradient(90deg, ${accent}, white)` }} />
                </div>
              </div>
            )}
          </div>
        </section>

        <main className="relative z-20 px-5 pb-7">
          {recommendationContext && (
            <p className="mb-3 text-[12px] font-medium text-white/42">
              Because you liked <span className="text-white/68">{recommendationContext.anchorName}</span>
            </p>
          )}
          {liveShow.overview && (
            <section>
              <p className={cn('text-[17px] font-semibold leading-[1.55] text-white/78', !storyOpen && 'line-clamp-4')}>{liveShow.overview}</p>
              {liveShow.overview.length > 180 && (
                <button onClick={() => setStoryOpen((value) => !value)} className="mt-2 min-h-8 text-[13px] font-semibold text-white/48 active:scale-95">{storyOpen ? 'Less' : 'More'}</button>
              )}
            </section>
          )}

          {!owned && (
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => discoverIsHidden ? void restoreToDiscover() : void hideFromDiscover()}
                className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-semibold text-white/38 hover:text-white/68 active:scale-95"
              >
                <EyeOff size={12} />
                {discoverIsHidden ? 'Show again' : 'Not interested'}
              </button>
            </div>
          )}

          {mediaType === 'movie' && (
            <div className="mt-4 grid grid-cols-3 border-y border-white/[0.08]">
              {factItems.map((fact, index) => (
                <div key={`${fact.label}-${fact.value}`} className={cn('min-w-0 py-4', index > 0 && 'border-l border-white/[0.08] pl-3', index < 2 && 'pr-2')}>
                  <p className="line-clamp-2 text-[15px] font-bold leading-[1.25] text-white/86">{fact.value}</p>
                  <p className="mt-1 text-[11px] font-medium text-white/42">{fact.label}</p>
                </div>
              ))}
            </div>
          )}

          <VideoSection videos={videos} onSelect={setSelectedVideo} accent={accent} />

          {watchProviders && <WhereToWatch providers={watchProviders} region={getWatchRegion()} />}

          {mediaType === 'tv' && owned && <TrackingSection
            show={liveShow}
            progress={progress}
            nextEpisode={nextEpisode}
            busy={episodeBulkBusy}
            onOpen={() => onTrackEpisodes(liveShow)}
            onBulk={handleEpisodeBulk}
            accent={accent}
          />}

          <MadeBySection
            creativeLead={creativeLead}
            studios={animationStudios}
            studioTitles={studioTitles}
            studioTitlesLoading={studioTitlesLoading}
            accent={accent}
            onOpenShow={onOpenShow}
          />

          <CastSection
            assigned={cast}
            members={showCast}
            loading={castLoading}
            onCast={async () => { if (!owned) await handleAddToCollection(); onAssignRole(liveShow) }}
            onCastPerson={async (personId) => { if (!owned) await handleAddToCollection(); onAssignRole(liveShow, personId) }}
            accent={accent}
          />

          <div className="mt-7">
            <VibeRail showId={show.id} applied={showEmojis} accent={accent} />
          </div>

          {owned && (
            <div className="mt-9 flex justify-center border-t border-white/[0.06] pt-5">
              <button onClick={handleDelete} className="inline-flex min-h-10 items-center gap-1.5 text-[12px] font-semibold text-white/28 hover:text-rose-300 active:scale-95"><Trash2 size={14} />Remove from collection</button>
            </div>
          )}
        </main>
      </div>

      <WatchlistShelfPicker open={watchlistOpen} show={liveShow} onClose={() => setWatchlistOpen(false)} />
      <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      {feedbackUndoVisible && (
        <div className="fixed inset-x-4 bottom-24 z-[70] mx-auto flex h-14 max-w-sm items-center justify-between rounded-[20px] bg-[#17141b]/96 px-4 text-[14px] font-bold text-white shadow-[0_22px_54px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.1] backdrop-blur-2xl">
          <span>Hidden from Discover</span>
          <button onClick={() => void restoreToDiscover()} className="h-10 rounded-full bg-white px-4 text-[12px] font-semibold text-black active:scale-95">Undo</button>
        </div>
      )}
    </motion.div>
  )
}

function MadeBySection({
  creativeLead,
  studios,
  studioTitles,
  studioTitlesLoading,
  accent,
  onOpenShow,
}: {
  creativeLead: CreativeLead
  studios: TmdbProductionCompany[]
  studioTitles: StudioTitle[]
  studioTitlesLoading: boolean
  accent: string
  onOpenShow: (show: Show) => void
}) {
  const hasCreator = creativeLead.people.length > 0
  const hasStudio = studios.length > 0
  if (!hasCreator && !hasStudio) return null

  const creator = creativeLead.people[0]
  const studio = studios[0]

  return (
    <section className="mt-5">
      <h2 className="mb-4 text-[18px] font-bold tracking-[-0.02em] text-white/88">Made by</h2>
      <div className="space-y-4">
        {hasCreator && (
          <div className="flex min-w-0 items-center gap-3">
            {creator.profile_path ? (
              <img src={imgUrl(creator.profile_path, 'w185')} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/[0.12]" />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[12px] font-black text-white/68 ring-1 ring-white/[0.09]">
                {creator.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: accent }}>{creativeLead.label}</p>
              <p className="mt-1 text-[15px] font-semibold leading-[1.35] text-white/84">
                {creativeLead.people.map((person) => person.name).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {hasStudio && (
          <div>
            <div className="flex min-w-0 items-center gap-3">
              {studio.logo_path ? (
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white/90 p-1.5">
                  <img src={imgUrl(studio.logo_path, 'w185')} alt="" className="max-h-full max-w-full object-contain" />
                </span>
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-white/[0.07] text-[11px] font-black text-white/68 ring-1 ring-white/[0.09]">
                  {studio.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold" style={{ color: accent }}>
                  {studios.length > 1 ? 'Animation studios' : 'Animation studio'}
                </p>
                <p className="mt-1 text-[15px] font-semibold leading-[1.35] text-white/84">
                  {studios.map((company) => company.name).join(' · ')}
                </p>
              </div>
            </div>

            {(studioTitlesLoading || studioTitles.length > 0) && (
              <div className="-mr-5 mt-4 flex gap-2.5 overflow-x-auto pb-1 pr-5 no-scrollbar">
                  {studioTitlesLoading
                    ? [0, 1, 2].map((item) => <span key={item} className="h-[72px] w-[122px] shrink-0 animate-pulse rounded-[14px] bg-white/[0.055]" />)
                    : studioTitles.map((title) => (
                      <button
                        key={title.show.id}
                        onClick={() => onOpenShow(title.show)}
                        className="group relative h-[76px] w-[132px] shrink-0 overflow-hidden rounded-[14px] bg-[#111419] text-center text-[12px] font-semibold leading-[1.15] text-white shadow-[0_9px_24px_rgba(0,0,0,.3)] ring-1 ring-white/[0.11] active:scale-[0.97]"
                        aria-label={`Open ${title.show.name}`}
                      >
                        {(title.show.backdropPath || title.show.posterPath) && (
                          <img
                            src={imgUrl(title.show.backdropPath || title.show.posterPath, 'w342')}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.05]"
                            loading="lazy"
                          />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/35 to-black/18" />
                        <span className="relative z-10 grid h-full w-full place-items-center p-3">
                          {title.logoPath ? (
                            <img
                              src={imgUrl(title.logoPath, 'w342')}
                              alt={title.show.name}
                              className="max-h-full max-w-full object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,.95)] transition-transform duration-300 group-hover:scale-[1.04]"
                              loading="lazy"
                            />
                          ) : (
                            <span className="line-clamp-3 drop-shadow-[0_2px_4px_rgba(0,0,0,.9)]">{title.show.name}</span>
                          )}
                        </span>
                      </button>
                    ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
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
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white/[0.08] text-[12px] font-black">
          {provider.provider_name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="truncate text-[14px] font-bold text-white/76">{provider.provider_name}</span>
    </span>
  )
}

function ProviderIcon({ provider }: { provider: TmdbWatchProvider }) {
  return provider.logo_path ? (
    <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-[8px] bg-white/[0.06]" title={provider.provider_name} aria-label={provider.provider_name}>
      <img src={imgUrl(provider.logo_path, 'w185')} alt="" className="h-full w-full object-cover" />
    </span>
  ) : (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-white/[0.08] text-[11px] font-black text-white/68" title={provider.provider_name} aria-label={provider.provider_name}>
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
    <section className="mt-5 border-y border-white/[0.07] py-4">
      <div className="flex min-h-10 items-center gap-3">
        <div>
          <h2 className="whitespace-nowrap text-[17px] font-bold tracking-[-0.02em] text-white/88">Where to watch</h2>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/42">{region}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {primary.slice(0, 3).map((provider) => <ProviderIcon key={provider.provider_id} provider={provider} />)}
          {hiddenCount > 0 && (
            <span className="grid h-9 min-w-9 place-items-center rounded-[9px] bg-white/[0.06] px-1 text-[12px] font-black text-white/52">+{hiddenCount}</span>
          )}
        </div>
        {providers.link && (
          <a href={providers.link} target="_blank" rel="noreferrer" className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/[0.06] text-white/52 active:scale-95" aria-label="Open streaming options">
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      {hasMore && (
        <details className="group mt-2">
          <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-[12px] font-semibold text-white/44 active:text-white/68">
            More options
            <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-4">
            {streaming.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold text-white/42">Stream</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {streaming.slice(0, 6).map((provider) => <ProviderLogo key={provider.provider_id} provider={provider} />)}
                </div>
              </div>
            )}
            {transactional.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold text-white/42">Rent or buy</p>
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
      <p className="mb-2 px-1 text-[12px] font-semibold text-white/48">Your rank</p>
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
                background: active ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.02)',
                borderColor: active ? `${style.color}aa` : `${style.color}38`,
                boxShadow: active ? `inset 0 0 0 1px ${style.color}24` : undefined,
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

function VideoSection({ videos, onSelect, accent }: { videos: TmdbVideoAsset[]; onSelect: (video: TmdbVideoAsset) => void; accent: string }) {
  if (!videos.length) return null
  const singleVideo = videos.length === 1
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-[20px] font-bold tracking-[-0.025em] text-white/92">Trailers & clips</h2>
      <div className={cn('flex gap-2.5 pb-1', !singleVideo && '-mr-4 overflow-x-auto pr-4 no-scrollbar')}>
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => onSelect(video)}
            className={cn(
              'group relative overflow-hidden rounded-[14px] bg-black text-left ring-1 ring-white/[0.1] active:scale-[0.98]',
              singleVideo ? 'aspect-video w-full' : 'aspect-[16/10] w-[178px] shrink-0',
            )}
          >
            <img src={`https://i.ytimg.com/vi/${video.key}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-90" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/10 to-black/10" />
            <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-black shadow-lg" style={{ background: accent }}><Play size={10} fill="currentColor" /></span>
            <span className="absolute inset-x-0 bottom-0 p-2.5">
              <span className="line-clamp-2 block text-[13px] font-semibold leading-[1.3] text-white/88">{video.name}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function VideoModal({ video, onClose }: { video: TmdbVideoAsset | null; onClose: () => void }) {
  useEffect(() => {
    if (!video) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [video, onClose])

  return (
    <AnimatePresence>
      {video && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/88 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={video.name}
          onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
        >
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full max-w-3xl overflow-hidden rounded-[22px] bg-[#090b0d] shadow-[0_28px_100px_rgba(0,0,0,.72)] ring-1 ring-white/[0.12]">
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0`}
                title={video.name}
                className="h-full w-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="min-w-0 truncate text-[15px] font-semibold text-white/88">{video.name}</p>
              <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/72 ring-1 ring-white/[0.1] active:scale-95" aria-label="Close video"><X size={15} /></button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
        <div className="flex items-center gap-2 text-[18px] font-bold tracking-[-0.02em] text-white/82">
          <Drama size={17} /> Cast
        </div>
        <button onClick={onCast} className="h-11 rounded-full border border-white/[0.1] bg-transparent px-4 text-[12px] font-semibold text-white/72 active:scale-95">
          Assign roles
        </button>
      </div>

      {hasAssigned && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {assigned.slice(0, 5).map((role) => (
            <button key={role.id} onClick={onCast} className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.07] py-1 pl-1 pr-3 text-left ring-1 ring-white/[0.06] active:scale-95">
              {role.profilePath ? (
                <img src={imgUrl(role.profilePath, 'w185')} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] text-[12px] font-black text-white/52">{role.characterName.slice(0, 2).toUpperCase()}</span>
              )}
              <span>
                <span className="block text-[11px] font-semibold" style={{ color: accent }}>{role.roleName}</span>
                <span className="mt-0.5 block max-w-[118px] truncate text-[13px] font-semibold leading-none text-white/84">{role.characterName}</span>
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
                  className={cn(
                    'absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full font-black backdrop-blur-md transition-all',
                    assignedRole ? 'bg-white/88 text-black' : 'bg-black/46 text-white/38 ring-1 ring-white/[0.12] group-hover:bg-white/88 group-hover:text-black group-focus-visible:bg-white/88 group-focus-visible:text-black',
                  )}
                >
                  {assignedRole ? <Check size={16} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  {assignedRole && <p className="mb-1 text-[11px] font-semibold" style={{ color: accent }}>{assignedRole.roleName}</p>}
                  <p className="line-clamp-2 text-[15px] font-bold leading-[1.1] tracking-[-0.025em] text-white">{member.character || member.name}</p>
                  <p className="mt-1 truncate text-[11px] font-bold text-white/52">{member.name}</p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <button onClick={onCast} className="flex min-h-[94px] w-full items-center justify-between rounded-[28px] bg-white/[0.045] px-4 text-left ring-1 ring-white/[0.06] active:scale-[0.99]">
          <span>
            <span className="block text-[18px] font-bold tracking-[-0.025em] text-white/88">Cast info unavailable</span>
            <span className="mt-1 block text-[14px] font-bold text-white/52">Add a role manually</span>
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/52">
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
  nextEpisode,
  busy,
  onOpen,
  onBulk,
  accent,
}: {
  show: Show
  progress: { watched: number; total: number }
  nextEpisode: NextEpisodeInfo | null
  busy: null | 'mark' | 'unmark'
  onOpen: () => void
  onBulk: (watchAll: boolean) => void
  accent: string
}) {
  const complete = progress.total > 0 && progress.watched >= progress.total
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-[20px] font-bold tracking-[-0.025em] text-white/92">Episodes</h2>
      <button onClick={onOpen} className="group relative w-full overflow-hidden rounded-[16px] bg-[#101418] text-left ring-1 ring-white/[0.09] active:scale-[0.99]">
        {nextEpisode?.stillPath ? <img src={imgUrl(nextEpisode.stillPath, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-[1.02]" loading="lazy" /> : show.backdropPath ? <img src={imgUrl(show.backdropPath, 'w500')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" loading="lazy" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/72 to-black/28" />
        <div className="relative flex min-h-[112px] items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            {nextEpisode && <p className="text-[11px] font-semibold" style={{ color: accent }}>{nextEpisode.label}</p>}
            <p className={cn('truncate text-[18px] font-bold tracking-[-0.025em] text-white', nextEpisode && 'mt-1')}>{nextEpisode?.name ?? (complete ? 'All episodes watched' : 'Choose your first episode')}</p>
            {progress.total > 0 && !complete && <p className="mt-1.5 text-[12px] font-semibold text-white/52">{progress.watched} of {progress.total} watched</p>}
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-black shadow-lg" style={{ background: accent }}>{complete ? <Check size={16} strokeWidth={3} /> : <Play size={13} fill="currentColor" />}</span>
        </div>
      </button>
      <button onClick={() => onBulk(!complete)} disabled={busy !== null} className="mt-2 h-11 w-full rounded-[14px] border bg-transparent text-[13px] font-semibold disabled:opacity-50 active:scale-[0.98]" style={{ color: accent, borderColor: `${accent}4d` }}>{busy ? 'Saving' : complete ? 'Unmark all' : 'Mark all watched'}</button>
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
            <button key={category.id} onClick={() => on ? void removeEmoji(category.id, showId) : void applyEmoji(category.id, showId)} className={cn('min-h-10 rounded-full border px-3 text-left text-[13px] font-semibold backdrop-blur-xl active:scale-95', on ? 'border-white/24 bg-white/[0.08] text-white/82' : 'border-white/[0.08] bg-black/24 text-white/64')}>
              <span className="mr-1 text-sm leading-none">{category.emoji}</span>{category.label}
            </button>
          )
        })}
        {!creating && (
          <button onClick={() => setCreating(true)} className="grid h-10 min-w-10 place-items-center rounded-full bg-black/36 px-3 text-[12px] font-semibold text-white/62 ring-1 ring-white/[0.08] active:scale-95">
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
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-10 min-w-0 flex-1 rounded-full bg-white/[0.06] px-3 text-sm font-bold text-white outline-none placeholder:text-white/32" />
            <button disabled={!emoji.trim()} onClick={async () => {
              const category = await createEmojiCategory(emoji.trim(), label.trim() || undefined)
              await applyEmoji(category.id, showId)
              setCreating(false)
              setEmoji('')
              setLabel('')
            }} className="grid h-9 w-9 place-items-center rounded-full border bg-transparent disabled:opacity-40" style={{ color: accent, borderColor: `${accent}66` }}>
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
