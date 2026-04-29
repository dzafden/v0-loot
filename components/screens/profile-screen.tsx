'use client'

import { useState } from 'react'
import { Plus, X, Check, User, Star, Edit3, Palette } from 'lucide-react'
import { LootShow } from '@/lib/loot'
import { getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface ProfileScreenProps {
  ownedShows: LootShow[]
  top8: (number | null)[]
  onSetTop8: (index: number, showId: number | null) => void
}

const PROFILE_COLORS = [
  'from-purple-500 to-blue-500',
  'from-rose-500 to-orange-500',
  'from-green-400 to-emerald-600',
  'from-yellow-400 to-amber-600',
  'from-pink-500 to-rose-500',
  'from-slate-700 to-black',
]

// ── Slot picker modal ──────────────────────────────────────────────────────────

function SelectionModal({
  shows,
  onSelect,
  onClose,
}: {
  shows: LootShow[]
  onSelect: (id: number) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-12 pb-4 flex-shrink-0 border-b border-white/10">
        <h2 className="text-2xl font-black text-white tracking-widest uppercase">Select Show</h2>
        <button
          onClick={onClose}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all"
          aria-label="Close"
        >
          <X size={22} className="text-white" />
        </button>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto">
        {shows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
            <Star size={48} />
            <p className="font-bold uppercase tracking-widest">Collection Empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 p-4 pb-16">
            {shows.map(show => {
              const poster = getPosterUrl(show.posterPath, 'w342')
              return (
                <div
                  key={show.id}
                  className="relative group cursor-pointer"
                  onClick={() => onSelect(show.id)}
                >
                  <div className="aspect-square rounded-[16px] overflow-hidden border border-white/10 bg-[#1a1a24]">
                    <img
                      src={poster || '/placeholder-poster.jpg'}
                      alt={show.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-tight text-center mt-1 leading-tight line-clamp-2 px-1">
                    {show.title}
                  </p>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[16px] flex items-center justify-center">
                    <Check size={28} className="text-primary" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ProfileScreen({ ownedShows, top8, onSetTop8 }: ProfileScreenProps) {
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('PLAYER ONE')
  const [colorIndex, setColorIndex] = useState(0)

  const level = Math.floor(ownedShows.length / 3) + 1
  const xpPct = ((ownedShows.length % 3) / 3) * 100

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5 pt-10 pb-4 px-4">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">My Profile</h1>
        </div>

        <div className="p-4">
          {/* Player identity card */}
          <div className="relative mb-6 bg-[#1a1a24] p-5 rounded-[24px] border border-white/10 shadow-xl overflow-hidden">
            {/* Background glow */}
            <div className={cn(
              'absolute top-0 right-0 w-40 h-40 bg-gradient-to-br opacity-20 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none',
              PROFILE_COLORS[colorIndex]
            )} />

            <div className="flex items-center gap-4 relative z-10">
              {/* Avatar */}
              <div className={cn(
                'w-20 h-20 rounded-[20px] bg-gradient-to-tr flex items-center justify-center shadow-lg border-2 border-white/20 flex-shrink-0',
                PROFILE_COLORS[colorIndex]
              )}>
                <User size={36} className="text-white drop-shadow-md" />
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value.toUpperCase())}
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-1 font-black uppercase tracking-tighter text-2xl text-white outline-none focus:border-primary mb-1"
                    maxLength={12}
                    autoFocus
                  />
                ) : (
                  <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none mb-1 truncate">{name}</h1>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-black text-zinc-300 tracking-widest uppercase">
                    Level {level}
                  </span>
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                    {ownedShows.length} Shows
                  </span>
                </div>
                {/* XP bar */}
                <div className="mt-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(v => !v)}
                className={cn(
                  'p-3 rounded-full transition-colors flex-shrink-0',
                  isEditing ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white hover:bg-white/20'
                )}
                aria-label={isEditing ? 'Save' : 'Edit profile'}
              >
                {isEditing ? <Check size={18} /> : <Edit3 size={18} />}
              </button>
            </div>

            {/* Color picker (edit mode) */}
            {isEditing && (
              <div className="mt-5 pt-4 border-t border-white/10 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <Palette size={13} className="text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Banner Color</span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {PROFILE_COLORS.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => setColorIndex(idx)}
                      className={cn(
                        'w-10 h-10 rounded-xl flex-shrink-0 bg-gradient-to-tr border-2 transition-transform active:scale-90',
                        color,
                        colorIndex === idx ? 'border-white scale-110' : 'border-transparent opacity-50'
                      )}
                      aria-label={`Color ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loadout (Top 8) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <h2 className="font-black tracking-widest text-lg uppercase text-white">Loadout</h2>
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Top 8</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {top8.map((showId, index) => {
                const show = showId ? ownedShows.find(s => s.id === showId) : null
                const poster = show ? getPosterUrl(show.posterPath, 'w342') : null
                return (
                  <div
                    key={index}
                    className={cn(
                      'aspect-square rounded-[16px] relative cursor-pointer overflow-hidden transition-transform active:scale-95 group',
                      !show
                        ? 'border-2 border-dashed border-white/20 bg-[#1a1a24] hover:bg-white/10 flex items-center justify-center'
                        : ''
                    )}
                    onClick={() => {
                      if (show) {
                        onSetTop8(index, null)
                      } else {
                        setSelectingSlot(index)
                      }
                    }}
                  >
                    {!show ? (
                      <Plus size={22} className="text-white/30 group-hover:text-white/60 transition-colors" />
                    ) : (
                      <>
                        <img
                          src={poster || '/placeholder-poster.jpg'}
                          alt={show.title}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <X size={22} className="text-white" />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {top8.every(s => s === null) && ownedShows.length > 0 && (
              <p className="text-center text-zinc-600 text-[11px] font-bold uppercase tracking-widest mt-4">
                Tap a slot to add a show to your loadout
              </p>
            )}
            {ownedShows.length === 0 && (
              <p className="text-center text-zinc-600 text-[11px] font-bold uppercase tracking-widest mt-4">
                Claim shows from Discover to fill your loadout
              </p>
            )}
          </div>
        </div>
      </div>

      {selectingSlot !== null && (
        <SelectionModal
          shows={ownedShows.filter(s => !top8.includes(s.id))}  // ← exclude already-slotted
          onSelect={(id) => {
            onSetTop8(selectingSlot, id)
            setSelectingSlot(null)
          }}
          onClose={() => setSelectingSlot(null)}
        />
      )}
    </>
  )
}
