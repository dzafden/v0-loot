import { useState } from 'react'
import { ChevronLeft, Check } from 'lucide-react'
import { getCredits, imgUrl } from '../../lib/tmdb'
import { createCastRole } from '../../data/queries'
import { cn } from '../../lib/utils'
import type { Show } from '../../types'
import { useEffect } from 'react'
import { FullScreenOverlayShell, PickerTopBar } from '../../components/ui/FullScreenPickerShell'

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
    <FullScreenOverlayShell>
      <PickerTopBar
        onClose={onClose}
        left={onBack ? (
          <button
            onClick={onBack}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-white/20 active:scale-95"
          >
            <ChevronLeft size={14} /> Back
          </button>
        ) : null}
      />

      {/* Role selector */}
      <div className="shrink-0 px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PRESET_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.14em] transition-colors',
                role === r
                  ? 'bg-[#f5c453] text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/15',
              )}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setRole('__custom__')}
            className={cn(
              'h-9 shrink-0 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.14em] transition-colors',
              role === '__custom__'
                ? 'bg-[#f5c453] text-black'
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
            className="mt-3 h-12 w-full rounded-full bg-white/[0.07] px-4 text-xs font-black uppercase tracking-widest text-white outline-none ring-1 ring-white/[0.07] transition-colors placeholder:text-white/24 focus:ring-[#f5c453]/50"
          />
        )}
      </div>

      {/* Character grid */}
      <div className="flex-1 overflow-y-auto">
        {castLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#f5c453] border-t-transparent rounded-full animate-spin" />
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
                      ? 'border-[#f5c453] shadow-[0_0_0_2px_rgba(245,196,83,0.32)]'
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
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#f5c453] flex items-center justify-center">
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
          className="w-full h-12 rounded-2xl bg-[#f5c453] text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-transform"
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
    </FullScreenOverlayShell>
  )
}
