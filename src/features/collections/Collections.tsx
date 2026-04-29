import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { db } from '../../data/db'
import {
  addToCollection,
  createCollection,
  deleteCollection,
  removeFromCollection,
  renameCollection,
} from '../../data/queries'
import type { Collection, Show } from '../../types'
import { LootGrid } from '../../components/grid/LootGrid'
import { imgUrl } from '../../lib/tmdb'

export function CollectionsList({ onOpen }: { onOpen: (id: string) => void }) {
  const collections = useDexieQuery(['collections'], () => db.collections.toArray(), [], [])
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const showById = new Map<number, Show>(shows.map((s) => [s.id, s]))
  const [name, setName] = useState('')

  return (
    <div className="px-3 pb-20">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          void createCollection(name.trim())
          setName('')
        }}
        className="flex gap-2 mb-3"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New collection name"
          className="flex-1 rounded-full bg-white/8 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <button className="rounded-full bg-white text-black px-4 text-sm font-semibold">
          Create
        </button>
      </form>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        <AnimatePresence>
          {collections.map((c) => (
            <CollectionRow
              key={c.id}
              c={c}
              previewShows={c.showIds.slice(0, 4).map((id) => showById.get(id)).filter(Boolean) as Show[]}
              onOpen={() => onOpen(c.id)}
            />
          ))}
        </AnimatePresence>
      </div>
      {!collections.length && (
        <p className="text-center text-sm text-white/55 py-12">
          Make a collection to group shows however you want — by mood, by year, by binge plan.
        </p>
      )}
    </div>
  )
}

function CollectionRow({
  c,
  previewShows,
  onOpen,
}: {
  c: Collection
  previewShows: Show[]
  onOpen: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(c.name)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex items-center gap-3"
    >
      <button onClick={onOpen} className="flex flex-1 items-center gap-3 text-left">
        <div className="flex -space-x-3">
          {previewShows.length ? (
            previewShows.map((s) => (
              <div
                key={s.id}
                className="h-12 w-9 rounded-md overflow-hidden ring-2 ring-zinc-900 bg-zinc-800"
              >
                {s.posterPath && (
                  <img src={imgUrl(s.posterPath, 'w185')} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            ))
          ) : (
            <div className="h-12 w-9 rounded-md bg-white/10 grid place-items-center text-lg">
              📁
            </div>
          )}
        </div>
        <div className="flex-1">
          {editing ? (
            <input
              autoFocus
              value={name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setEditing(false)
                if (name.trim() && name !== c.name) void renameCollection(c.id, name.trim())
              }}
              className="bg-transparent border-b border-white/30 outline-none text-sm font-semibold w-full"
            />
          ) : (
            <div className="text-sm font-semibold">{c.name}</div>
          )}
          <div className="text-[11px] text-white/55">
            {c.showIds.length} {c.showIds.length === 1 ? 'show' : 'shows'}
          </div>
        </div>
      </button>
      <button
        onClick={() => setEditing((v) => !v)}
        className="text-xs text-white/55 hover:text-white"
      >
        ✎
      </button>
      <button
        onClick={() => {
          if (confirm(`Delete "${c.name}"?`)) void deleteCollection(c.id)
        }}
        className="text-xs text-rose-300/80 hover:text-rose-300"
      >
        ✕
      </button>
    </motion.div>
  )
}

export function CollectionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const collection = useDexieQuery(['collections'], () => db.collections.get(id), undefined, [id])
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const filtered = (collection?.showIds ?? [])
    .map((sid) => shows.find((s) => s.id === sid))
    .filter(Boolean) as Show[]
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-20 px-3 pt-3 pb-2 bg-[#0b0b0f]/85 backdrop-blur flex items-center gap-2">
        <button
          onClick={onBack}
          className="grid place-items-center h-10 w-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/85"
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">{collection?.name ?? '…'}</h1>
      </header>
      <LootGrid shows={filtered} />
    </div>
  )
}

export function AddToCollectionSheet({
  show,
  onClose,
}: {
  show: Show | null
  onClose: () => void
}) {
  const collections = useDexieQuery(['collections'], () => db.collections.toArray(), [], [])
  const [creating, setCreating] = useState('')
  if (!show) return null
  return (
    <AnimatePresence>
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
          className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 flex flex-col"
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-white/15 mb-3" />
          <h2 className="text-lg font-bold mb-3">Add "{show.name}" to…</h2>
          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {collections.map((c) => {
              const has = c.showIds.includes(show.id)
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (has) void removeFromCollection(c.id, show.id)
                    else void addToCollection(c.id, show.id)
                  }}
                  className="flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2.5 text-sm"
                >
                  <span>📁 {c.name}</span>
                  <span className={`text-xs ${has ? 'text-emerald-300' : 'text-white/40'}`}>
                    {has ? '✓ Added' : 'Add'}
                  </span>
                </button>
              )
            })}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!creating.trim()) return
              const c = await createCollection(creating.trim())
              await addToCollection(c.id, show.id)
              setCreating('')
            }}
            className="flex gap-2 mt-3"
          >
            <input
              value={creating}
              onChange={(e) => setCreating(e.target.value)}
              placeholder="New collection"
              className="flex-1 rounded-full bg-white/8 px-3 py-2 text-sm"
            />
            <button className="rounded-full bg-white text-black px-4 text-sm font-semibold">
              Create + Add
            </button>
          </form>
          <button onClick={onClose} className="mt-3 rounded-full bg-white/10 py-2 text-sm">
            Done
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
