import { useMemo, useState } from 'react'
import { Plus, X, Check, User, Edit3, Eye, RotateCcw, Trash2, Search } from 'lucide-react'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { setTop8 } from '../../data/queries'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { Show, Tier } from '../../types'
import { MyCast } from '../cast-roles/MyCast'
import { RankMark, TIER_COLORS, VibeBubbles } from '../../components/show/CollectibleMediaCard'
import { FullScreenOverlayShell, PickerTopBar } from '../../components/ui/FullScreenPickerShell'

const PROFILE_COLORS = [
  'from-rose-500 to-orange-500',
  'from-emerald-400 to-green-600',
  'from-sky-500 to-blue-700',
  'from-amber-400 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-slate-700 to-black',
]

const MAX = 8

interface Props {
  onOpenShow: (show: Show) => void
}

export function ProfileTab({ onOpenShow }: Props) {
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const tiers = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const emojiCategories = useDexieQuery(['emojiCategories'], () => db.emojiCategories.toArray(), [], [])
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('PLAYER ONE')
  const [colorIndex, setColorIndex] = useState(0)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [top8Search, setTop8Search] = useState('')

  const top8 = useMemo(
    () =>
      shows
        .filter((s) => typeof s.top8Position === 'number' && s.top8Position >= 0)
        .sort((a, b) => (a.top8Position ?? 0) - (b.top8Position ?? 0)),
    [shows],
  )

  const slots: (Show | null)[] = Array.from({ length: MAX }).map((_, i) => top8[i] ?? null)
  const availableShows = shows.filter((s) => !top8.some((t) => t.id === s.id))
  const filteredAvailableShows = useMemo(() => {
    const query = top8Search.trim().toLowerCase()
    if (!query) return availableShows
    return availableShows.filter((show) => {
      const searchable = [
        show.name,
        show.year?.toString(),
        ...(show.genres ?? []),
        ...(show.rawGenres ?? []),
      ].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(query)
    })
  }, [availableShows, top8Search])
  const activeShow = activeSlot === null ? null : slots[activeSlot]
  const tierByShowId = useMemo(() => new Map(tiers.map((tier) => [tier.showId, tier.tier])), [tiers])
  const vibesByShowId = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const category of emojiCategories) {
      for (const showId of category.showIds) {
        const list = map.get(showId) ?? []
        list.push(category.emoji)
        map.set(showId, list)
      }
    }
    return map
  }, [emojiCategories])

  const assign = async (slotIdx: number, show: Show) => {
    const existing = top8.find((t) => t.id === show.id)
    if (existing) await setTop8(existing.id, null)

    const displaced = top8[slotIdx]
    if (displaced && displaced.id !== show.id) {
      await setTop8(displaced.id, null)
    }

    await setTop8(show.id, slotIdx)
    setSelectingSlot(null)
    setTop8Search('')
  }

  const removeAt = async (idx: number) => {
    const show = top8[idx]
    if (!show) return
    await setTop8(show.id, null)
    const remaining = top8.filter((x) => x.id !== show.id)
    for (let i = 0; i < remaining.length; i++) {
      await setTop8(remaining[i].id, i)
    }
  }

  return (
    <>
      <div className="relative flex flex-col min-h-full pb-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_28%_0%,rgba(245,196,83,0.16),transparent_20rem),radial-gradient(circle_at_86%_10%,rgba(251,113,133,0.12),transparent_18rem)]" aria-hidden />

        <div className="relative z-10 px-4 pt-4 pb-6">
          <div className="relative mb-4 overflow-hidden rounded-[26px] px-3 py-3">
            <div
              className={cn(
                'absolute top-0 right-0 w-48 h-48 bg-gradient-to-br opacity-30 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none',
                PROFILE_COLORS[colorIndex],
              )}
            />

            <div className="flex items-center gap-3 relative z-10">
              <div
                className={cn(
                  'h-[60px] w-[60px] rounded-[20px] bg-gradient-to-tr flex items-center justify-center shadow-[0_16px_36px_rgba(0,0,0,0.42)] flex-shrink-0',
                  PROFILE_COLORS[colorIndex],
                )}
              >
                <User size={28} className="text-white drop-shadow-md" />
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="w-full bg-black/42 border border-white/12 rounded-2xl px-3 py-1 font-black uppercase tracking-tighter text-2xl text-white outline-none focus:border-[#f5c453] mb-1"
                    maxLength={12}
                    autoFocus
                  />
                ) : (
                  <h2 className="text-2xl font-black uppercase tracking-[-0.08em] text-white leading-none mb-1 truncate">
                    {name}
                  </h2>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#f5c453] tracking-widest uppercase">
                    {shows.length} Shows
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsEditing((v) => !v)}
                className={cn(
                  'p-2.5 rounded-full transition-colors flex-shrink-0',
                  isEditing ? 'bg-[#f5c453] text-black' : 'bg-white/10 text-white hover:bg-white/20',
                )}
                aria-label={isEditing ? 'Save' : 'Edit profile'}
              >
                {isEditing ? <Check size={18} /> : <Edit3 size={18} />}
              </button>
            </div>

            {isEditing && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {PROFILE_COLORS.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => setColorIndex(idx)}
                      className={cn(
                        'w-10 h-10 rounded-xl flex-shrink-0 bg-gradient-to-tr border-2 transition-transform active:scale-90',
                        color,
                        colorIndex === idx ? 'border-white scale-110' : 'border-transparent opacity-50',
                      )}
                      aria-label={`Color ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-7">
            <div className="grid grid-cols-4 gap-3">
              {slots.map((show, index) => (
                <Top8Card
                  key={index}
                  show={show}
                  index={index}
                  tier={show ? tierByShowId.get(show.id) : undefined}
                  vibes={show ? vibesByShowId.get(show.id) ?? [] : []}
                  onPick={() => setSelectingSlot(index)}
                  onOpenActions={() => setActiveSlot(index)}
                />
              ))}
            </div>
          </div>

          <section>
            <h3 className="font-black tracking-[0.24em] text-[11px] uppercase text-white/44 mb-2 px-1">Characters</h3>
            <MyCast />
          </section>
        </div>
      </div>

      {selectingSlot !== null && (
        <FullScreenOverlayShell>
          <PickerTopBar onClose={() => { setSelectingSlot(null); setTop8Search('') }} />
          {availableShows.length > 0 && (
            <div className="px-4 pb-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/34" />
                <input
                  autoFocus
                  type="search"
                  value={top8Search}
                  onChange={(event) => setTop8Search(event.target.value)}
                  placeholder="Find a show"
                  className="h-12 w-full rounded-full bg-white/[0.075] pl-11 pr-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.08] placeholder:text-white/28 focus:ring-[#f5c453]/50"
                />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {availableShows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
                <Plus size={40} />
                <p className="font-bold uppercase tracking-widest">Collection Empty</p>
              </div>
            ) : filteredAvailableShows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
                <Search size={36} />
                <p className="font-bold uppercase tracking-widest">No matches</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-4 pb-16">
                {filteredAvailableShows.map((show) => (
                  <div key={show.id} className="relative group cursor-pointer aspect-[2/3] rounded-[22px] overflow-hidden bg-[#151117] shadow-[0_16px_34px_rgba(0,0,0,0.34)]" onClick={() => void assign(selectingSlot, show)}>
                    {show.posterPath ? (
                      <img src={imgUrl(show.posterPath, 'w342')} alt={show.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                        {show.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                      <Check size={28} className="text-[#f5c453]" strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FullScreenOverlayShell>
      )}
      <Top8ActionSheet
        show={activeShow}
        slot={activeSlot}
        onClose={() => setActiveSlot(null)}
        onView={() => {
          if (activeShow) onOpenShow(activeShow)
          setActiveSlot(null)
        }}
        onReplace={() => {
          if (activeSlot === null) return
          setSelectingSlot(activeSlot)
          setActiveSlot(null)
        }}
        onRemove={() => {
          if (activeSlot === null) return
          void removeAt(activeSlot)
          setActiveSlot(null)
        }}
      />
    </>
  )
}

function Top8ActionSheet({
  show,
  slot,
  onClose,
  onView,
  onReplace,
  onRemove,
}: {
  show: Show | null
  slot: number | null
  onClose: () => void
  onView: () => void
  onReplace: () => void
  onRemove: () => void
}) {
  if (!show || slot === null) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="absolute inset-x-3 bottom-4 overflow-hidden rounded-[30px] bg-[#101014]/96 text-white shadow-[0_28px_80px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.08]" onClick={(event) => event.stopPropagation()}>
        <div className="relative h-32 overflow-hidden">
          {show.backdropPath || show.posterPath ? (
            <img src={imgUrl(show.backdropPath ?? show.posterPath, show.backdropPath ? 'w500' : 'w342')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-62" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/48 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101014] to-transparent" />
          <div className="absolute bottom-4 left-4 right-14">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f5c453]">Top {slot + 1}</p>
            <h3 className="mt-1 line-clamp-2 text-2xl font-black leading-[0.9] tracking-[-0.08em]">{show.name}</h3>
          </div>
          <button onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/44 text-white/80 backdrop-blur-md ring-1 ring-white/[0.08]" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-2 p-3">
          <button onClick={onView} className="flex h-12 items-center gap-3 rounded-[22px] bg-white/[0.08] px-4 text-left font-black uppercase tracking-[0.12em] text-white active:scale-[0.99]">
            <Eye size={18} />
            View details
          </button>
          <button onClick={onReplace} className="flex h-12 items-center gap-3 rounded-[22px] bg-white/[0.08] px-4 text-left font-black uppercase tracking-[0.12em] text-white active:scale-[0.99]">
            <RotateCcw size={18} />
            Replace slot
          </button>
          <button onClick={onRemove} className="flex h-12 items-center gap-3 rounded-[22px] bg-rose-500/12 px-4 text-left font-black uppercase tracking-[0.12em] text-rose-200 active:scale-[0.99]">
            <Trash2 size={18} />
            Remove from Top 8
          </button>
        </div>
      </div>
    </div>
  )
}

function Top8Card({
  show,
  index,
  tier,
  vibes,
  onPick,
  onOpenActions,
}: {
  show: Show | null
  index: number
  tier?: Tier
  vibes: string[]
  onPick: () => void
  onOpenActions: () => void
}) {
  const tierColor = tier ? TIER_COLORS[tier] : '#f5c453'
  const featured = index < 2

  return (
    <div
      className={cn(
        'aspect-[2/3] rounded-[22px] relative cursor-pointer overflow-hidden transition-transform active:scale-95 group',
        featured && 'col-span-2',
        !show ? 'bg-white/[0.035] hover:bg-white/[0.07] flex items-center justify-center' : '',
      )}
      onClick={show ? onOpenActions : onPick}
      style={show ? {
        boxShadow: `0 18px 38px rgba(0,0,0,0.42), 0 0 0 2px ${tierColor}b8, 0 0 34px ${tierColor}44, inset 0 0 0 1px rgba(255,255,255,0.12)`,
      } : undefined}
    >
      {!show ? (
        <Plus size={featured ? 30 : 22} className="text-white/24 group-hover:text-white/60 transition-colors" />
      ) : (
        <>
          <div className="absolute inset-0 rounded-[22px]" style={{ background: `radial-gradient(circle at 92% 10%, ${tierColor}36, transparent 9rem)` }} />
          {show.posterPath ? (
            <img src={imgUrl(show.posterPath, 'w342')} alt={show.name} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
              {show.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/10" />
          <RankMark tier={tier} featured={featured} compact className="absolute right-2 top-2 z-20" />
          {show && <VibeBubbles showId={show.id} vibes={vibes} seedOffset={index} />}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="line-clamp-2 text-sm font-black leading-[0.95] tracking-[-0.055em] text-white">{show.name}</p>
          </div>
          <div className="absolute inset-0 bg-black/36 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <span className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black">Options</span>
          </div>
        </>
      )}
    </div>
  )
}
