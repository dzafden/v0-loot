import { useMemo, useState } from 'react'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { db } from '../../data/db'
import type { Collection, EmojiCategory, Show, Tier } from '../../types'
import { LootGrid } from '../../components/grid/LootGrid'
import { SortFilterSheet, type FilterState, type SortKey } from '../../components/grid/SortFilterBar'
import { progressMap, tierMap, setTop8 } from '../../data/queries'
import { CardContextMenu, type ContextAction } from '../../components/card/CardContextMenu'
import { IconFilter, IconMenu, IconPlus, IconSearch, IconStar } from '../../components/ui/Icon'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onOpenShow: (show: Show) => void
  onAddCollection: (show: Show) => void
  onAddEmoji: (show: Show) => void
  onAssignRole: (show: Show) => void
  onTrackEpisodes: (show: Show) => void
  onTier: () => void
  onTop8: () => void
  onAddShow: () => void
  onOpenMenu: () => void
}

export function Library({
  onOpenShow,
  onAddCollection,
  onAddEmoji,
  onAssignRole,
  onTrackEpisodes,
  onTier,
  onTop8,
  onAddShow,
  onOpenMenu,
}: Props) {
  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const collections = useDexieQuery<Collection[]>(
    ['collections'],
    () => db.collections.toArray(),
    [],
    [],
  )
  const emojiCategories = useDexieQuery<EmojiCategory[]>(
    ['emojiCategories'],
    () => db.emojiCategories.toArray(),
    [],
    [],
  )
  const tiers = useDexieQuery<Map<number, Tier>>(['tierAssignments'], tierMap, new Map(), [])
  const progress = useDexieQuery(['episodeProgress', 'seasonCache'], progressMap, new Map(), [])

  const [sort, setSort] = useState<SortKey>('recent')
  const [filter, setFilter] = useState<FilterState>({})
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [ctx, setCtx] = useState<{ show: Show; anchor: { x: number; y: number } } | null>(null)

  const top8 = shows
    .filter((s) => typeof s.top8Position === 'number' && s.top8Position! >= 0)
    .sort((a, b) => a.top8Position! - b.top8Position!)

  const emojiByShow = useMemo(() => {
    const m = new Map<number, EmojiCategory[]>()
    for (const c of emojiCategories) {
      for (const sid of c.showIds) {
        const arr = m.get(sid) ?? []
        arr.push(c)
        m.set(sid, arr)
      }
    }
    return m
  }, [emojiCategories])

  const filtered = useMemo(() => {
    let out = shows
    if (filter.search) {
      const q = filter.search.toLowerCase()
      out = out.filter((s) => s.name.toLowerCase().includes(q))
    }
    if (filter.emojiId) {
      const cat = emojiCategories.find((c) => c.id === filter.emojiId)
      const set = new Set(cat?.showIds ?? [])
      out = out.filter((s) => set.has(s.id))
    }
    if (filter.collectionId) {
      const col = collections.find((c) => c.id === filter.collectionId)
      const set = new Set(col?.showIds ?? [])
      out = out.filter((s) => set.has(s.id))
    }
    if (filter.tier) {
      out = out.filter((s) => tiers.get(s.id) === filter.tier)
    }
    out = [...out]
    if (sort === 'alpha') out.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'recent') out.sort((a, b) => b.addedAt - a.addedAt)
    if (sort === 'watched') {
      out.sort((a, b) => {
        const ap = progress.get(a.id)
        const bp = progress.get(b.id)
        return (bp?.watched ?? 0) - (ap?.watched ?? 0)
      })
    }
    if (sort === 'tier') {
      const order: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 }
      out.sort(
        (a, b) =>
          (order[tiers.get(a.id) ?? 'Z'] ?? 99) -
          (order[tiers.get(b.id) ?? 'Z'] ?? 99),
      )
    }
    return out
  }, [shows, filter, sort, emojiCategories, collections, tiers, progress])

  const actions: ContextAction[] = ctx
    ? [
        {
          id: 'top8',
          label: top8.some((s) => s.id === ctx.show.id) ? 'Remove from Top 8' : 'Add to Top 8',
          onSelect: async (s) => {
            if (top8.some((x) => x.id === s.id)) await setTop8(s.id, null)
            else {
              try {
                await setTop8(s.id, top8.length)
              } catch (e) {
                alert((e as Error).message)
              }
            }
          },
        },
        { id: 'open-top8', label: 'Open Top 8 page', onSelect: () => onTop8() },
        { id: 'col', label: 'Add to collection', onSelect: onAddCollection },
        { id: 'emoji', label: 'Tag with emoji', onSelect: onAddEmoji },
        { id: 'tier', label: 'Open tier game', onSelect: () => onTier() },
        { id: 'eps', label: 'Track episodes', onSelect: onTrackEpisodes },
        { id: 'cast', label: 'Cast a role', onSelect: onAssignRole },
      ]
    : []

  const filterActive =
    !!filter.emojiId || !!filter.collectionId || !!filter.tier || sort !== 'recent'

  return (
    <div className="pb-10">
      {/* sticky header */}
      <header className="sticky top-0 z-20 px-3 pt-3 pb-2 bg-[#0b0b0f]/85 backdrop-blur">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight flex-1">Loot</h1>
          <IconBtn onClick={() => setSearchOpen((v) => !v)} active={searchOpen}>
            <IconSearch size={20} />
          </IconBtn>
          <IconBtn onClick={() => setFilterOpen(true)} active={filterActive}>
            <IconFilter size={20} />
          </IconBtn>
          <IconBtn onClick={onAddShow} primary>
            <IconPlus size={22} />
          </IconBtn>
          <IconBtn onClick={onOpenMenu}>
            <IconMenu size={20} />
          </IconBtn>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 pb-1">
                <input
                  autoFocus
                  type="search"
                  value={filter.search ?? ''}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  placeholder="Search your collection"
                  className="w-full rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {shows.length === 0 ? (
        <EmptyState onAdd={onAddShow} />
      ) : (
        <LootGrid
          shows={filtered}
          emojiByShow={emojiByShow as never}
          progressByShow={progress}
          tierByShow={tiers}
          onTap={onOpenShow}
          onLongPress={(show, anchor) => setCtx({ show, anchor })}
        />
      )}

      <SortFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sort={sort}
        filter={filter}
        emojiCategories={emojiCategories}
        collections={collections}
        onSort={setSort}
        onFilter={setFilter}
      />

      <CardContextMenu
        show={ctx?.show ?? null}
        anchor={ctx?.anchor ?? null}
        actions={actions}
        onClose={() => setCtx(null)}
      />
    </div>
  )
}

function IconBtn({
  onClick,
  children,
  primary,
  active,
}: {
  onClick: () => void
  children: React.ReactNode
  primary?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`grid place-items-center h-10 w-10 rounded-xl transition-colors ${
        primary
          ? 'bg-amber-300 text-amber-950 shadow-glow-sm'
          : active
            ? 'bg-white text-black'
            : 'bg-white/[0.06] text-white/85 hover:bg-white/[0.1]'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-6 pt-24 flex flex-col items-center text-center">
      <motion.div
        initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        className="relative mb-6"
      >
        <div className="h-32 w-24 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] grid place-items-center">
          <IconStar size={28} className="text-white/30" />
        </div>
      </motion.div>
      <h2 className="text-xl font-extrabold tracking-tight">Your collection is empty</h2>
      <p className="mt-2 text-sm text-white/55 max-w-[260px]">
        Drop your first show to start the inventory.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 rounded-xl bg-amber-300 text-amber-950 px-5 h-11 text-sm font-bold inline-flex items-center gap-2 shadow-glow-sm"
      >
        <IconPlus size={18} />
        Add a show
      </button>
    </div>
  )
}
