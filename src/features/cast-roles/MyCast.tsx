import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronLeft } from 'lucide-react'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { listCastRoles, deleteCastRole } from '../../data/queries'
import { db } from '../../data/db'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { CastRole, Show } from '../../types'
import { CharacterRolePicker } from './CharacterRolePicker'

const MAX_ROSTER = 8

// ── Main component ────────────────────────────────────────────────────────────

export function MyCast() {
  const roles = useDexieQuery(['castRoles'], listCastRoles, [], [])
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const showById = new Map<number, Show>(shows.map((s) => [s.id, s]))

  const existingPersonIds = useMemo(
    () => new Set(roles.map((r) => r.personId).filter((id): id is number => id != null)),
    [roles],
  )

  const [pickerStep, setPickerStep] = useState<'closed' | 'show' | 'character'>('closed')
  const [pickerShow, setPickerShow] = useState<Show | null>(null)

  const openPicker = () => setPickerStep('show')
  const closePicker = () => { setPickerStep('closed'); setPickerShow(null) }

  const selectShow = (show: Show) => {
    setPickerShow(show)
    setPickerStep('character')
  }

  const showAddSlot = roles.length < MAX_ROSTER

  return (
    <div className="px-3 pb-20">
      <motion.div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <AnimatePresence>
          {roles.map((r) => (
            <CastRoleCard key={r.id} role={r} show={showById.get(r.showId)} />
          ))}
        </AnimatePresence>

        {showAddSlot && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col"
          >
            <button
              onClick={openPicker}
              className="aspect-[2/3] rounded-[20px] border-2 border-dashed border-white/20 bg-[#1a1a24] hover:bg-white/[0.06] hover:border-white/30 transition-colors flex items-center justify-center group"
            >
              <Plus size={22} className="text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
            <div className="mt-2 pl-2 border-l-2 border-white/10">
              <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-white/20">
                Add member
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Step 1 — show picker */}
      {pickerStep === 'show' && (
        <ShowPickerOverlay
          shows={shows}
          onSelect={selectShow}
          onClose={closePicker}
        />
      )}

      {/* Step 2 — character + role (shared component) */}
      {pickerStep === 'character' && pickerShow && (
        <CharacterRolePicker
          show={pickerShow}
          existingPersonIds={existingPersonIds}
          onClose={closePicker}
          onBack={() => setPickerStep('show')}
        />
      )}
    </div>
  )
}

// ── Show picker overlay ───────────────────────────────────────────────────────

function ShowPickerOverlay({
  shows,
  onSelect,
  onClose,
}: {
  shows: Show[]
  onSelect: (show: Show) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col">
      <div className="flex justify-between items-center px-4 pt-12 pb-4 flex-shrink-0 border-b border-white/10">
        <div className="w-20" />
        <h2 className="text-sm font-black uppercase tracking-widest text-white">Pick a Show</h2>
        <button
          onClick={onClose}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all"
          aria-label="Close"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {shows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
            <p className="font-bold uppercase tracking-widest text-sm">No shows in collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 p-4 pb-16">
            {shows.map((show) => (
              <button
                key={show.id}
                onClick={() => onSelect(show)}
                className="relative group aspect-[2/3] rounded-[16px] overflow-hidden border border-white/10 bg-[#1a1a24] active:scale-95 transition-transform"
              >
                {show.posterPath ? (
                  <img
                    src={imgUrl(show.posterPath, 'w342')}
                    alt={show.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                    {show.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                  <ChevronLeft size={24} className="text-white rotate-180" strokeWidth={3} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cast role card ────────────────────────────────────────────────────────────

function CastRoleCard({ role, show }: { role: CastRole; show?: Show }) {
  const accentColor = show?.outlineColor ?? '#4ade80'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      className="flex flex-col"
    >
      <div className="relative rounded-[20px] bg-[#1a1a24] border border-white/10 overflow-hidden aspect-[2/3]">
        <div className="absolute inset-0">
          {role.profilePath ? (
            <img
              src={imgUrl(role.profilePath, 'w342')}
              alt={role.characterName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Placeholder name={role.characterName} accent={show?.outlineColor} />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <div className="absolute top-2 right-2">
          <button
            onClick={() => void deleteCastRole(role.id)}
            className="w-6 h-6 rounded-full bg-black/70 backdrop-blur border border-white/15 flex items-center justify-center text-white/60 hover:bg-red-500 hover:text-white hover:border-transparent transition-all"
            aria-label="Remove role"
          >
            <X size={11} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-8">
          <p className="font-black text-white text-[11px] leading-tight line-clamp-2">
            {role.characterName}
          </p>
          {show && (
            <div className="flex items-center gap-1 mt-1">
              {show.posterPath && (
                <img
                  src={imgUrl(show.posterPath, 'w185')}
                  alt={show.name}
                  className="h-3.5 w-2.5 rounded-[2px] object-cover flex-shrink-0"
                />
              )}
              <span
                className={cn('text-[9px] font-bold truncate', show.outlineColor ? '' : 'text-[#4ade80]')}
                style={show.outlineColor ? { color: show.outlineColor } : undefined}
              >
                {show.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 pl-2" style={{ borderLeft: `2px solid ${accentColor}` }}>
        <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-white/70 leading-tight line-clamp-1">
          {role.roleName}
        </span>
      </div>
    </motion.div>
  )
}

function Placeholder({ name, accent }: { name: string; accent?: string }) {
  return (
    <div
      className="h-full w-full grid place-items-center"
      style={{
        background: `radial-gradient(closest-side, ${accent ?? '#444'}88, #11121a 75%)`,
      }}
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-white/25" fill="currentColor">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3 0-9 1.5-9 5v3h18v-3c0-3.5-6-5-9-5Z" />
      </svg>
      <span className="absolute bottom-2 text-[10px] uppercase tracking-wider text-white/40">
        {name.split(' ')[0]}
      </span>
    </div>
  )
}
