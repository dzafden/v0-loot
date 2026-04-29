import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { listCastRoles, deleteCastRole } from '../../data/queries'
import { db } from '../../data/db'
import { imgUrl } from '../../lib/tmdb'
import { cn } from '../../lib/utils'
import type { CastRole, Show } from '../../types'

export function MyCast() {
  const roles = useDexieQuery(['castRoles'], listCastRoles, [], [])
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const showById = new Map<number, Show>(shows.map((s) => [s.id, s]))

  return (
    <div className="px-3 pb-20">
      <p className="text-xs text-white/55 px-1 mt-1 mb-3">
        Characters playing roles in your life.
      </p>
      {!roles.length ? (
        <div className="text-center text-white/55 py-16">
          <div className="text-sm">No characters cast yet. Open a show, find someone, and give them a role.</div>
        </div>
      ) : (
        <motion.div className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {roles.map((r) => (
              <CastRoleCard key={r.id} role={r} show={showById.get(r.showId)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

function CastRoleCard({ role, show }: { role: CastRole; show?: Show }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      className="relative rounded-[20px] bg-[#1a1a24] border border-white/10 overflow-hidden aspect-[2/3]"
    >
      {/* Photo */}
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

      {/* Gradient — heavy at bottom, light at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      {/* Top row: role tag + delete */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
        <span className="rounded-lg bg-amber-300 text-amber-950 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 leading-none max-w-[75%] truncate shadow-lg">
          {role.roleName}
        </span>
        <button
          onClick={() => void deleteCastRole(role.id)}
          className="w-6 h-6 rounded-full bg-black/70 backdrop-blur border border-white/15 flex items-center justify-center text-white/60 hover:bg-red-500 hover:text-white hover:border-transparent transition-all flex-shrink-0"
          aria-label="Remove role"
        >
          <X size={11} />
        </button>
      </div>

      {/* Bottom info — clear 3-level hierarchy */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-8">
        {/* 1. Show attribution — most contextual, accent colour */}
        {show && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {show.posterPath && (
              <img
                src={imgUrl(show.posterPath, 'w185')}
                alt={show.name}
                className="h-4 w-3 rounded-[3px] object-cover flex-shrink-0"
              />
            )}
            <span className={cn(
              'text-[9px] font-black uppercase tracking-widest truncate',
              show.outlineColor ? '' : 'text-[#4ade80]',
            )}
              style={show.outlineColor ? { color: show.outlineColor } : undefined}
            >
              {show.name}
            </span>
          </div>
        )}

        {/* 2. Character name — hero */}
        <p className="font-black text-white text-sm leading-tight uppercase tracking-tight truncate">
          {role.characterName}
        </p>

        {/* 3. Actor name — supporting */}
        <p className="text-[10px] text-zinc-500 font-semibold leading-tight mt-0.5 truncate">
          {role.actorName}
        </p>
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
