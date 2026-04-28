'use client'

import { useState } from 'react'
import { Trophy, Plus, X, Check, User, Zap, Star, Shield } from 'lucide-react'
import { LootShow, RARITIES, Rarity } from '@/lib/loot'
import { ShowCard } from '@/components/show-card'
import { getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface ProfileScreenProps {
  ownedShows: LootShow[]
  top8: (number | null)[]
  onSetTop8: (index: number, showId: number | null) => void
}

function SlotPickerModal({
  shows,
  onSelect,
  onClose,
}: {
  shows: LootShow[]
  onSelect: (id: number) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center p-4 pt-6 border-b border-white/10">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Pick a Show</h2>
        <button
          onClick={onClose}
          className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all"
          aria-label="Close picker"
        >
          <X size={22} className="text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <Star size={48} className="text-zinc-500" />
            <p className="font-black uppercase tracking-widest text-white">No Shows in Collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {shows.map(show => (
              <div
                key={show.id}
                className="relative group cursor-pointer"
                onClick={() => onSelect(show.id)}
              >
                <ShowCard show={show} compact actionType="none" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                  <Check size={28} className="text-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBadge({ label, value, icon: Icon, color }: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-surface-raised rounded-2xl p-3 border border-white/10 flex-1">
      <Icon size={16} className={color} />
      <span className={cn('font-black text-xl leading-none', color)}>{value}</span>
      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
    </div>
  )
}

export function ProfileScreen({ ownedShows, top8, onSetTop8 }: ProfileScreenProps) {
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null)

  const level = Math.floor(ownedShows.length / 3) + 1
  const xpPct = ((ownedShows.length % 3) / 3) * 100

  const counts: Record<Rarity, number> = { legendary: 0, epic: 0, rare: 0, common: 0 }
  ownedShows.forEach(s => counts[s.rarity]++)

  const avgRating = ownedShows.length
    ? (ownedShows.reduce((acc, s) => acc + s.rating, 0) / ownedShows.length).toFixed(1)
    : '—'

  const topRarity: Rarity =
    counts.legendary > 0 ? 'legendary' :
    counts.epic > 0 ? 'epic' :
    counts.rare > 0 ? 'rare' : 'common'

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="px-4 pt-10 pb-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none mb-6">
            Profile
          </h1>

          {/* Player card */}
          <div className="relative bg-surface-raised rounded-3xl border border-white/10 overflow-hidden mb-4">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-primary/5 pointer-events-none" />

            <div className="relative p-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.45)]">
                  <User size={36} className="text-white" />
                </div>
                {/* Level badge */}
                <div className="absolute -bottom-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                  {level}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-black text-white text-2xl uppercase tracking-tight leading-none">Player One</h2>
                <div className={cn('text-[11px] font-black uppercase tracking-widest mt-0.5', RARITIES[topRarity].text)}>
                  {RARITIES[topRarity].name} Collector
                </div>

                {/* XP bar */}
                <div className="mt-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Level {level}</span>
                    <span className="text-[10px] font-black text-zinc-600">{ownedShows.length % 3}/3 XP</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3">
            <StatBadge label="Collected" value={ownedShows.length} icon={Trophy} color="text-primary" />
            <StatBadge label="Legendary" value={counts.legendary} icon={Zap} color="text-yellow-400" />
            <StatBadge label="Avg Rating" value={avgRating} icon={Star} color="text-blue-400" />
            <StatBadge label="Level" value={level} icon={Shield} color="text-purple-400" />
          </div>
        </div>

        {/* Top 8 */}
        <div className="px-4 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-yellow-400" />
            <h2 className="font-black text-white uppercase tracking-tight text-lg">My Top 8</h2>
            <span className="text-[11px] font-black text-zinc-600 ml-auto">
              {top8.filter(Boolean).length}/8 filled
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {top8.map((showId, index) => {
              const show = showId ? ownedShows.find(s => s.id === showId) : null
              return (
                <div
                  key={index}
                  className={cn(
                    'aspect-square rounded-2xl relative cursor-pointer overflow-hidden transition-all active:scale-95 group',
                    !show && 'border-2 border-dashed border-white/15 bg-surface-raised hover:bg-surface-overlay hover:border-white/30'
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <Plus size={22} className="text-white/25 group-hover:text-white/60 transition-colors" />
                      <span className="text-[9px] font-black text-white/15 uppercase tracking-widest">#{index + 1}</span>
                    </div>
                  ) : (
                    <>
                      <ShowCard show={show} compact actionType="none" />
                      {/* Rank badge */}
                      <div className="absolute top-1 left-1 z-30 w-5 h-5 rounded-md bg-black/80 flex items-center justify-center">
                        <span className="text-[9px] font-black text-white">#{index + 1}</span>
                      </div>
                      <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center z-20">
                        <X size={20} className="text-white" />
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {top8.every(s => s === null) && ownedShows.length > 0 && (
            <p className="text-center text-zinc-600 text-[11px] font-bold uppercase tracking-widest mt-4">
              Tap a slot to fill it with a show
            </p>
          )}

          {ownedShows.length === 0 && (
            <p className="text-center text-zinc-600 text-[11px] font-bold uppercase tracking-widest mt-4">
              Claim shows from the Shop to fill your Top 8
            </p>
          )}
        </div>
      </div>

      {selectingSlot !== null && (
        <SlotPickerModal
          shows={ownedShows}
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
