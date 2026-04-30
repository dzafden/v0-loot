import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronLeft, Check } from 'lucide-react'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { listCastRoles, deleteCastRole, createCastRole } from '../../data/queries'
import { db } from '../../data/db'
import { getCredits, imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { CastRole, Show } from '../../types'

const MAX_ROSTER = 8

const PRESET_ROLES = [
  'Best Friend',
  'Role Model',
  'Comfort Character',
  'Villain I Love',
  'The Mentor',
  'Hype Man',
  'Situationship',
  'Main Character',
]

// ── Main component ────────────────────────────────────────────────────────────

export function MyCast() {
  const roles = useDexieQuery(['castRoles'], listCastRoles, [], [])
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const showById = new Map<number, Show>(shows.map((s) => [s.id, s]))

  const [pickerOpen, setPickerOpen] = useState(false)

  // filled slots + 1 empty "add" slot (if not at max)
  const showAddSlot = roles.length < MAX_ROSTER

  return (
    <div className="px-3 pb-20">
      {!roles.length && !showAddSlot ? null : (
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
                onClick={() => setPickerOpen(true)}
                className="aspect-[2/3] rounded-[20px] border-2 border-dashed border-white/20 bg-[#1a1a24] hover:bg-white/[0.06] hover:border-white/30 transition-colors flex items-center justify-center group"
              >
                <Plus size={22} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </button>
              {/* Keep vertical rhythm consistent with filled cards */}
              <div className="mt-2 pl-2 border-l-2 border-white/10">
                <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-white/20">
                  Add member
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {pickerOpen && (
        <RosterPicker
          shows={shows}
          existingRoles={roles}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

// ── Roster picker — two steps ─────────────────────────────────────────────────

type CastMember = { id: number; name: string; character: string; profile_path: string | null }

function RosterPicker({
  shows,
  existingRoles,
  onClose,
}: {
  shows: Show[]
  existingRoles: CastRole[]
  onClose: () => void
}) {
  const [step, setStep] = useState<'show' | 'character'>('show')
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)
  const [cast, setCast] = useState<CastMember[]>([])
  const [castLoading, setCastLoading] = useState(false)
  const [picked, setPicked] = useState<CastMember | null>(null)
  const [role, setRole] = useState(PRESET_ROLES[0])
  const [customRole, setCustomRole] = useState('')
  const [saving, setSaving] = useState(false)

  const existingPersonIds = new Set(existingRoles.map((r) => r.personId).filter(Boolean))

  const selectShow = async (show: Show) => {
    setSelectedShow(show)
    setStep('character')
    setPicked(null)
    setCastLoading(true)
    try {
      const data = await getCredits(show.id)
      setCast(data.cast)
    } catch {
      setCast([])
    } finally {
      setCastLoading(false)
    }
  }

  const goBack = () => {
    setStep('show')
    setSelectedShow(null)
    setCast([])
    setPicked(null)
  }

  const handleCast = async () => {
    if (!selectedShow || !picked) return
    const finalRole = role === '__custom__' ? customRole.trim() : role
    if (!finalRole) return
    setSaving(true)
    try {
      await createCastRole({
        roleName: finalRole,
        showId: selectedShow.id,
        characterName: picked.character || picked.name,
        actorName: picked.name,
        personId: picked.id,
        profilePath: picked.profile_path,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canCast = picked && (role !== '__custom__' || customRole.trim())

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-12 pb-4 flex-shrink-0 border-b border-white/10">
        {step === 'character' ? (
          <button
            onClick={goBack}
            className="h-9 px-3 rounded-xl bg-white/10 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5"
          >
            <ChevronLeft size={14} /> Back
          </button>
        ) : (
          <div className="w-20" />
        )}

        <h2 className="text-sm font-black uppercase tracking-widest text-white">
          {step === 'show' ? 'Pick a Show' : selectedShow?.name}
        </h2>

        <button
          onClick={onClose}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all"
          aria-label="Close"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      {/* Step 1 — show grid */}
      {step === 'show' && (
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
                  onClick={() => void selectShow(show)}
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
                    <Plus size={24} className="text-white" strokeWidth={3} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — character + role */}
      {step === 'character' && (
        <>
          {/* Role selector */}
          <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Assign a role</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    'h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors',
                    role === r
                      ? 'bg-[#4ade80] text-black'
                      : 'bg-white/10 text-white/60 hover:bg-white/15',
                  )}
                >
                  {r}
                </button>
              ))}
              <button
                onClick={() => setRole('__custom__')}
                className={cn(
                  'h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors',
                  role === '__custom__'
                    ? 'bg-[#4ade80] text-black'
                    : 'bg-white/10 text-white/60 hover:bg-white/15',
                )}
              >
                Custom
              </button>
            </div>
            {role === '__custom__' && (
              <input
                autoFocus
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value.toUpperCase())}
                placeholder="ROLE NAME"
                className="mt-2 w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest text-white placeholder:text-zinc-600 outline-none focus:border-[#4ade80] transition-colors"
              />
            )}
          </div>

          {/* Character grid */}
          <div className="flex-1 overflow-y-auto">
            {castLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cast.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 opacity-50">
                <p className="font-bold uppercase tracking-widest text-sm">No cast found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-4 pb-32">
                {cast.map((c) => {
                  const isPicked = picked?.id === c.id
                  const alreadyCast = existingPersonIds.has(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => !alreadyCast && setPicked(isPicked ? null : c)}
                      disabled={alreadyCast}
                      className={cn(
                        'relative aspect-[2/3] rounded-[16px] overflow-hidden border transition-all active:scale-95',
                        isPicked ? 'border-[#4ade80] shadow-[0_0_0_2px_#4ade8066]' : 'border-white/10',
                        alreadyCast ? 'opacity-40' : '',
                      )}
                    >
                      {c.profile_path ? (
                        <img
                          src={imgUrl(c.profile_path, 'w342')}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1a1a24] grid place-items-center text-zinc-500 font-black text-lg">
                          {(c.character || c.name).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-2">
                        <div className="font-black text-white text-[10px] leading-tight line-clamp-2">
                          {c.character || c.name}
                        </div>
                      </div>
                      {isPicked && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#4ade80] flex items-center justify-center">
                          <Check size={11} strokeWidth={3} className="text-black" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cast button */}
          <div className="absolute inset-x-0 bottom-0 p-4 border-t border-white/10 bg-black/80 backdrop-blur-xl">
            <button
              onClick={() => void handleCast()}
              disabled={!canCast || saving}
              className="w-full h-12 rounded-2xl bg-[#4ade80] text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-transform"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  {picked
                    ? `Cast ${picked.character || picked.name}`
                    : 'Select a character'}
                </>
              )}
            </button>
          </div>
        </>
      )}
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
