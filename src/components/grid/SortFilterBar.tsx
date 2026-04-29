import { motion, AnimatePresence } from 'framer-motion'
import type { Collection, EmojiCategory, Tier } from '../../types'
import { IconClose } from '../ui/Icon'

export type SortKey = 'alpha' | 'recent' | 'watched' | 'tier'

export interface FilterState {
  emojiId?: string | null
  collectionId?: string | null
  tier?: Tier | null
  search?: string
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Recently added' },
  { id: 'alpha', label: 'A → Z' },
  { id: 'watched', label: 'Most watched' },
  { id: 'tier', label: 'Tier rank' },
]

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D']

interface Props {
  open: boolean
  onClose: () => void
  sort: SortKey
  filter: FilterState
  emojiCategories: EmojiCategory[]
  collections: Collection[]
  onSort: (s: SortKey) => void
  onFilter: (f: FilterState) => void
}

export function SortFilterSheet({
  open,
  onClose,
  sort,
  filter,
  emojiCategories,
  collections,
  onSort,
  onFilter,
}: Props) {
  const clear = () => onFilter({ search: filter.search })
  const activeCount =
    (filter.emojiId ? 1 : 0) +
    (filter.collectionId ? 1 : 0) +
    (filter.tier ? 1 : 0)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-3xl bg-zinc-950 border-t border-white/10 overflow-hidden flex flex-col"
          >
            <div className="px-5 pt-3 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="mx-auto h-1 w-10 rounded-full bg-white/15 absolute left-1/2 -translate-x-1/2 top-2" />
                <h2 className="text-lg font-bold mt-2">Sort &amp; filter</h2>
              </div>
              <button onClick={onClose} className="text-white/60 mt-2">
                <IconClose />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-8">
              <SectionLabel>Sort by</SectionLabel>
              <div className="flex flex-col gap-1">
                {SORTS.map((s) => (
                  <Row
                    key={s.id}
                    active={sort === s.id}
                    onClick={() => onSort(s.id)}
                  >
                    {s.label}
                  </Row>
                ))}
              </div>

              <SectionLabel>Tier</SectionLabel>
              <div className="flex gap-2">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      onFilter({ ...filter, tier: filter.tier === t ? null : t })
                    }
                    className={`flex-1 h-10 rounded-xl font-black tracking-wider ${
                      filter.tier === t
                        ? `text-black`
                        : 'bg-white/[0.04] text-white/70 border border-white/10'
                    }`}
                    style={
                      filter.tier === t
                        ? { background: tierColor(t) }
                        : undefined
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>

              {emojiCategories.length > 0 && (
                <>
                  <SectionLabel>Vibe</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {emojiCategories.map((c) => {
                      const active = filter.emojiId === c.id
                      return (
                        <button
                          key={c.id}
                          onClick={() =>
                            onFilter({
                              ...filter,
                              emojiId: active ? null : c.id,
                            })
                          }
                          className={`rounded-xl px-3 h-10 flex items-center gap-2 text-sm border ${
                            active
                              ? 'bg-white text-black border-white'
                              : 'bg-white/[0.04] border-white/10'
                          }`}
                        >
                          <span className="text-lg leading-none">{c.emoji}</span>
                          {c.label && <span>{c.label}</span>}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {collections.length > 0 && (
                <>
                  <SectionLabel>Collection</SectionLabel>
                  <div className="flex flex-col gap-1">
                    {collections.map((c) => (
                      <Row
                        key={c.id}
                        active={filter.collectionId === c.id}
                        onClick={() =>
                          onFilter({
                            ...filter,
                            collectionId:
                              filter.collectionId === c.id ? null : c.id,
                          })
                        }
                      >
                        {c.name}
                        <span className="text-xs text-white/45 ml-auto">
                          {c.showIds.length}
                        </span>
                      </Row>
                    ))}
                  </div>
                </>
              )}

              {activeCount > 0 && (
                <button
                  onClick={clear}
                  className="mt-6 w-full rounded-xl bg-white/[0.06] py-3 text-sm font-semibold text-white/85"
                >
                  Clear filters
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function tierColor(t: Tier) {
  return {
    S: '#ff4d4d',
    A: '#ff9f4a',
    B: '#ffd84a',
    C: '#7ed957',
    D: '#4a90ff',
  }[t]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 mb-2 text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold">
      {children}
    </div>
  )
}

function Row({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 h-11 text-sm text-left ${
        active
          ? 'bg-white text-black font-semibold'
          : 'bg-white/[0.04] text-white/85 hover:bg-white/[0.07]'
      }`}
    >
      {children}
    </button>
  )
}
