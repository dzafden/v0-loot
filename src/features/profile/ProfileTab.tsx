import { useMemo, useState } from 'react'
import { Plus, X, Check, User, Star, Edit3 } from 'lucide-react'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { setTop8 } from '../../data/queries'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { Show } from '../../types'
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

export function ProfileTab() {
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
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

  const level = Math.floor(shows.length / 3) + 1
  const xpPct = ((shows.length % 3) / 3) * 100

  const slots: (Show | null)[] = Array.from({ length: MAX }).map((_, i) => top8[i] ?? null)
  const availableShows = shows.filter((s) => !top8.some((t) => t.id === s.id))

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
      <div className="flex flex-col min-h-full pb-28">
        <div className="sticky top-0 z-30 bg-[#0f0f13]/85 backdrop-blur-xl border-b border-white/5 pt-5 pb-3 px-4" />

        <div className="px-4 pt-4 pb-6">
          <div className="relative mb-6 bg-[#1a1a24] p-5 rounded-[24px] border border-white/10 shadow-xl overflow-hidden">
            <div
              className={cn(
                'absolute top-0 right-0 w-40 h-40 bg-gradient-to-br opacity-20 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none',
                PROFILE_COLORS[colorIndex],
              )}
            />

            <div className="flex items-center gap-4 relative z-10">
              <div
                className={cn(
                  'w-20 h-20 rounded-[20px] bg-gradient-to-tr flex items-center justify-center shadow-lg border-2 border-white/20 flex-shrink-0',
                  PROFILE_COLORS[colorIndex],
                )}
              >
                <User size={36} className="text-white drop-shadow-md" />
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-1 font-black uppercase tracking-tighter text-2xl text-white outline-none focus:border-[#4ade80] mb-1"
                    maxLength={12}
                    autoFocus
                  />
                ) : (
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-none mb-1 truncate">
                    {name}
                  </h2>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-black text-zinc-300 tracking-widest uppercase">
                    Level {level}
                  </span>
                  <span className="text-[10px] font-bold text-[#4ade80] tracking-widest uppercase">
                    {shows.length} Shows
                  </span>
                </div>
                <div className="mt-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4ade80] rounded-full transition-all duration-700" style={{ width: `${xpPct}%` }} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsEditing((v) => !v)}
                className={cn(
                  'p-3 rounded-full transition-colors flex-shrink-0',
                  isEditing ? 'bg-[#4ade80] text-black' : 'bg-white/10 text-white hover:bg-white/20',
                )}
                aria-label={isEditing ? 'Save' : 'Edit profile'}
              >
                {isEditing ? <Check size={18} /> : <Edit3 size={18} />}
              </button>
            </div>

            {isEditing && (
              <div className="mt-5 pt-4 border-t border-white/10">
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

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <h3 className="font-black tracking-widest text-lg uppercase text-white">Loadout</h3>
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Top 8</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {slots.map((show, index) => (
                <div
                  key={index}
                  className={cn(
                    'aspect-[2/3] rounded-[16px] relative cursor-pointer overflow-hidden transition-transform active:scale-95 group',
                    !show ? 'border-2 border-dashed border-white/20 bg-[#1a1a24] hover:bg-white/10 flex items-center justify-center' : '',
                  )}
                  onClick={() => {
                    if (show) {
                      void removeAt(index)
                    } else {
                      setSelectingSlot(index)
                    }
                  }}
                >
                  {!show ? (
                    <Plus size={22} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  ) : (
                    <>
                      {show.posterPath ? (
                        <img src={imgUrl(show.posterPath, 'w342')} alt={show.name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                          {show.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <X size={22} className="text-white" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <section>
            <h3 className="font-black tracking-widest text-lg uppercase text-white mb-2 px-1">Cast Roles</h3>
            <MyCast />
          </section>
        </div>
      </div>

      {selectingSlot !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col">
          <div className="flex justify-between items-center px-4 pt-12 pb-4 flex-shrink-0 border-b border-white/10">
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">Select Show</h2>
            <button onClick={() => setSelectingSlot(null)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all" aria-label="Close">
              <X size={22} className="text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {availableShows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
                <Star size={48} />
                <p className="font-bold uppercase tracking-widest">Collection Empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-4 pb-16">
                {availableShows.map((show) => (
                  <div key={show.id} className="relative group cursor-pointer" onClick={() => void assign(selectingSlot, show)}>
                    <div className="aspect-square rounded-[16px] overflow-hidden border border-white/10 bg-[#1a1a24]">
                      {show.posterPath ? (
                        <img src={imgUrl(show.posterPath, 'w342')} alt={show.name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                          {show.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-tight text-center mt-1 leading-tight line-clamp-2 px-1">{show.name}</p>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[16px] flex items-center justify-center">
                      <Check size={28} className="text-[#4ade80]" />
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
