'use client'

import { useState, useEffect } from 'react'
import { Search, X, Flame, TrendingUp, Star, ChevronRight, Zap } from 'lucide-react'
import useSWR from 'swr'
import { LootShow, RARITIES } from '@/lib/loot'
import { getBackdropUrl, getPosterUrl } from '@/lib/tmdb'
import { ShowCard } from '@/components/show-card'
import { cn } from '@/lib/utils'

interface ShopScreenProps {
  ownedIds: number[]
  onAdd: (id: number) => void
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Tab = 'trending' | 'top' | 'popular'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'top', label: 'Top Rated', icon: Star },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
]

function HeroCard({ show, isOwned, onAdd }: { show: LootShow; isOwned: boolean; onAdd: (id: number) => void }) {
  const rarity = RARITIES[show.rarity]
  const backdrop = getBackdropUrl(show.backdropPath, 'w1280')
  const poster = getPosterUrl(show.posterPath, 'w342')

  return (
    <div className={cn(
      'relative w-full overflow-hidden rounded-3xl border border-white/10',
      rarity.glow,
      show.rarity === 'legendary' && 'legendary-pulse'
    )} style={{ aspectRatio: '16/9' }}>
      {/* Background */}
      {backdrop ? (
        <img src={backdrop} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
      ) : (
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm" aria-hidden />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className={cn('absolute inset-0 bg-gradient-to-r to-transparent opacity-40', rarity.gradient)} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 gap-3">
        <div className="flex items-end gap-3">
          <img
            src={poster}
            alt={show.title}
            className={cn('w-16 h-24 object-cover rounded-xl border-2 flex-shrink-0', rarity.border)}
          />
          <div className="flex-1 min-w-0">
            <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest mb-1.5', rarity.badge)}>
              <Zap size={9} />
              {rarity.name}
            </div>
            <h2 className="font-black text-white text-xl leading-tight uppercase tracking-tight text-balance line-clamp-2">
              {show.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                {show.year} &bull; {show.genre}
              </span>
              <div className="flex items-center gap-1">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[11px] font-black text-yellow-400">{show.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => !isOwned && onAdd(show.id)}
          className={cn(
            'w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-200',
            isOwned
              ? 'bg-white/10 text-white/50 cursor-default'
              : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-98 shadow-lg'
          )}
          disabled={isOwned}
        >
          {isOwned ? 'In Collection' : '+ Claim Show'}
        </button>
      </div>
    </div>
  )
}

function SearchModal({ onClose, onAdd, ownedIds }: {
  onClose: () => void
  onAdd: (id: number) => void
  ownedIds: number[]
}) {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data, isLoading } = useSWR(
    debouncedQ ? `/api/search?q=${encodeURIComponent(debouncedQ)}` : null,
    fetcher
  )

  const results: LootShow[] = data?.results ?? []

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center gap-3 p-4 pt-6 border-b border-white/10">
        <Search size={20} className="text-zinc-400 flex-shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search any show..."
          className="flex-1 bg-transparent text-white text-lg font-bold placeholder:text-zinc-600 outline-none uppercase tracking-tight"
        />
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all flex-shrink-0">
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!isLoading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Search size={48} className="mb-3 opacity-40" />
            <p className="font-black uppercase tracking-widest">No results found</p>
          </div>
        )}
        {!isLoading && !query && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Search size={48} className="mb-3 opacity-30" />
            <p className="font-black uppercase tracking-widest text-sm">Type to search</p>
          </div>
        )}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {results.map(show => (
              <ShowCard
                key={show.id}
                show={show}
                isOwned={ownedIds.includes(show.id)}
                onAdd={onAdd}
                actionType="add"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ShopScreen({ ownedIds, onAdd }: ShopScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('trending')
  const [searchOpen, setSearchOpen] = useState(false)

  const { data, isLoading } = useSWR('/api/trending', fetcher)

  const tabShows: Record<Tab, LootShow[]> = {
    trending: data?.trending ?? [],
    top: data?.topRated ?? [],
    popular: data?.popular ?? [],
  }

  const shows = tabShows[activeTab]
  const hero = shows[0]
  const grid = shows.slice(1)

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-10 pb-4">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
              LOOT
            </h1>
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5">
              Drop Season Active
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-surface-raised px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <span className="font-black text-sm text-white">{ownedIds.length}</span>
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 bg-surface-raised border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
              aria-label="Search shows"
            >
              <Search size={16} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 mb-4">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary-glow)]'
                    : 'bg-surface-raised text-zinc-500 border border-white/10 hover:text-white'
                )}
              >
                <Icon size={11} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-6 flex flex-col gap-6">
          {isLoading ? (
            <>
              {/* Skeleton hero */}
              <div className="w-full rounded-3xl bg-surface-raised animate-pulse" style={{ aspectRatio: '16/9' }} />
              {/* Skeleton grid */}
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-surface-raised animate-pulse" />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Hero card */}
              {hero && (
                <HeroCard show={hero} isOwned={ownedIds.includes(hero.id)} onAdd={onAdd} />
              )}

              {/* Section label */}
              <div className="flex items-center justify-between">
                <h2 className="font-black text-white uppercase tracking-tight text-lg">
                  {activeTab === 'trending' ? 'This Week' : activeTab === 'top' ? 'All Time' : 'Most Watched'}
                </h2>
                <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                  {grid.length} Shows <ChevronRight size={12} />
                </span>
              </div>

              {/* Masonry-style grid */}
              <div className="grid grid-cols-2 gap-4">
                {grid.map((show, i) => (
                  <div key={show.id} className={cn(i === 0 ? 'col-span-2' : '')}>
                    {i === 0 ? (
                      /* Wide featured card */
                      <div className="grid grid-cols-2 gap-4">
                        <ShowCard show={show} isOwned={ownedIds.includes(show.id)} onAdd={onAdd} />
                        {grid[1] && (
                          <ShowCard show={grid[1]} isOwned={ownedIds.includes(grid[1].id)} onAdd={onAdd} />
                        )}
                      </div>
                    ) : i === 1 ? null : (
                      <ShowCard show={show} isOwned={ownedIds.includes(show.id)} onAdd={onAdd} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onAdd={onAdd}
          ownedIds={ownedIds}
        />
      )}
    </>
  )
}
