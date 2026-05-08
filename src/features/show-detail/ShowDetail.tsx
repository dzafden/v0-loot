import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, Drama, Plus, Trash2, Tv, X } from 'lucide-react'
import type { CastRole, EmojiCategory, Show, Tier } from '../../types'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import {
  applyEmoji,
  cacheSeason,
  createEmojiCategory,
  deleteShow,
  removeEmoji,
  setAllCachedSeasonsWatched,
  setTier,
  progressForShow,
} from '../../data/queries'
import { getCredits, getSeason, getShowDetail, getShowImages, hasTmdbKey, imgUrl } from '../../lib/tmdb'
import { getRarity, RARITIES } from '../../lib/rarity'
import { cn } from '../../lib/utils'

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
  onBack: () => void
  onTrackEpisodes: (s: Show) => void
  onAssignRole: (s: Show, personId?: number) => void
}

export function ShowDetail({ show, onBack, onTrackEpisodes, onAssignRole }: Props) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [episodeBulkBusy, setEpisodeBulkBusy] = useState<null | 'mark' | 'unmark'>(null)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null)
  const [showCast, setShowCast] = useState<DetailCastMember[]>([])
  const [castLoading, setCastLoading] = useState(false)
  const [rankEditorOpen, setRankEditorOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const liveShow = useDexieQuery(['shows'], () => db.shows.get(show.id), show, [show.id]) ?? show
  const emojiCategories = useDexieQuery(['emojiCategories'], () => db.emojiCategories.toArray(), [], [])
  const tierAssignment = useDexieQuery(['tierAssignments'], () => db.tierAssignments.get(show.id), undefined, [show.id])
  const cast = useDexieQuery(['castRoles'], () => db.castRoles.where({ showId: show.id }).toArray(), [], [show.id])
  const [progress, setProgress] = useState({ watched: 0, total: 0 })

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
        const seasons = detail.seasons.filter((season) => season.season_number !== 0)
        const episodes = seasons.reduce((sum, season) => sum + (season.episode_count ?? 0), 0)
        if (!cancelled) setSeasonInfo({ seasons: detail.number_of_seasons || seasons.length, episodes })
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
  const metadata = [liveShow.year, liveShow.genres?.[0], seasonLabel(seasonInfo, progress)].filter(Boolean)

  const handleTier = async (nextTier: Tier) => {
    const removing = tier === nextTier
    await setTier(show.id, tier === nextTier ? null : nextTier)
    setRankEditorOpen(removing)
    navigator.vibrate?.([6, 18, 8])
  }

  const handleDelete = async () => {
    if (!confirm(`Remove "${show.name}" from your stash?`)) return
    await deleteShow(show.id)
    onBack()
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
      <div className="relative min-h-[470px] overflow-hidden">
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
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#060509] via-[#060509]/72 to-transparent" />

        <header className="relative z-10 flex items-center justify-between px-4 pt-4">
          <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full bg-black/34 text-white/86 backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95" aria-label="Back">
            <ChevronLeft size={21} />
          </button>
          <motion.button
            key={tier ?? 'rank'}
            onClick={() => setRankEditorOpen((open) => !open)}
            initial={{ opacity: 0, y: -8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="grid h-11 min-w-11 place-items-center rounded-full px-3 text-[11px] font-black uppercase tracking-[0.18em] backdrop-blur-xl ring-1 ring-white/[0.08] active:scale-95"
            style={{
              background: tier ? accent : 'rgba(0,0,0,0.42)',
              color: tier ? '#fff' : accent,
              boxShadow: tier ? `0 14px 34px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.22)` : undefined,
            }}
            aria-label={tier ? `Change ${tier} rank` : 'Rank this show'}
          >
            {tier ?? 'Rank'}
          </motion.button>
        </header>

        <div className="absolute inset-x-0 bottom-12 z-10 px-5">
          {logoPath ? (
            <img src={imgUrl(logoPath, 'w500')} alt={liveShow.name} className="max-h-[128px] max-w-[86%] object-contain object-left drop-shadow-[0_16px_36px_rgba(0,0,0,0.96)]" />
          ) : (
            <h1 className="max-w-[360px] text-[48px] font-black leading-[0.84] tracking-[-0.12em] text-balance drop-shadow-[0_16px_36px_rgba(0,0,0,0.9)]">{liveShow.name}</h1>
          )}

          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/58">
            {metadata.map((item) => <span key={item}>{item}</span>)}
          </div>

          <div className="mt-3">
            <VibeRail showId={show.id} all={emojiCategories} applied={showEmojis} accent={accent} />
          </div>
        </div>
      </div>

      <main className="relative z-20 -mt-8 px-4">
        {liveShow.overview && (
          <section>
            <p className={cn('text-[20px] font-semibold leading-[1.15] tracking-[-0.035em] text-white/84', !storyOpen && 'line-clamp-4')}>
              {liveShow.overview}
            </p>
            {liveShow.overview.length > 180 && (
              <button onClick={() => setStoryOpen((value) => !value)} className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
                {storyOpen ? 'Less' : 'More'}
              </button>
            )}
          </section>
        )}

        {(!tier || rankEditorOpen) && (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6"
          >
            <InlineRank tier={tier} onTier={handleTier} />
          </motion.section>
        )}

        <CastSection
          assigned={cast}
          members={showCast}
          loading={castLoading}
          onCast={() => onAssignRole(liveShow)}
          onCastPerson={(personId) => onAssignRole(liveShow, personId)}
          accent={accent}
        />
        <TrackingSection show={liveShow} progress={progress} busy={episodeBulkBusy} onOpen={() => onTrackEpisodes(liveShow)} onBulk={handleEpisodeBulk} accent={accent} />

        <div className="mt-9 flex justify-center border-t border-white/[0.06] pt-5">
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/18 transition-colors hover:text-rose-300 active:scale-95">
            <Trash2 size={12} />
            Remove from stash
          </button>
        </div>
      </main>
    </div>
  )
}

function InlineRank({ tier, onTier }: { tier: Tier | null; onTier: (tier: Tier) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {TIERS.map((rank) => {
        const style = TIER_DETAIL[rank]
        const active = tier === rank
        return (
          <button
            key={rank}
            onClick={() => onTier(rank)}
            className={cn('h-[76px] rounded-[24px] border text-3xl font-black transition-all active:scale-95', active && 'scale-[1.035]')}
            style={{
              color: style.color,
              background: active ? `linear-gradient(180deg, ${style.soft}, rgba(8,8,10,0.95))` : `linear-gradient(180deg, ${style.wash}, rgba(8,8,10,0.82))`,
              borderColor: active ? `${style.color}aa` : `${style.color}45`,
              boxShadow: active ? `0 18px 42px rgba(0,0,0,0.52), 0 0 28px ${style.color}4d` : '0 12px 28px rgba(0,0,0,0.32)',
            }}
          >
            {rank}
          </button>
        )
      })}
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
            <div key={item} className="h-[176px] w-[122px] shrink-0 animate-pulse rounded-[26px] bg-white/[0.06]" />
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
                  'group relative h-[184px] w-[126px] shrink-0 overflow-hidden rounded-[26px] bg-black text-left shadow-[0_18px_42px_rgba(0,0,0,0.44)] ring-1 ring-white/[0.07] transition-transform active:scale-[0.97]',
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
                  className={cn('absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full font-black shadow-[0_12px_24px_rgba(0,0,0,0.45)]', assignedRole ? 'bg-white text-black' : 'text-black')}
                  style={assignedRole ? undefined : { background: accent }}
                >
                  {assignedRole ? <Check size={16} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  {assignedRole && <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>{assignedRole.roleName}</p>}
                  <p className="line-clamp-2 text-sm font-black leading-[0.95] tracking-[-0.05em] text-white">{member.character || member.name}</p>
                  <p className="mt-1 truncate text-[10px] font-bold text-white/38">{member.name}</p>
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
  return (
    <section className="mt-8">
      <div className="relative overflow-hidden rounded-[32px] bg-[#101014] shadow-[0_22px_58px_rgba(0,0,0,0.46)] ring-1 ring-white/[0.07]">
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
                {progress.total > 0 ? (complete ? 'Caught up' : `${progress.watched}/${progress.total}`) : 'Start'}
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

function VibeRail({ showId, all, applied, accent }: { showId: number; all: EmojiCategory[]; applied: EmojiCategory[]; accent: string }) {
  const [creating, setCreating] = useState(false)
  const [emoji, setEmoji] = useState('')
  const [label, setLabel] = useState('')
  const appliedIds = new Set(applied.map((a) => a.id))
  const visible = (applied.length ? applied : all).slice(0, 5)

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
