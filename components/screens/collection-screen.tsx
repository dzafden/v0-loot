'use client'

import { useState, useMemo } from 'react'
import { Package, Search, Filter } from 'lucide-react'
import { LootShow } from '@/lib/loot'
import { getPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface CollectionScreenProps {
  allShows: LootShow[]
  ownedIds: number[]
}

export function CollectionScreen({ allShows, ownedIds }: CollectionScreenProps) {
  const ownedShows = allShows.filter(s => ownedIds.includes(s.id))
  const [searchQuery, setSearchQuery]   = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const genres = useMemo(() => {
    const set = new Set(ownedShows.map(s => s.genre).filter(Boolean))
    return Array.from(set).sort()
  }, [ownedShows])

  const filtered = useMemo(() => {
    return ownedShows.filter(show => {
      const matchesSearch = show.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = activeFilter === 'All' || show.genre === activeFilter
      return matchesSearch && matchesFilter
    })
  }, [ownedShows, searchQuery, activeFilter])

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5 pt-10 pb-4 px-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Collection</h1>
        </div>
        <div className="relative group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search your collection..."
            className="w-full bg-[#1a1a24] border-2 border-white/10 rounded-xl py-2.5 pl-9 pr-4 font-bold text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Genre filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-center p-2 bg-[#1a1a24] rounded-xl border border-white/10 flex-shrink-0">
          <Filter size={14} className="text-zinc-500" />
        </div>
        {['All', ...genres].map(genre => (
          <button
            key={genre}
            onClick={() => setActiveFilter(genre)}
            className={cn(
              'px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-150 border-2 flex-shrink-0',
              activeFilter === genre
                ? genre === 'All'
                  ? 'bg-white text-black border-white'
                  : 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-zinc-500 border-white/10 hover:border-white/30'
            )}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 p-4">
        {ownedShows.length === 0 ? (
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
          <div className="grid grid-cols-2 gap-4 pb-8">
            {filtered.map(show => {
              const poster = getPosterUrl(show.posterPath, 'w342')
              return (
                <div key={show.id} className="aspect-[2/3] rounded-[20px] overflow-hidden border border-white/10 bg-[#1a1a24] relative">
                  <img
                    src={poster || '/placeholder-poster.jpg'}
                    alt={show.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <p className="font-black text-white text-xs uppercase tracking-tight line-clamp-2 leading-tight">{show.title}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{show.year}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
