import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Show } from '../../types'
import { getCredits, imgUrl } from '../../lib/tmdb'
import { createCastRole } from '../../data/queries'

const PRESET_ROLES = ['Best Friend', 'Life Coach', 'Villain I Love', 'Comfort Character']

interface Props {
  show: Show | null
  onClose: () => void
}

export function AssignRoleSheet({ show, onClose }: Props) {
  const [cast, setCast] = useState<{ id: number; name: string; character: string; profile_path: string | null }[]>([])
  const [picked, setPicked] = useState<{ id: number; name: string; character: string; profile_path: string | null } | null>(null)
  const [role, setRole] = useState(PRESET_ROLES[0])
  const [customRole, setCustomRole] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!show) return
    setLoading(true)
    setPicked(null)
    getCredits(show.id)
      .then((d) => setCast(d.cast))
      .finally(() => setLoading(false))
  }, [show])

  const handleAssign = async () => {
    if (!show || !picked) return
    const finalRole = role === '__custom__' ? customRole.trim() : role
    if (!finalRole) return
    await createCastRole({
      roleName: finalRole,
      showId: show.id,
      characterName: picked.character || picked.name,
      actorName: picked.name,
      personId: picked.id,
      profilePath: picked.profile_path,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl bg-zinc-950 border-t border-white/10 flex flex-col"
          >
            <div className="px-4 pt-3 pb-2 sticky top-0">
              <div className="mx-auto h-1 w-10 rounded-full bg-white/15 mb-3" />
              <h2 className="text-lg font-bold">Cast someone from {show.name}</h2>
              <p className="text-xs text-white/55">Pick a character and assign a role.</p>
            </div>
            <div className="px-4 py-2 flex flex-wrap gap-1.5">
              {PRESET_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    role === r ? 'bg-white text-black' : 'bg-white/10 text-white/85'
                  }`}
                >
                  {r}
                </button>
              ))}
              <button
                onClick={() => setRole('__custom__')}
                className={`rounded-full px-3 py-1 text-xs ${
                  role === '__custom__' ? 'bg-white text-black' : 'bg-white/10 text-white/85'
                }`}
              >
                + Custom
              </button>
              {role === '__custom__' && (
                <input
                  autoFocus
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Role name"
                  className="rounded-full bg-white/10 px-3 py-1 text-xs"
                />
              )}
            </div>
            <div className="overflow-y-auto px-3 pb-24 flex-1">
              {loading && <p className="px-2 py-4 text-sm text-white/55">Loading cast…</p>}
              <div className="grid grid-cols-3 gap-2">
                {cast.map((c) => {
                  const isPicked = picked?.id === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setPicked(c)}
                      className={`relative rounded-xl overflow-hidden aspect-[3/4] text-left ${
                        isPicked ? 'ring-2 ring-amber-300' : 'ring-1 ring-white/5'
                      }`}
                    >
                      {c.profile_path ? (
                        <img
                          src={imgUrl(c.profile_path, 'w342')}
                          alt={c.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-zinc-800 grid place-items-center text-2xl">
                          🎬
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 to-transparent">
                        <div className="text-[11px] font-semibold leading-tight line-clamp-1">
                          {c.character || c.name}
                        </div>
                        <div className="text-[10px] opacity-70 line-clamp-1">{c.name}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3 border-t border-white/10 bg-zinc-950/95 backdrop-blur flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full bg-white/10 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!picked || (role === '__custom__' && !customRole.trim())}
                className="flex-1 rounded-full bg-amber-300 text-amber-950 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Cast
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
