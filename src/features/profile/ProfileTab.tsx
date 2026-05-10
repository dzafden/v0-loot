import { useMemo, useState, type CSSProperties } from 'react'
import { Plus, X, Check, User, Edit3 } from 'lucide-react'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { setTop8 } from '../../data/queries'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { Show, Tier } from '../../types'
import { MyCast } from '../cast-roles/MyCast'

const PROFILE_COLORS = [
  'from-rose-500 to-orange-500',
  'from-emerald-400 to-green-600',
  'from-sky-500 to-blue-700',
  'from-amber-400 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-slate-700 to-black',
]

const MAX = 8

const TIER_PROFILE: Record<Tier, string> = {
  S: '#fb7185',
  A: '#fb923c',
  B: '#d9a92f',
  C: '#84cc16',
  D: '#38bdf8',
}

function particleUnit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function particleRange(seed: number, min: number, max: number) {
  return min + particleUnit(seed) * (max - min)
}

export function ProfileTab() {
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const tiers = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const emojiCategories = useDexieQuery(['emojiCategories'], () => db.emojiCategories.toArray(), [], [])
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('PLAYER ONE')
  const [colorIndex, setColorIndex] = useState(0)

  const top8 = useMemo(
    () =>
      shows
        .filter((s) => typeof s.top8Position === 'number' && s.top8Position >= 0)
        .sort((a, b) => (a.top8Position ?? 0) - (b.top8Position ?? 0)),
    [shows],
  )

  const slots: (Show | null)[] = Array.from({ length: MAX }).map((_, i) => top8[i] ?? null)
  const availableShows = shows.filter((s) => !top8.some((t) => t.id === s.id))
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
                  onRemove={() => void removeAt(index)}
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
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col">
          <div className="flex justify-between items-center px-4 pt-12 pb-4 flex-shrink-0">
            <h2 className="text-3xl font-black text-white tracking-[-0.08em]">Equip</h2>
            <button onClick={() => setSelectingSlot(null)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all" aria-label="Close">
              <X size={22} className="text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {availableShows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
                <Plus size={40} />
                <p className="font-bold uppercase tracking-widest">Collection Empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-4 pb-16">
                {availableShows.map((show) => (
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
        </div>
      )}
    </>
  )
}

function Top8Card({
  show,
  index,
  tier,
  vibes,
  onPick,
  onRemove,
}: {
  show: Show | null
  index: number
  tier?: Tier
  vibes: string[]
  onPick: () => void
  onRemove: () => void
}) {
  const tierColor = tier ? TIER_PROFILE[tier] : '#f5c453'
  const featured = index < 2
  const vibeParticles = show && vibes.length
    ? Array.from({ length: Math.min(9, Math.max(5, vibes.length * 3)) }, (_, particleIndex) => vibes[particleIndex % vibes.length])
    : []

  return (
    <div
      className={cn(
        'aspect-[2/3] rounded-[22px] relative cursor-pointer overflow-hidden transition-transform active:scale-95 group',
        featured && 'col-span-2',
        !show ? 'bg-white/[0.035] hover:bg-white/[0.07] flex items-center justify-center' : '',
      )}
      onClick={show ? onRemove : onPick}
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
          <div className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#f5c453] text-[11px] font-black text-black shadow-[0_0_18px_rgba(245,196,83,0.42)]">
            {index + 1}
          </div>
          {tier && (
            <div
              className="absolute right-2 top-2 grid h-11 min-w-11 place-items-center rounded-[17px] px-3 text-[19px] font-black text-white shadow-[0_14px_28px_rgba(0,0,0,0.46)]"
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${tierColor} 92%, white 8%), ${tierColor})`,
                boxShadow: `0 14px 30px rgba(0,0,0,0.42), 0 0 22px ${tierColor}66, inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.14)`,
              }}
            >
              {tier}
            </div>
          )}
          {vibeParticles.length > 0 && (
            <div className="pointer-events-none absolute bottom-7 right-0 h-32 w-28 overflow-visible">
              {vibeParticles.map((emoji, vibeIndex) => {
                const seed = (show?.id ?? 1) * 97 + index * 53 + vibeIndex * 31 + emoji.codePointAt(0)!
                const originX = particleRange(seed + 1, -4, 18)
                const originY = particleRange(seed + 2, -2, 14)
                const endX = particleRange(seed + 3, -92, -18)
                const endY = particleRange(seed + 4, -126, -48)
                const drift = particleRange(seed + 5, -22, 22)
                const startScale = particleRange(seed + 6, 0.44, 0.74)
                const peakScale = particleRange(seed + 7, 1.08, 1.38)
                const endScale = particleRange(seed + 8, 0.72, 1.12)
                const rotate = particleRange(seed + 9, -28, 28)
                const duration = particleRange(seed + 10, 3.1, 5.9)
                const delay = -particleRange(seed + 11, 0, duration)
                const fontSize = particleRange(seed + 12, 16, 23)
                return (
                <span
                  key={`${emoji}-${vibeIndex}`}
                  className="absolute leading-none"
                  style={{
                    right: `${originX}px`,
                    bottom: `${originY}px`,
                    fontSize: `${fontSize}px`,
                    filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.45))',
                    animation: `vibe-bubble ${duration}s ease-out ${delay}s infinite`,
                    ['--vibe-x']: `${endX}px`,
                    ['--vibe-y']: `${endY}px`,
                    ['--vibe-drift']: `${drift}px`,
                    ['--vibe-start-scale']: startScale,
                    ['--vibe-peak-scale']: peakScale,
                    ['--vibe-end-scale']: endScale,
                    ['--vibe-rotate']: `${rotate}deg`,
                  } as CSSProperties}
                >
                  {emoji}
                </span>
                )
              })}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="line-clamp-2 text-sm font-black leading-[0.95] tracking-[-0.055em] text-white">{show.name}</p>
          </div>
          <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <X size={22} className="text-white" />
          </div>
        </>
      )}
    </div>
  )
}
