'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronRight, Plus, Check, X } from 'lucide-react'
import useSWR from 'swr'
import { LootShow } from '@/lib/loot'
import { getPosterUrl, getBackdropUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface DiscoverScreenProps {
  ownedIds: number[]
  onAdd: (id: number) => void
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ── Portrait card (2:3) ───────────────────────────────────────────────────────
function PortraitCard({ show, isOwned, onAdd }: { show: LootShow; isOwned: boolean; onAdd: (id: number) => void }) {
  const [flashing, setFlashing] = useState(false)
  const poster = getPosterUrl(show.posterPath, 'w342')

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isOwned) {
      setFlashing(true)
      setTimeout(() => setFlashing(false), 400)
      onAdd(show.id)
    }
  }

  return (
    <div className={cn(
      'relative group cursor-pointer flex-shrink-0 snap-center rounded-[20px] overflow-hidden border border-white/10 bg-[#1a1a24] shadow-lg transition-transform duration-150 active:scale-95',
      'w-[130px] aspect-[2/3]',
      flashing && 'animate-pulse'
    )}>
      {/* Shine sweep */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20 overflow-hidden rounded-[20px]">
        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:translate-x-[500%] transition-transform duration-700" />
      </div>

      <img
        src={poster || '/placeholder-poster.jpg'}
        alt={show.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Add button */}
      <button
        onClick={handleAdd}
        className={cn(
          'absolute top-2 right-2 z-30 w-8 h-8 rounded-lg font-black transition-all duration-200 flex items-center justify-center shadow-lg',
          isOwned
            ? 'bg-black/60 text-white cursor-default backdrop-blur-md border border-white/10'
            : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95'
        )}
        aria-label={isOwned ? 'In collection' : 'Add to collection'}
      >
        {isOwned ? <Check size={14} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
      </button>
    </div>
  )
}

// ── Landscape card (16:9) ─────────────────────────────────────────────────────
function LandscapeCard({ show, isOwned, onAdd }: { show: LootShow; isOwned: boolean; onAdd: (id: number) => void }) {
  const [flashing, setFlashing] = useState(false)
  const backdrop = getBackdropUrl(show.backdropPath, 'w780')
  const poster = getPosterUrl(show.posterPath, 'w342')

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isOwned) {
      setFlashing(true)
      setTimeout(() => setFlashing(false), 400)
      onAdd(show.id)
    }
  }

  return (
    <div className={cn(
      'relative group cursor-pointer flex-shrink-0 snap-center rounded-[20px] overflow-hidden border border-white/10 bg-[#1a1a24] shadow-lg transition-transform duration-150 active:scale-95',
      'w-[280px] aspect-[16/9]',
      flashing && 'animate-pulse'
    )}>
      {/* Shine sweep */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20 overflow-hidden rounded-[20px]">
        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:translate-x-[500%] transition-transform duration-700" />
      </div>

      <img
        src={backdrop || poster || '/placeholder-poster.jpg'}
        alt={show.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Add button */}
      <button
        onClick={handleAdd}
        className={cn(
          'absolute top-3 right-3 z-30 w-9 h-9 rounded-xl font-black transition-all duration-200 flex items-center justify-center shadow-lg',
          isOwned
            ? 'bg-black/60 text-white cursor-default backdrop-blur-md border border-white/10'
            : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95'
        )}
        aria-label={isOwned ? 'In collection' : 'Add to collection'}
      >
        {isOwned ? <Check size={16} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
      </button>

      {/* Title */}
      <div className="absolute bottom-0 inset-x-0 p-4 z-10 pointer-events-none">
        <h3 className="font-black text-white text-base leading-tight uppercase tracking-tight truncate">{show.title}</h3>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 block truncate">
          {show.year} &bull; {show.genre}
        </span>
      </div>
    </div>
  )
}

// ── Carousel row ──────────────────────────────────────────────────────────────
function CarouselRow({
  title,
  shows,
  ownedIds,
  onAdd,
  landscape = false,
}: {
  title: string
  shows: LootShow[]
  ownedIds: number[]
  onAdd: (id: number) => void
  landscape?: boolean
}) {
  if (shows.length === 0) return null
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-black tracking-widest text-sm uppercase text-white">{title}</h2>
        <ChevronRight size={18} className="text-zinc-600" />
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 px-4">
        {shows.map(show =>
          landscape
            ? <LandscapeCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} onAdd={onAdd} />
            : <PortraitCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} onAdd={onAdd} />
        )}
      </div>
    </div>
  )
}

// ── Search results ────────────────────────────────────────────────────────────
function SearchResults({ query, ownedIds, onAdd }: { query: string; ownedIds: number[]; onAdd: (id: number) => void }) {
  const [debouncedQ, setDebouncedQ] = useState(query)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data, isLoading } = useSWR(
    debouncedQ ? `/api/search?q=${encodeURIComponent(debouncedQ)}` : null,
    fetcher
  )
  const results: LootShow[] = data?.results ?? []

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (results.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-40 px-4">
      <Search size={40} className="mb-3 text-zinc-500" />
      <p className="font-black uppercase tracking-widest text-sm">No Results</p>
    </div>
  )

  return (
    <div className="px-4 pb-8">
      <p className="text-[11px] font-black text-zinc-600 uppercase tracking-widest mb-4">
        {results.length} results
      </p>
      <div className="grid grid-cols-2 gap-4">
        {results.map(show => (
          <PortraitCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} onAdd={onAdd} />
        ))}
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function DiscoverScreen({ ownedIds, onAdd }: DiscoverScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useSWR('/api/trending', fetcher)

  const trending: LootShow[] = data?.trending ?? []
  const topRated: LootShow[] = data?.topRated ?? []
  const popular: LootShow[] = data?.popular ?? []
  const airingToday: LootShow[] = data?.airingToday ?? []
  const crime: LootShow[] = data?.crime ?? []
  const scifi: LootShow[] = data?.scifi ?? []
  const netflix: LootShow[] = data?.netflix ?? []
  const hbo: LootShow[] = data?.hbo ?? []

  // Split popular into loose "genre" rows using the first genre word from each show
  const animation = popular.filter(s => s.genre?.toLowerCase().includes('animation'))
  const drama = topRated.filter(s => s.genre?.toLowerCase().includes('drama'))

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header with search */}
      <div className="sticky top-0 z-30 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5 pt-10 pb-4 px-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Discover</h1>
        </div>
        <div className="relative group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for shows..."
            className="w-full bg-[#1a1a24] border-2 border-white/10 rounded-xl py-2.5 pl-9 pr-9 font-bold text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pt-4">
        {searchQuery ? (
          <SearchResults query={searchQuery} ownedIds={ownedIds} onAdd={onAdd} />
        ) : isLoading ? (
          <div className="px-4 flex flex-col gap-8">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-4 w-32 bg-surface-raised rounded animate-pulse mb-3" />
                <div className="flex gap-3 overflow-hidden">
                  {[1, 2, 3].map(j => (
                    <div key={j} className={cn(
                      'flex-shrink-0 rounded-[20px] bg-surface-raised animate-pulse',
                      i === 1 ? 'w-[280px] aspect-[16/9]' : 'w-[130px] aspect-[2/3]'
                    )} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <CarouselRow
              title="Recommended for You"
              shows={trending.slice(0, 6)}
              ownedIds={ownedIds}
              onAdd={onAdd}
              landscape
            />
            <CarouselRow
              title="Trending Now"
              shows={trending}
              ownedIds={ownedIds}
              onAdd={onAdd}
            />
            {animation.length > 0 && (
              <CarouselRow
                title="Animation"
                shows={animation}
                ownedIds={ownedIds}
                onAdd={onAdd}
              />
            )}
            {drama.length > 0 && (
              <CarouselRow
                title="Drama"
                shows={drama}
                ownedIds={ownedIds}
                onAdd={onAdd}
              />
            )}
            <CarouselRow
              title="Top Rated"
              shows={topRated}
              ownedIds={ownedIds}
              onAdd={onAdd}
            />
          </>
        )}
      </div>
    </div>
  )
}
