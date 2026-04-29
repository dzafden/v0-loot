import { useMemo, useState } from 'react'
import { Package, Search, Filter, Plus } from 'lucide-react'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { db } from '../../data/db'
import { cn } from '../../lib/utils'
import { imgUrl } from '../../lib/tmdb'
import type { Show, Tier } from '../../types'

type TierFilter = 'All' | Tier | 'Unsorted'

interface Props {
  onAddShow: () => void
  onOpenShow: (show: Show) => void
}

const TIER_CHIPS: TierFilter[] = ['All', 'S', 'A', 'B', 'C', 'D', 'Unsorted']

export function Collection({ onAddShow, onOpenShow }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const [activeTier, setActiveTier] = useState<TierFilter>('All')

  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const assignments = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])

  const tierByShowId = useMemo(() => {
    const map = new Map<number, Tier>()
    for (const assignment of assignments) {
      map.set(assignment.showId, assignment.tier)
    }
    return map
  }, [assignments])

  const genres = useMemo(() => {
    const set = new Set(shows.map((show) => show.genres[0] ?? 'Drama'))
    return ['All', ...Array.from(set).sort()]
  }, [shows])

  const filtered = useMemo(() => {
    return shows.filter((show) => {
      const matchesSearch = show.name.toLowerCase().includes(searchQuery.toLowerCase())
      const primaryGenre = show.genres[0] ?? 'Drama'
      const matchesGenre = activeGenre === 'All' || primaryGenre === activeGenre

      const tier = tierByShowId.get(show.id)
      const matchesTier =
        activeTier === 'All' ||
        (activeTier === 'Unsorted' ? !tier : tier === activeTier)

      return matchesSearch && matchesGenre && matchesTier
    })
  }, [shows, searchQuery, activeGenre, activeTier, tierByShowId])

  return (
    <div className="flex flex-col min-h-full pb-28">
      <div className="sticky top-0 z-30 bg-[#0f0f13]/85 backdrop-blur-xl border-b border-white/5 pt-5 pb-3 px-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative group flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#4ade80] transition-colors pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your collection..."
              className="w-full bg-[#1a1a24] border-2 border-white/10 rounded-xl py-2.5 pl-9 pr-4 font-bold text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#4ade80] transition-colors"
            />
          </div>
          <button
            onClick={onAddShow}
            className="h-11 px-3.5 rounded-xl bg-[#4ade80] text-black font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} strokeWidth={3} />
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center justify-center p-2 bg-[#1a1a24] rounded-xl border border-white/10 flex-shrink-0">
          <Filter size={14} className="text-zinc-500" />
        </div>
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            className={cn(
              'px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-150 border-2 flex-shrink-0',
              activeGenre === genre
                ? genre === 'All'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#4ade80] text-black border-[#4ade80]'
                : 'bg-transparent text-zinc-500 border-white/10 hover:border-white/30',
            )}
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-2.5 border-b border-white/5">
        {TIER_CHIPS.map((tier) => (
          <button
            key={tier}
            onClick={() => setActiveTier(tier)}
            className={cn(
              'px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-150 border-2 flex-shrink-0',
              activeTier === tier
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-zinc-500 border-white/10 hover:border-white/30',
            )}
          >
            {tier}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pt-4 pb-6">
        {shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 bg-[#1a1a24] rounded-3xl border border-white/5 mt-4">
            <Package size={56} strokeWidth={1.5} className="mb-4 text-zinc-500" />
            <p className="font-black tracking-widest text-lg uppercase text-white">Collection Empty</p>
            <p className="font-bold text-xs uppercase tracking-widest text-zinc-500 mt-2">Go discover some shows</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Search size={40} className="mb-4 text-zinc-500" />
            <p className="font-black tracking-widest text-sm uppercase">No matches found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 pb-8">
            {filtered.map((show) => (
              <button
                key={show.id}
                onClick={() => onOpenShow(show)}
                className="aspect-[2/3] rounded-[20px] overflow-hidden border border-white/10 bg-[#1a1a24] relative text-left"
              >
                {show.posterPath ? (
                  <img
                    src={imgUrl(show.posterPath, 'w342')}
                    alt={show.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                    {show.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-3">
                  <p className="font-black text-white text-xs uppercase tracking-tight line-clamp-2 leading-tight">
                    {show.name}
                  </p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    {show.year ?? '—'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
