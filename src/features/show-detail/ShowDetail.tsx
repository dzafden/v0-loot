import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Star,
  Trophy,
  Folder,
  Heart,
  Tv,
  Drama,
  Trash2,
  Plus,
  X,
  Check,
} from 'lucide-react'
import type { Show, Tier } from '../../types'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import {
  addToCollection,
  applyEmoji,
  cacheSeason,
  createCollection,
  createEmojiCategory,
  deleteShow,
  removeEmoji,
  removeFromCollection,
  setAllCachedSeasonsWatched,
  setTier,
  setTop8,
  progressForShow,
} from '../../data/queries'
import { getSeason, getShowDetail, imgUrl } from '../../lib/tmdb'
import { getRarity, RARITIES, TIER_STYLE } from '../../lib/rarity'

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']
const SUGGESTED_EMOJI = ['❤️', '🔥', '💀', '🥶', '😭', '🍔', '🥲', '🌹', '🥀', '👑', '🎯', '🤡', '🧠', '🎲', '🌶️', '⭐']

interface Props {
  show: Show
  onBack: () => void
  onTrackEpisodes: (s: Show) => void
  onAssignRole: (s: Show) => void
}

export function ShowDetail({ show, onBack, onTrackEpisodes, onAssignRole }: Props) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [episodeBulkBusy, setEpisodeBulkBusy] = useState<null | 'mark' | 'unmark'>(null)
  // Live data
  const liveShow = useDexieQuery(['shows'], () => db.shows.get(show.id), show, [show.id]) ?? show
  const collections = useDexieQuery(['collections'], () => db.collections.toArray(), [], [])
  const emojiCategories = useDexieQuery(
    ['emojiCategories'],
    () => db.emojiCategories.toArray(),
    [],
    [],
  )
  const tierAssignment = useDexieQuery(
    ['tierAssignments'],
    () => db.tierAssignments.get(show.id),
    undefined,
    [show.id],
  )
  const cast = useDexieQuery(
    ['castRoles'],
    () => db.castRoles.where({ showId: show.id }).toArray(),
    [],
    [show.id],
  )
  const [progress, setProgress] = useState({ watched: 0, total: 0 })
  useEffect(() => {
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'auto' })
  }, [show.id, scrollEl])

  useEffect(() => {
    progressForShow(show.id).then(setProgress)
  }, [show.id, cast.length, tierAssignment])

  const isTop8 = typeof liveShow.top8Position === 'number' && liveShow.top8Position! >= 0
  const tier = tierAssignment?.tier ?? null
  const rarity = getRarity(liveShow, tier, isTop8)
  const r = RARITIES[rarity]

  const showEmojis = useMemo(
    () => emojiCategories.filter((c) => c.showIds.includes(show.id)),
    [emojiCategories, show.id],
  )
  const showCollections = useMemo(
    () => collections.filter((c) => c.showIds.includes(show.id)),
    [collections, show.id],
  )

  const handleTop8 = async () => {
    if (isTop8) {
      await setTop8(show.id, null)
    } else {
      const top8Count = await db.shows.where('top8Position').above(-1).count()
      try {
        await setTop8(show.id, top8Count)
      } catch (e) {
        alert((e as Error).message)
      }
    }
  }

  const handleTier = async (t: Tier) => {
    await setTier(show.id, tier === t ? null : t)
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
    for (const s of detail.seasons) {
      if (s.season_number === 0) continue
      if (cachedSet.has(s.season_number)) continue
      const data = await getSeason(show.id, s.season_number)
      await cacheSeason({
        key: `${show.id}-${s.season_number}`,
        showId: show.id,
        seasonNumber: s.season_number,
        episodes: data.episodes.map((e) => ({
          episode_number: e.episode_number,
          name: e.name,
          still_path: e.still_path ?? null,
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
    <div
      ref={setScrollEl}
      className="fixed inset-0 z-30 bg-[#0f0f13] overflow-y-auto overscroll-contain pb-28"
    >
      {/* Hero */}
      <div className="relative">
        {liveShow.backdropPath ? (
          <img
            src={imgUrl(liveShow.backdropPath, 'w500')}
            alt=""
            className="absolute inset-0 h-[280px] w-full object-cover opacity-40 blur-sm"
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-x-0 top-0 h-[280px] bg-gradient-to-b from-transparent to-[#0f0f13]" />

        <header className="relative z-10 px-3 pt-4 pb-2 flex items-center gap-2">
          <button
            onClick={onBack}
            className="grid place-items-center h-10 w-10 rounded-xl bg-black/40 backdrop-blur hover:bg-black/60"
          >
            <ChevronLeft size={20} />
          </button>
        </header>

        <div className="relative z-10 px-5 pt-3 pb-5 flex gap-4">
          {/* Poster */}
          <div
            className="relative shrink-0 w-[110px] aspect-[2/3] rounded-2xl overflow-hidden ring-[3px] ring-inset"
            style={{ '--ring': r.hex } as never}
          >
            <div
              className="absolute inset-0 ring-[3px] ring-inset rounded-2xl pointer-events-none z-20"
              style={{ boxShadow: `inset 0 0 0 3px ${r.hex}, 0 0 28px ${r.hex}55` }}
            />
            {liveShow.posterPath ? (
              <img
                src={imgUrl(liveShow.posterPath, 'w342')}
                alt={liveShow.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-zinc-800 text-2xl font-black text-white/40">
                {liveShow.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 flex flex-col justify-end">
            <span
              className="text-[10px] font-black uppercase tracking-[0.22em] mb-1"
              style={{ color: r.hex }}
            >
              {r.name}
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">
              {liveShow.name}
            </h1>
            <p className="text-[11px] font-bold text-zinc-500 tracking-widest uppercase mt-1.5">
              {liveShow.year}
              {liveShow.genres?.[0] ? ` • ${liveShow.genres[0]}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Status pills */}
      <div className="px-5 mb-6 flex flex-wrap gap-2">
        {isTop8 && (
          <Pill icon={<Star size={12} className="fill-yellow-400 text-yellow-400" />}>
            Top 8 · #{(liveShow.top8Position ?? 0) + 1}
          </Pill>
        )}
        {tier && (
          <Pill>
            <span className={`grid place-items-center h-4 w-4 rounded-[5px] font-black text-[9px] ${TIER_STYLE[tier]}`}>
              {tier}
            </span>
            Tier {tier}
          </Pill>
        )}
        {progress.total > 0 && (
          <Pill icon={<Tv size={12} />}>
            {progress.watched}/{progress.total} watched
          </Pill>
        )}
        {cast.length > 0 && (
          <Pill icon={<Drama size={12} />}>
            {cast.length} {cast.length === 1 ? 'role' : 'roles'}
          </Pill>
        )}
      </div>

      {/* Curate section */}
      <Section icon={<Trophy size={14} />} title="Curate">
        {/* Top 8 toggle */}
        <button
          onClick={handleTop8}
          className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 transition-colors ${
            isTop8 ? 'bg-yellow-400/15 ring-1 ring-yellow-400/40' : 'bg-white/[0.04] hover:bg-white/[0.07]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Star
              size={16}
              className={isTop8 ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-400'}
            />
            <span className="text-sm font-bold">
              {isTop8 ? `In Top 8 · #${(liveShow.top8Position ?? 0) + 1}` : 'Send to Top 8'}
            </span>
          </div>
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              isTop8 ? 'text-yellow-400' : 'text-zinc-500'
            }`}
          >
            {isTop8 ? 'Tap to remove' : 'Add'}
          </span>
        </button>

        {/* Tier picker */}
        <div className="mt-2 rounded-2xl bg-white/[0.04] p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
            Tier
          </div>
          <div className="flex gap-2">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => handleTier(t)}
                className={`flex-1 h-11 rounded-xl font-black text-lg transition-transform active:scale-95 ${
                  tier === t ? TIER_STYLE[t] : 'bg-white/[0.04] text-white/40 hover:text-white/70'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Vibes */}
      <Section icon={<Heart size={14} />} title="Vibes">
        <VibesEditor
          showId={show.id}
          all={emojiCategories}
          applied={showEmojis}
        />
      </Section>

      {/* Collections */}
      <Section icon={<Folder size={14} />} title="Collections">
        <CollectionsEditor
          showId={show.id}
          all={collections}
          applied={showCollections}
        />
      </Section>

      {/* Episodes */}
      <Section icon={<Tv size={14} />} title="Episodes">
        <div className="w-full rounded-2xl bg-white/[0.04] px-4 py-3">
          <button
            onClick={() => onTrackEpisodes(liveShow)}
            className="w-full flex items-center justify-between transition-colors"
          >
            <div className="text-left">
              <div className="text-base font-black">
                {progress.total > 0
                  ? progress.watched >= progress.total
                    ? 'Completed'
                    : `${progress.watched}/${progress.total} episodes`
                  : 'Track episodes'}
              </div>
              {progress.total > 0 && (
                <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.min(100, (progress.watched / progress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Open
            </span>
          </button>
          <div className="mt-3 flex gap-2">
            {progress.total > 0 && progress.watched >= progress.total ? (
              <button
                onClick={() => void handleEpisodeBulk(false)}
                disabled={episodeBulkBusy !== null}
                className="flex-1 h-9 rounded-xl bg-white/10 text-white/80 text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                {episodeBulkBusy === 'unmark' ? 'Saving…' : 'Unmark All'}
              </button>
            ) : (
              <button
                onClick={() => void handleEpisodeBulk(true)}
                disabled={episodeBulkBusy !== null}
                className="flex-1 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                {episodeBulkBusy === 'mark' ? 'Saving…' : 'Mark All Watched'}
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Cast */}
      <Section icon={<Drama size={14} />} title="Cast">
        {cast.length > 0 && (
          <ul className="rounded-2xl bg-white/[0.04] divide-y divide-white/5 mb-2 overflow-hidden">
            {cast.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                  {c.profilePath ? (
                    <img
                      src={imgUrl(c.profilePath, 'w185')}
                      alt={c.actorName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black uppercase tracking-wider text-amber-300">
                    {c.roleName}
                  </div>
                  <div className="text-sm font-semibold truncate">{c.characterName}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{c.actorName}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => onAssignRole(liveShow)}
          className="w-full rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
        >
          <Plus size={16} strokeWidth={3} />
          Cast a role
        </button>
      </Section>

      {/* Danger */}
      <div className="px-4 mt-8">
        <button
          onClick={handleDelete}
          className="w-full rounded-2xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
        >
          <Trash2 size={16} />
          Remove from stash
        </button>
      </div>
    </div>
  )
}

// ---------- shared bits ----------

function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/85">
      {icon}
      {children}
    </span>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="px-4 mt-6 first:mt-0">
      <div className="flex items-center gap-1.5 mb-2 px-1 text-zinc-400">
        {icon}
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function VibesEditor({
  showId,
  all,
  applied,
}: {
  showId: number
  all: { id: string; emoji: string; label?: string; showIds: number[] }[]
  applied: { id: string; emoji: string; label?: string }[]
}) {
  const [creating, setCreating] = useState(false)
  const [emoji, setEmoji] = useState('')
  const [label, setLabel] = useState('')
  const appliedIds = new Set(applied.map((a) => a.id))

  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <div className="flex flex-wrap gap-1.5">
        {all.map((c) => {
          const on = appliedIds.has(c.id)
          return (
            <button
              key={c.id}
              onClick={() =>
                on ? void removeEmoji(c.id, showId) : void applyEmoji(c.id, showId)
              }
              className={`rounded-xl px-2 h-9 flex items-center gap-1.5 text-sm border transition-colors ${
                on
                  ? 'bg-amber-300 text-amber-950 border-amber-200'
                  : 'bg-white/[0.06] text-white/85 border-white/10 hover:bg-white/[0.1]'
              }`}
            >
              <span className="text-base leading-none">{c.emoji}</span>
              {c.label && <span className="text-[12px]">{c.label}</span>}
            </button>
          )
        })}
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl px-2 h-9 flex items-center gap-1 text-[12px] border border-dashed border-white/15 text-white/55 hover:text-white/85 hover:border-white/30"
          >
            <Plus size={14} />
            New vibe
          </button>
        ) : null}
      </div>

      {creating && (
        <div className="mt-3 rounded-xl bg-white/[0.04] p-2.5">
          <div className="flex flex-wrap gap-1 mb-2">
            {SUGGESTED_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`h-9 w-9 rounded-lg text-xl ${
                  emoji === e ? 'bg-white text-black' : 'bg-white/[0.04] hover:bg-white/[0.08]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              placeholder="🥀"
              className="w-14 text-center text-lg rounded-xl bg-white/[0.06] px-2 h-10"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="flex-1 rounded-xl bg-white/[0.06] px-3 h-10 text-sm"
            />
            <button
              disabled={!emoji.trim()}
              onClick={async () => {
                const cat = await createEmojiCategory(emoji.trim(), label.trim() || undefined)
                await applyEmoji(cat.id, showId)
                setCreating(false)
                setEmoji('')
                setLabel('')
              }}
              className="rounded-xl bg-[#4ade80] text-black px-3 h-10 text-sm font-black uppercase tracking-widest disabled:opacity-40"
            >
              <Check size={16} strokeWidth={3} />
            </button>
            <button
              onClick={() => {
                setCreating(false)
                setEmoji('')
                setLabel('')
              }}
              className="rounded-xl bg-white/[0.06] text-white/70 px-2 h-10"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CollectionsEditor({
  showId,
  all,
  applied,
}: {
  showId: number
  all: { id: string; name: string; showIds: number[] }[]
  applied: { id: string; name: string }[]
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const appliedIds = new Set(applied.map((a) => a.id))

  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <div className="flex flex-wrap gap-1.5">
        {all.map((c) => {
          const on = appliedIds.has(c.id)
          return (
            <button
              key={c.id}
              onClick={() =>
                on ? void removeFromCollection(c.id, showId) : void addToCollection(c.id, showId)
              }
              className={`rounded-xl px-3 h-9 flex items-center gap-2 text-[12.5px] font-bold border transition-colors ${
                on
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.06] text-white/85 border-white/10 hover:bg-white/[0.1]'
              }`}
            >
              <Folder size={12} />
              {c.name}
            </button>
          )
        })}
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl px-3 h-9 flex items-center gap-1 text-[12px] border border-dashed border-white/15 text-white/55 hover:text-white/85 hover:border-white/30"
          >
            <Plus size={14} />
            New collection
          </button>
        ) : null}
      </div>

      {creating && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return
            const c = await createCollection(name.trim())
            await addToCollection(c.id, showId)
            setName('')
            setCreating(false)
          }}
          className="mt-3 flex gap-2"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Comfort food"
            className="flex-1 rounded-xl bg-white/[0.06] px-3 h-10 text-sm"
          />
          <button className="rounded-xl bg-[#4ade80] text-black px-3 h-10 text-sm font-black">
            <Check size={16} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false)
              setName('')
            }}
            className="rounded-xl bg-white/[0.06] text-white/70 px-2 h-10"
          >
            <X size={16} />
          </button>
        </form>
      )}
    </div>
  )
}

// keep motion import in use to silence unused warnings if any
void motion
