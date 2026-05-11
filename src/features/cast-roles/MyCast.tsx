import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronLeft, Search } from 'lucide-react'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { listCastRoles, deleteCastRole } from '../../data/queries'
import { db } from '../../data/db'
import { imgUrl } from '../../lib/tmdb'
import type { CastRole, Show } from '../../types'
import { CharacterRolePicker } from './CharacterRolePicker'
import { FullScreenOverlayShell, PickerTopBar } from '../../components/ui/FullScreenPickerShell'

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
    <div className="pb-20">
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
              className="aspect-[2/3] rounded-[20px] border border-dashed border-white/18 bg-white/[0.035] hover:bg-white/[0.06] hover:border-white/30 transition-colors flex items-center justify-center group"
            >
              <Plus size={22} className="text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
            <div className="mt-2">
              <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-white/20">
                Add character
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
  const [query, setQuery] = useState('')
  const filteredShows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return shows
    return shows.filter((show) => {
      const searchable = [
        show.name,
        show.year?.toString(),
        ...(show.genres ?? []),
        ...(show.rawGenres ?? []),
      ].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(normalized)
    })
  }, [query, shows])

  return (
    <FullScreenOverlayShell>
      <PickerTopBar onClose={onClose} />
      {shows.length > 0 && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/34" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a show"
              className="h-12 w-full rounded-full bg-white/[0.075] pl-11 pr-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.08] placeholder:text-white/28 focus:ring-[#f5c453]/50"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {shows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
            <p className="font-bold uppercase tracking-widest text-sm">No shows in collection</p>
          </div>
        ) : filteredShows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
            <Search size={36} />
            <p className="font-bold uppercase tracking-widest text-sm">No matches</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 p-4 pb-16">
            {filteredShows.map((show) => (
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
    </FullScreenOverlayShell>
  )
}

// ── Cast role card ────────────────────────────────────────────────────────────

function CastRoleCard({ role, show }: { role: CastRole; show?: Show }) {
  const accentColor = show?.outlineColor ?? '#f5c453'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      className="flex flex-col"
    >
      <div
        className="relative overflow-hidden rounded-[20px] bg-[#1a1a24] aspect-[2/3] shadow-[0_16px_34px_rgba(0,0,0,0.34)]"
        style={{ boxShadow: `0 16px 34px rgba(0,0,0,0.34), inset 0 0 0 1px ${accentColor}4a, 0 0 18px ${accentColor}1f` }}
      >
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/22 to-transparent" />

        <div className="absolute top-2 left-2 max-w-[calc(100%-44px)]">
          <span
            className="block truncate rounded-full bg-black/54 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-md ring-1 ring-white/[0.08]"
            style={{ color: accentColor }}
          >
            {role.roleName}
          </span>
        </div>

        <div className="absolute top-2 right-2">
          <button
            onClick={() => void deleteCastRole(role.id)}
            className="w-6 h-6 rounded-full bg-black/62 backdrop-blur border border-white/15 flex items-center justify-center text-white/60 hover:bg-red-500 hover:text-white hover:border-transparent transition-all"
            aria-label="Remove role"
          >
            <X size={11} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-8">
          <p className="font-black text-white text-[13px] leading-[0.94] tracking-[-0.045em] line-clamp-2">
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
                className="text-[9px] font-bold truncate text-white/45"
              >
                {show.name}
              </span>
            </div>
          )}
        </div>
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
