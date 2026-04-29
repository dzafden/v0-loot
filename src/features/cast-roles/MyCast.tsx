import { motion, AnimatePresence } from 'framer-motion'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { listCastRoles, deleteCastRole } from '../../data/queries'
import { db } from '../../data/db'
import { imgUrl } from '../../lib/tmdb'
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
        <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
      className="relative rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden aspect-[3/4]"
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
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
      />
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
        <span className="rounded-full bg-amber-300 text-amber-950 text-[11px] font-bold px-2 py-0.5">
          {role.roleName}
        </span>
        <button
          onClick={() => void deleteCastRole(role.id)}
          className="rounded-full bg-black/55 backdrop-blur text-white/85 text-[10px] px-1.5 py-0.5"
          aria-label="Remove role"
        >
          ✕
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="text-sm font-semibold leading-tight">{role.characterName}</div>
        <div className="text-[11px] opacity-70">{role.actorName}</div>
        {show && (
          <div className="mt-2 flex items-center gap-1.5">
            {show.posterPath && (
              <img
                src={imgUrl(show.posterPath, 'w185')}
                alt={show.name}
                className="h-6 w-4 rounded-sm object-cover"
              />
            )}
            <span className="text-[11px] opacity-80 truncate">{show.name}</span>
          </div>
        )}
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
