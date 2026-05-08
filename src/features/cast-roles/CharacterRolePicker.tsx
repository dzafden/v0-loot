import { useState } from 'react'
import { X, ChevronLeft, Check } from 'lucide-react'
import { getCredits, imgUrl } from '../../lib/tmdb'
import { createCastRole } from '../../data/queries'
import { cn } from '../../lib/utils'
import type { Show } from '../../types'
import { useEffect } from 'react'

export type CastMember = {
  id: number
  name: string
  character: string
  profile_path: string | null
}

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

interface Props {
  show: Show
  existingPersonIds?: Set<number>
  initialPersonId?: number | null
  onClose: () => void
  onBack?: () => void // present only in multi-step flows (e.g. roster picker)
}

export function CharacterRolePicker({ show, existingPersonIds = new Set(), initialPersonId = null, onClose, onBack }: Props) {
  const [cast, setCast] = useState<CastMember[]>([])
  const [castLoading, setCastLoading] = useState(false)
  const [picked, setPicked] = useState<CastMember | null>(null)
  const [role, setRole] = useState(PRESET_ROLES[0])
  const [customRole, setCustomRole] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setCastLoading(true)
    setPicked(null)
    getCredits(show.id)
      .then((d) => {
        if (cancelled) return
        setCast(d.cast)
        const initialPick = initialPersonId
          ? d.cast.find((member) => member.id === initialPersonId && !existingPersonIds.has(member.id))
          : null
        if (initialPick) setPicked(initialPick)
      })
      .catch(() => {
        if (!cancelled) setCast([])
      })
      .finally(() => {
        if (!cancelled) setCastLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [show.id, initialPersonId, existingPersonIds])

  const canCast = picked && (role !== '__custom__' || customRole.trim())

  const handleCast = async () => {
    if (!canCast) return
    const finalRole = role === '__custom__' ? customRole.trim() : role
    setSaving(true)
    try {
      await createCastRole({
        roleName: finalRole,
        showId: show.id,
        characterName: picked!.character || picked!.name,
        actorName: picked!.name,
        personId: picked!.id,
        profilePath: picked!.profile_path,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-12 pb-4 flex-shrink-0 border-b border-white/10">
        {onBack ? (
          <button
            onClick={onBack}
            className="h-9 px-3 rounded-xl bg-white/10 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5"
          >
            <ChevronLeft size={14} /> Back
          </button>
        ) : (
          <div className="w-20" />
        )}

        <h2 className="text-sm font-black uppercase tracking-widest text-white truncate max-w-[160px]">
          {show.name}
        </h2>

        <button
          onClick={onClose}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all"
          aria-label="Close"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

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
                    isPicked
                      ? 'border-[#4ade80] shadow-[0_0_0_2px_#4ade8066]'
                      : 'border-white/10',
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
              {picked ? `Cast ${picked.character || picked.name}` : 'Select a character'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
