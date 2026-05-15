import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { Check, Clapperboard, Plus, Play, RefreshCw, Shield, Star, Zap } from 'lucide-react'
import {
  getAggregateCredits,
  getSimilarShows,
  getShowDetail,
  getShowImages,
  getShowKeywords,
  getShowRecommendations,
  getShowVideos,
  hasTmdbKey,
  imgUrl,
  searchShows,
  type TmdbAggregateCastMember,
  type TmdbImageAsset,
  type TmdbVideoAsset,
} from '../../lib/tmdb'
import { cn } from '../../lib/utils'

type LabShow = {
  id: number
  title: string
  year: string
  tagline: string
  overview: string
  genre: string
  rating: number
  posterPath: string | null
  backdropPath: string | null
  logoPath: string | null
  keywords: string[]
  trailer: TmdbVideoAsset | null
  cast: TmdbAggregateCastMember[]
}

const FALLBACK_SHOWS: LabShow[] = [
  {
    id: 40075,
    title: 'Gravity Falls',
    year: '2012',
    tagline: 'Just west of weird.',
    overview: 'Twin siblings spend the summer in a strange town full of mystery, monsters, and weird family secrets.',
    genre: 'Mystery',
    rating: 8.6,
    posterPath: null,
    backdropPath: null,
    logoPath: null,
    keywords: ['mystery', 'siblings', 'summer', 'supernatural'],
    trailer: null,
    cast: [],
  },
  {
    id: 15260,
    title: 'Adventure Time',
    year: '2010',
    tagline: '',
    overview: 'A boy and his best friend travel through a wild magical world full of quests, jokes, and emotional surprises.',
    genre: 'Animation',
    rating: 8.5,
    posterPath: null,
    backdropPath: null,
    logoPath: null,
    keywords: ['adventure', 'friendship', 'magic', 'quest'],
    trailer: null,
    cast: [],
  },
  {
    id: 37854,
    title: 'One Piece',
    year: '1999',
    tagline: '',
    overview: 'A pirate crew chases impossible dreams across a giant world full of powers, rival crews, and found family energy.',
    genre: 'Adventure',
    rating: 8.7,
    posterPath: null,
    backdropPath: null,
    logoPath: null,
    keywords: ['pirates', 'crew', 'found family', 'quest'],
    trailer: null,
    cast: [],
  },
]

function bestImage(items: TmdbImageAsset[] = []) {
  return [...items].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]?.file_path ?? null
}

function bestTrailer(items: TmdbVideoAsset[] = []) {
  return (
    items.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
    items.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ??
    null
  )
}

function youtubeUrl(video: TmdbVideoAsset | null) {
  return video ? `https://www.youtube.com/watch?v=${video.key}` : '#'
}

function shortOverview(text: string) {
  const firstSentence = text.match(/^[^.!?]+[.!?]/)?.[0]?.trim()
  const base = firstSentence && firstSentence.length >= 42 ? firstSentence : text
  return base.length > 118 ? `${base.slice(0, 115).trim()}...` : base
}

async function enrichShow(query: string): Promise<LabShow | null> {
  const [raw] = await searchShows(query)
  if (!raw) return null

  const [detail, images, videos, keywords, credits] = await Promise.all([
    getShowDetail(raw.id),
    getShowImages(raw.id),
    getShowVideos(raw.id),
    getShowKeywords(raw.id),
    getAggregateCredits(raw.id),
  ])

  return {
    id: raw.id,
    title: detail.name ?? raw.name,
    year: detail.first_air_date?.slice(0, 4) ?? raw.first_air_date?.slice(0, 4) ?? '----',
    tagline: detail.tagline?.trim() ?? '',
    overview: shortOverview(detail.overview ?? raw.overview ?? ''),
    genre: raw.genre_ids?.length ? 'TMDB signal' : 'Show',
    rating: detail.vote_average ?? raw.vote_average ?? 0,
    posterPath: detail.poster_path ?? raw.poster_path ?? null,
    backdropPath: bestImage(images.backdrops) ?? detail.backdrop_path ?? raw.backdrop_path ?? null,
    logoPath: bestImage(images.logos),
    keywords: (keywords.results ?? []).slice(0, 5).map((k) => k.name),
    trailer: bestTrailer(videos.results ?? []),
    cast: (credits.cast ?? []).filter((c) => c.profile_path).slice(0, 6),
  }
}

async function enrichRawShow(raw: { id: number; name: string; first_air_date?: string; overview?: string; poster_path?: string | null; backdrop_path?: string | null; vote_average?: number; genre_ids?: number[] }): Promise<LabShow | null> {
  try {
    const [detail, images, videos, keywords, credits] = await Promise.all([
      getShowDetail(raw.id),
      getShowImages(raw.id),
      getShowVideos(raw.id),
      getShowKeywords(raw.id),
      getAggregateCredits(raw.id),
    ])

    return {
      id: raw.id,
      title: detail.name ?? raw.name,
      year: detail.first_air_date?.slice(0, 4) ?? raw.first_air_date?.slice(0, 4) ?? '----',
      tagline: detail.tagline?.trim() ?? '',
      overview: shortOverview(detail.overview ?? raw.overview ?? ''),
      genre: raw.genre_ids?.length ? 'TMDB signal' : 'Show',
      rating: detail.vote_average ?? raw.vote_average ?? 0,
      posterPath: detail.poster_path ?? raw.poster_path ?? null,
      backdropPath: bestImage(images.backdrops) ?? detail.backdrop_path ?? raw.backdrop_path ?? null,
      logoPath: bestImage(images.logos),
      keywords: (keywords.results ?? []).slice(0, 5).map((k) => k.name),
      trailer: bestTrailer(videos.results ?? []),
      cast: (credits.cast ?? []).filter((c) => c.profile_path).slice(0, 6),
    }
  } catch {
    return null
  }
}

export function WowLab() {
  const [shows, setShows] = useState<LabShow[]>(FALLBACK_SHOWS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const keyOk = hasTmdbKey()

  const load = async () => {
    if (!keyOk || loading) return
    setLoading(true)
    setError(null)
    try {
      const enriched = await Promise.all([
        enrichShow('Gravity Falls'),
        enrichShow('Adventure Time'),
        enrichShow('One Piece'),
      ])
      const next = enriched.filter((x): x is LabShow => Boolean(x))
      if (next.length) setShows(next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOk])

  const featured = shows[0]
  const trailerShow = shows[1] ?? featured
  const roleShow = shows[2] ?? featured
  const roles = useMemo(() => roleShow.cast.slice(0, 3), [roleShow])

  return (
    <div className="min-h-svh bg-[#09090c] text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4ade80]">
              First 15 Seconds Lab
            </p>
            <h1 className="mt-1 text-2xl font-black leading-none tracking-normal">
              Artifact cards, trailer peek, character skins
            </h1>
          </div>
          <button
            onClick={() => void load()}
            disabled={!keyOk || loading}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/8 text-white disabled:opacity-40"
            title={keyOk ? 'Reload TMDB assets' : 'Add a TMDB key in Settings first'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p>}

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <ArtifactCard show={featured} />
          <TrailerPeek show={trailerShow} />
        </div>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/80">Character-skin role cards</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              Aggregate credits prototype
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {roles.length ? (
              roles.map((cast, index) => (
                <RoleSkinCard key={cast.id} show={roleShow} cast={cast} index={index} />
              ))
            ) : (
              FALLBACK_SHOWS.map((show, index) => (
                <FallbackRoleCard key={show.id} show={show} index={index} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export function WowVariantsLab() {
  const [shows, setShows] = useState<LabShow[]>(FALLBACK_SHOWS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const keyOk = hasTmdbKey()

  const load = async () => {
    if (!keyOk || loading) return
    setLoading(true)
    setError(null)
    try {
      const enriched = await Promise.all([
        enrichShow('Gravity Falls'),
        enrichShow('Adventure Time'),
        enrichShow('One Piece'),
      ])
      const next = enriched.filter((x): x is LabShow => Boolean(x))
      if (next.length) setShows(next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOk])

  const [artifact, trailerShow, roleShow] = shows
  const roles = roleShow.cast.slice(0, 4)

  return (
    <div className="min-h-svh bg-[#08080b] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4ade80]">
              Lab Variants
            </p>
            <h1 className="mt-1 text-2xl font-black leading-none tracking-normal">
              Alternate artifact, trailer, and role-card directions
            </h1>
          </div>
          <button
            onClick={() => void load()}
            disabled={!keyOk || loading}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/8 text-white disabled:opacity-40"
            title={keyOk ? 'Reload TMDB assets' : 'Add a TMDB key in Settings first'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p>}

        <section className="grid gap-4 lg:grid-cols-3">
          <ArtifactCompact show={artifact} />
          <ArtifactLandscape show={artifact} />
          <TrailerPosterPeek show={trailerShow} />
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/80">Role card alternatives</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              No rarity, no actor-card fantasy
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <RolePosterSheet show={roleShow} />
            <RoleSquadPanel show={roleShow} roles={roles} />
            <RoleStillCard show={roleShow} roles={roles} />
          </div>
        </section>
      </div>
    </div>
  )
}

export function DiscoveryPreviewLab() {
  const [shows, setShows] = useState<LabShow[]>(FALLBACK_SHOWS)
  const [pack, setPack] = useState<LabShow[]>(FALLBACK_SHOWS)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const keyOk = hasTmdbKey()

  const load = async () => {
    if (!keyOk || loading) return
    setLoading(true)
    setError(null)
    try {
      const enriched = await Promise.all([
        enrichShow('Avatar: The Last Airbender'),
        enrichShow('Gravity Falls'),
        enrichShow('Adventure Time'),
      ])
      const next = enriched.filter((x): x is LabShow => Boolean(x))
      if (next.length) setShows(next)

      const anchor = next[0]
      if (anchor) {
        const [recs, similar] = await Promise.all([
          getShowRecommendations(anchor.id, 1),
          getSimilarShows(anchor.id, 1),
        ])
        const seen = new Set<number>([anchor.id])
        const rawPack = [...(recs.results ?? []), ...(similar.results ?? [])]
          .filter((show) => {
            if (seen.has(show.id)) return false
            seen.add(show.id)
            return Boolean(show.poster_path || show.backdrop_path)
          })
          .slice(0, 5)
        const enrichedPack = await Promise.all(rawPack.map(enrichRawShow))
        const ready = enrichedPack.filter((x): x is LabShow => Boolean(x))
        if (ready.length) setPack(ready)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyOk])

  const preview = shows[0]
  const artifactVariant = shows.find((show) => show.title === 'Gravity Falls') ?? shows[1] ?? preview

  return (
    <div className="min-h-svh bg-[#08080b] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4ade80]">
              Discovery Preview Lab
            </p>
            <h1 className="mt-1 text-2xl font-black leading-none tracking-normal">
              Rich show preview and daily loot pack
            </h1>
          </div>
          <button
            onClick={() => void load()}
            disabled={!keyOk || loading}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/8 text-white disabled:opacity-40"
            title={keyOk ? 'Reload TMDB assets' : 'Add a TMDB key in Settings first'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p>}

        <RichPreviewHeader show={preview} />

        <section className="mt-5">
          <div className="mb-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/85">Artifact Card Variant</h2>
            <p className="mt-1 text-xs font-semibold text-white/45">No show logo, rating left, add right</p>
          </div>
          <LogoFreeArtifactCard show={artifactVariant} />
          <NoTitleArtifactCard show={artifactVariant} />
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white/85">Daily Loot Pack</h2>
              <p className="mt-1 text-xs font-semibold text-white/45">Seeded from recommendations + similar titles</p>
            </div>
            <button
              onClick={() => setRevealed((v) => !v)}
              className="h-10 rounded-lg bg-[#4ade80] px-4 text-xs font-black uppercase tracking-normal text-black"
            >
              {revealed ? 'Close pack' : 'Open pack'}
            </button>
          </div>
          <DailyLootPack shows={pack} revealed={revealed} />
        </section>
      </div>
    </div>
  )
}

function ArtifactCard({ show }: { show: LabShow }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative min-h-[500px] overflow-hidden rounded-2xl border border-white/10 bg-[#15151d] shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:min-h-[520px]"
    >
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#283c86,#45a247_45%,#111827)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#09090c]/30 to-[#09090c]" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.22),transparent_28%)]" />

      <div className="relative flex h-full min-h-[500px] flex-col justify-between p-4 sm:min-h-[520px]">
        <div className="flex items-start justify-between">
          {show.logoPath ? (
            <div className="max-w-[56%] rounded-xl bg-black/22 px-2.5 py-2 backdrop-blur-[2px]">
              <img
                src={imgUrl(show.logoPath, 'original')}
                alt={show.title}
                className="max-h-16 w-full object-contain object-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-white/15 bg-black/35 px-3 py-2 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Loot artifact</p>
              <p className="text-xs font-black uppercase tracking-widest text-[#4ade80]">{show.genre}</p>
            </div>
          )}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4ade80] text-black shadow-[0_0_28px_rgba(74,222,128,0.45)]">
            <Star size={19} fill="currentColor" />
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="w-[34%] max-w-[132px] shrink-0 rotate-[-2deg] rounded-xl border border-white/20 bg-black/30 p-1 shadow-[0_18px_38px_rgba(0,0,0,0.55)] sm:w-[36%] sm:max-w-[150px]">
            {show.posterPath ? (
              <img src={imgUrl(show.posterPath, 'w500')} alt={show.title} className="aspect-[2/3] w-full rounded-lg object-cover" />
            ) : (
              <div className="aspect-[2/3] rounded-lg bg-white/10" />
            )}
          </div>
          <div className="min-w-0 pb-2">
            {!show.logoPath && (
              <h2 className="mb-3 text-4xl font-black leading-none tracking-normal">{show.title}</h2>
            )}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[show.year, ...show.keywords.slice(0, 3)].map((tag) => (
                <span key={tag} className="rounded-md bg-white/12 px-2 py-1 text-[10px] font-bold uppercase tracking-normal text-white/85">
                  {tag}
                </span>
              ))}
            </div>
            <p className="line-clamp-4 text-base font-semibold leading-snug text-white/80">{show.overview}</p>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function TrailerPeek({ show }: { show: LabShow }) {
  return (
    <article className="relative min-h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#121219]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#111827,#0f766e_55%,#18181b)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
      <div className="relative flex min-h-[340px] flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/75 backdrop-blur">
            <Clapperboard size={13} />
            15s trailer peek
          </span>
          <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-black">{show.rating.toFixed(1)}</span>
        </div>

        <a
          href={youtubeUrl(show.trailer)}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/25 bg-white/20 text-white shadow-[0_0_50px_rgba(255,255,255,0.20)] backdrop-blur-md transition-transform active:scale-95',
            !show.trailer && 'pointer-events-none opacity-60',
          )}
        >
          <Play size={30} fill="currentColor" className="ml-1" />
        </a>

        <div>
          {show.logoPath ? (
            <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="mb-3 max-h-16 max-w-[220px] object-contain object-left" />
          ) : (
            <h2 className="mb-2 text-3xl font-black leading-none tracking-normal">{show.title}</h2>
          )}
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#4ade80] px-2 py-1 text-[10px] font-black uppercase tracking-normal text-black">
              <Zap size={11} />
              fresh peek
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-white/80">
              <Shield size={11} />
              preview state
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

function RoleSkinCard({ show, cast, index }: { show: LabShow; cast: TmdbAggregateCastMember; index: number }) {
  const character = cast.roles?.[0]?.character || cast.name
  const roles = ['Would start the quest', 'Steals every scene', 'Never backs down']
  const frame =
    index % 3 === 0
      ? 'from-[#4ade80] via-[#facc15] to-[#38bdf8]'
      : index % 3 === 1
        ? 'from-[#f97316] via-[#fb7185] to-[#e879f9]'
        : 'from-[#22d3ee] via-[#a78bfa] to-[#4ade80]'
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#171720] p-[2px]"
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-95', frame)} />
      <div className="relative h-full overflow-hidden rounded-[10px] bg-black">
        {cast.profile_path ? (
          <img src={imgUrl(cast.profile_path, 'w342')} alt={character} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-white/10" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.1)_38%,rgba(0,0,0,0.92))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.28),transparent_25%)]" />
        {show.logoPath && (
          <div className="absolute left-2 top-2 max-w-[72%] rounded-lg bg-black/35 px-2 py-1 backdrop-blur-[2px]">
            <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="mx-auto max-h-8 max-w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)]" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="line-clamp-2 text-lg font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">{character}</p>
          <div className="mt-2 flex items-center justify-between gap-1">
            <p className="inline-flex rounded-md bg-[#4ade80] px-2 py-1 text-[10px] font-black uppercase tracking-normal leading-none text-black">
              {roles[index % roles.length]}
            </p>
            <span className="text-[10px] font-black uppercase tracking-normal text-white/50">{cast.name.split(' ')[0]}</span>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function FallbackRoleCard({ show, index }: { show: LabShow; index: number }) {
  const roles = ['Would start the quest', 'Steals every scene', 'Never backs down']
  return (
    <article className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#1f2937,#14532d)] p-3">
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-lg font-black text-white">{show.title}</p>
        <p className="mt-2 inline-flex rounded-md bg-[#4ade80] px-2 py-1 text-[10px] font-black uppercase tracking-normal leading-none text-black">{roles[index % roles.length]}</p>
      </div>
    </article>
  )
}

function RichPreviewHeader({ show }: { show: LabShow }) {
  return (
    <section className="relative min-h-[500px] overflow-hidden rounded-2xl border border-white/10 bg-[#121219] shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#172554,#14532d_55%,#18181b)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black" />
      <div className="absolute inset-y-0 left-0 w-4/5 bg-gradient-to-r from-black/90 via-black/62 to-transparent" />

      <div className="relative flex min-h-[500px] flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {show.logoPath ? (
            <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="max-h-20 max-w-[64%] object-contain object-left drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]" />
          ) : (
            <h2 className="max-w-[70%] text-4xl font-black leading-none">{show.title}</h2>
          )}
          <button className="grid h-14 w-14 place-items-center rounded-xl bg-[#4ade80] text-black shadow-[0_0_35px_rgba(74,222,128,0.28)]">
            <Plus size={27} strokeWidth={3} />
          </button>
        </div>

        <div className="max-w-xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-black text-white">{show.year}</span>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-black">{show.rating.toFixed(1)}</span>
            <a
              href={youtubeUrl(show.trailer)}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md bg-white/12 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-normal text-white/85 backdrop-blur',
                !show.trailer && 'pointer-events-none opacity-60',
              )}
            >
              <Play size={12} fill="currentColor" />
              Trailer
            </a>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {show.keywords.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-md bg-black/35 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-normal text-white/78 backdrop-blur">
                {tag}
              </span>
            ))}
          </div>
          <p className="line-clamp-4 text-base font-semibold leading-snug text-white/82 sm:text-lg">{show.overview}</p>
        </div>
      </div>
    </section>
  )
}

function FloatingPoster({ show, className }: { show: LabShow; className?: string }) {
  if (!show.posterPath) return null

  return (
    <motion.div
      animate={{ y: [0, -4, 0], rotate: [-3, -2, -3] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      className={cn('relative shrink-0 overflow-hidden rounded-xl p-[1px] shadow-[0_18px_38px_rgba(0,0,0,0.52)]', className)}
    >
      <motion.div
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
        className="absolute -inset-12 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_285deg,rgba(74,222,128,0.95)_315deg,transparent_345deg)]"
      />
      <div className="relative overflow-hidden rounded-[11px] bg-black">
        <img
          src={imgUrl(show.posterPath, 'w342')}
          alt={show.title}
          className="aspect-[2/3] w-full object-cover"
        />
      </div>
    </motion.div>
  )
}

function LogoFreeArtifactCard({ show }: { show: LabShow }) {
  return (
    <article className="relative mx-auto min-h-[430px] max-w-[720px] overflow-hidden rounded-2xl border border-white/10 bg-[#15151d] shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:min-h-[410px]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#283c86,#45a247_45%,#111827)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/18 to-black/78" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/58 to-transparent" />
      <div className="absolute inset-y-0 right-0 hidden w-[72%] bg-gradient-to-l from-black/74 via-black/34 to-transparent sm:block" />

      <div className="relative flex min-h-[430px] flex-col justify-between p-4 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-black shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
            {show.rating.toFixed(1)}
          </span>
          <LabAddButton />
        </div>

        <div className="rounded-[22px] bg-black/68 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="grid grid-cols-[116px_1fr] items-end gap-3">
            <FloatingPoster show={show} className="w-full" />
            <div className="min-w-0 pb-1">
              <h3 className="mb-2 line-clamp-2 text-3xl font-black leading-[0.9] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
                {show.title}
              </h3>
              <p className="line-clamp-4 text-[15px] font-normal leading-snug text-white/84">{show.overview}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-[410px] flex-col justify-between p-4 sm:flex">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-black shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
            {show.rating.toFixed(1)}
          </span>
          <LabAddButton />
        </div>

        <div className="grid items-end gap-4 sm:grid-cols-[170px_1fr]">
          <FloatingPoster show={show} className="w-full max-w-[176px]" />
          <div className="min-w-0 rounded-2xl bg-black/20 p-3 pb-2 backdrop-blur-[2px] sm:bg-transparent sm:p-0 sm:pb-4">
            <h3 className="mb-2 line-clamp-2 text-3xl font-black leading-[0.9] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] sm:text-4xl">
              {show.title}
            </h3>
            <p className="line-clamp-5 text-base font-normal leading-snug text-white/82 sm:line-clamp-4 sm:text-lg">{show.overview}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

function NoTitleArtifactCard({ show }: { show: LabShow }) {
  return (
    <article className="relative mx-auto mt-4 min-h-[390px] max-w-[720px] overflow-hidden rounded-2xl border border-white/10 bg-[#15151d] shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:min-h-[300px]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#283c86,#45a247_45%,#111827)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/30 to-black/16" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/28 to-black/10" />
      <div className="absolute inset-y-0 right-0 hidden w-[58%] bg-black/38 backdrop-blur-[1px] sm:block" />

      <div className="relative flex min-h-[390px] flex-col justify-between p-4 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-black shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
            {show.rating.toFixed(1)}
          </span>
          <LabAddButton />
        </div>

        <div className="rounded-[22px] bg-black/68 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="grid grid-cols-[112px_1fr] items-end gap-3">
            <FloatingPoster show={show} className="w-full" />
            <p className="line-clamp-6 pb-1 text-[15px] font-normal leading-snug text-white/86">
              {show.overview}
            </p>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-[300px] flex-col justify-between p-4 sm:flex">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-black shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
            {show.rating.toFixed(1)}
          </span>
          <LabAddButton />
        </div>

        <div className="grid grid-cols-[minmax(118px,42%)_1fr] items-end gap-4">
          <FloatingPoster show={show} className="w-full max-w-[180px]" />

          <p className="line-clamp-7 pb-1 text-base font-normal leading-snug text-white/86 drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] sm:text-lg">
            {show.overview}
          </p>
        </div>
      </div>
    </article>
  )
}

function DailyLootPack({ shows, revealed }: { shows: LabShow[]; revealed: boolean }) {
  if (!revealed) {
    const previewShows = shows.slice(0, 5)
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto min-h-[330px] max-w-[360px] overflow-hidden rounded-[28px] border border-white/12 bg-[#101017] shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
      >
        {previewShows[0]?.backdropPath || previewShows[0]?.posterPath ? (
          <img
            src={imgUrl(previewShows[0].backdropPath ?? previewShows[0].posterPath, previewShows[0].backdropPath ? 'w500' : 'w342')}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#1f2937,#14532d)]" />
        )}
        <div className="absolute inset-0 bg-black/22" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

        <div className="relative min-h-[330px] p-5">
          <div className="absolute inset-x-0 top-9 flex justify-center">
            {previewShows.slice(0, 3).map((show, index) => (
              <motion.div
                key={show.id}
                animate={{ y: [0, index % 2 ? 4 : -4, 0] }}
                transition={{ duration: 3.4 + index * 0.25, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute aspect-[2/3] overflow-hidden rounded-xl border border-white/18 bg-black shadow-[0_20px_44px_rgba(0,0,0,0.45)]"
                style={{
                  width: index === 1 ? 156 : 118,
                  x: (index - 1) * 118,
                  rotate: (index - 1) * 13,
                  scale: index === 1 ? 1 : 0.9,
                  zIndex: index === 1 ? 3 : 1,
                  opacity: index === 1 ? 1 : 0.86,
                }}
              >
                {show.posterPath ? (
                  <img src={imgUrl(show.posterPath, 'w342')} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/10" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="absolute bottom-5 left-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4ade80] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">Today's pull</p>
            <p className="mt-1 text-2xl font-black leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">{previewShows.length} shows</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {shows.slice(0, 5).map((show, index) => (
        <motion.article
          key={show.id}
          initial={{ y: 28, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20, delay: revealed ? index * 0.05 : 0 }}
          className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-[#15151d]"
        >
          {show.posterPath ? (
            <img src={imgUrl(show.posterPath, 'w500')} alt={show.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(145deg,#1f2937,#14532d)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            {show.logoPath ? (
              <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="mb-2 max-h-10 max-w-full object-contain object-left drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
            ) : (
              <p className="line-clamp-2 text-lg font-black leading-tight text-white">{show.title}</p>
            )}
            <p className="mt-1 text-[10px] font-black uppercase tracking-normal text-[#4ade80]">
              {show.keywords[0] ?? show.year}
            </p>
          </div>
        </motion.article>
      ))}
    </div>
  )
}

function ArtifactCompact({ show }: { show: LabShow }) {
  return (
    <article className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#14141d]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#1f2937,#166534)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-black/90" />
      <div className="relative flex min-h-[360px] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          {show.logoPath ? (
            <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="max-h-14 max-w-[62%] object-contain object-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]" />
          ) : (
            <h2 className="text-3xl font-black leading-none">{show.title}</h2>
          )}
          <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-black">{show.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-end gap-3">
          {show.posterPath && (
            <img src={imgUrl(show.posterPath, 'w342')} alt={show.title} className="w-[34%] max-w-[112px] rounded-xl border border-white/15 object-cover shadow-xl" />
          )}
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[show.year, ...show.keywords.slice(0, 2)].map((tag) => (
                <span key={tag} className="rounded-md bg-white/12 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-white/85">
                  {tag}
                </span>
              ))}
            </div>
            <p className="line-clamp-3 text-sm font-semibold leading-snug text-white/78">{show.overview}</p>
          </div>
        </div>
      </div>
      <LabAddButton className="absolute bottom-4 right-4" />
    </article>
  )
}

function ArtifactLandscape({ show }: { show: LabShow }) {
  const copy = show.tagline || show.overview

  return (
    <article className="relative min-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#15151d] lg:min-h-[360px]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#7f1d1d,#0f172a)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/42 to-black/5" />
      <div className="relative flex min-h-[220px] flex-col justify-end p-4 pr-16 lg:min-h-[360px]">
        {show.logoPath ? (
          <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="mb-9 max-h-24 max-w-[82%] object-contain object-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]" />
        ) : (
          <h2 className="mb-2 text-3xl font-black leading-none">{show.title}</h2>
        )}
        <p
          className={cn(
            'max-w-[82%] leading-snug text-white/86',
            show.tagline
              ? 'text-xl font-light italic tracking-tight text-white/88 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]'
              : 'line-clamp-3 text-sm font-semibold',
          )}
        >
          {copy}
        </p>
      </div>
      <LabAddButton className="absolute bottom-4 right-4" />
    </article>
  )
}

function TrailerPosterPeek({ show }: { show: LabShow }) {
  return (
    <article className="relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#111118]">
      {show.posterPath ? (
        <img src={imgUrl(show.posterPath, 'w500')} alt={show.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#155e75,#18181b)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />
      <div className="relative flex min-h-[360px] flex-col justify-between p-4">
        <LabAddButton className="absolute right-4 top-4" />
        <span className="w-fit rounded-lg bg-black/42 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/75 backdrop-blur">
          trailer card
        </span>
        <a
          href={youtubeUrl(show.trailer)}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-black shadow-[0_0_45px_rgba(255,255,255,0.28)] transition-transform active:scale-95',
            !show.trailer && 'pointer-events-none opacity-60',
          )}
        >
          <Play size={25} fill="currentColor" className="ml-1" />
        </a>
        {show.logoPath ? (
          <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="max-h-16 max-w-[80%] object-contain object-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]" />
        ) : (
          <h2 className="text-3xl font-black leading-none">{show.title}</h2>
        )}
      </div>
    </article>
  )
}

function LabAddButton({ className }: { className?: string }) {
  const controls = useAnimation()
  const [state, setState] = useState<'idle' | 'adding' | 'added'>('idle')
  const [showBurst, setShowBurst] = useState(false)

  const handleClick = () => {
    if (state !== 'idle') return
    setState('adding')
    window.setTimeout(() => {
      setState('added')
      setShowBurst(true)
      void controls.start({
        scale: [1, 1.32, 0.9, 1],
        transition: { duration: 0.4, times: [0, 0.28, 0.65, 1], ease: 'easeOut' },
      })
      window.setTimeout(() => setShowBurst(false), 600)
      window.setTimeout(() => setState('idle'), 1400)
    }, 450)
  }

  return (
    <div className={cn('relative z-20', className)}>
      <AnimatePresence>
        {showBurst && (
          <motion.div
            key="burst"
            initial={{ scale: 0.85, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0 h-11 w-11 rounded-full border-2 border-[#4ade80] pointer-events-none"
          />
        )}
      </AnimatePresence>
      <motion.button
        animate={controls}
        whileTap={{ scale: 0.68 }}
        onClick={handleClick}
        className="grid h-11 w-11 place-items-center rounded-full bg-[#4ade80] text-black shadow-[0_0_24px_rgba(74,222,128,0.45)]"
      >
        <AnimatePresence mode="wait" initial={false}>
          {state === 'added' ? (
            <motion.span
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              <Check size={18} strokeWidth={3} />
            </motion.span>
          ) : state === 'adding' ? (
            <motion.span
              key="spinner"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin"
            />
          ) : (
            <motion.span
              key="plus"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0, rotate: 45 }}
            >
              <Plus size={24} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}

function RolePosterSheet({ show }: { show: LabShow }) {
  return (
    <article className="relative min-h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#15151d]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#172554,#064e3b)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
      <div className="relative flex min-h-[340px] flex-col justify-end p-4">
        {show.logoPath && (
          <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="mb-3 max-h-14 max-w-[70%] object-contain object-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]" />
        )}
        <div className="grid grid-cols-2 gap-2">
          {['The ride-or-die', 'The wildcard', 'The moral compass', 'The problem solver'].map((role) => (
            <div key={role} className="rounded-lg border border-white/10 bg-black/42 px-3 py-2 backdrop-blur">
              <p className="text-sm font-black leading-tight text-white">{role}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function RoleSquadPanel({ show, roles }: { show: LabShow; roles: TmdbAggregateCastMember[] }) {
  return (
    <article className="min-h-[340px] rounded-2xl border border-white/10 bg-[#121219] p-4">
      {show.logoPath ? (
        <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="mb-4 max-h-12 max-w-[72%] object-contain object-left" />
      ) : (
        <h3 className="mb-4 text-xl font-black">{show.title}</h3>
      )}
      <div className="space-y-3">
        {(roles.length ? roles : []).slice(0, 4).map((cast, index) => (
          <div key={cast.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
            {cast.profile_path && (
              <img src={imgUrl(cast.profile_path, 'w185')} alt={cast.name} className="h-14 w-14 rounded-lg object-cover" />
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-black text-white">{cast.roles?.[0]?.character || cast.name}</p>
              <p className="truncate text-xs font-bold uppercase tracking-normal text-[#4ade80]">
                {['Would start the quest', 'Steals every scene', 'Never backs down', 'Secret weapon'][index]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function RoleStillCard({ show, roles }: { show: LabShow; roles: TmdbAggregateCastMember[] }) {
  const cast = roles[0]
  return (
    <article className="relative min-h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#15151d]">
      {show.backdropPath ? (
        <img src={imgUrl(show.backdropPath, 'original')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#1e293b,#365314)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
      <div className="relative flex min-h-[340px] flex-col justify-between p-4">
        {show.logoPath && (
          <img src={imgUrl(show.logoPath, 'original')} alt={show.title} className="max-h-12 max-w-[68%] object-contain object-left drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]" />
        )}
        <div>
          <p className="mb-2 inline-flex rounded-md bg-[#4ade80] px-2 py-1 text-xs font-black uppercase tracking-normal text-black">
            Dream squad slot
          </p>
          <p className="text-2xl font-black leading-tight text-white">
            {cast?.roles?.[0]?.character || 'Pick the one who changes the whole episode'}
          </p>
        </div>
      </div>
    </article>
  )
}
