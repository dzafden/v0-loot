import { useEffect, useMemo, useState } from 'react'
import { Package, Search, Filter, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { db } from '../../data/db'
import { cn } from '../../lib/utils'
import { getShowImages, hasTmdbKey, imgUrl } from '../../lib/tmdb'
import type { Show, Tier } from '../../types'

type TierFilter = 'All' | Tier | 'Unsorted'

type LogoAsset = { file_path: string; vote_average?: number; iso_639_1?: string | null }

interface Props {
  onAddShow: () => void
  onOpenShow: (show: Show) => void
}

const TIER_CHIPS: TierFilter[] = ['S', 'A', 'B', 'C', 'D', 'Unsorted']
const logoCache = new Map<number, string | null>()

function bestLogo(items: LogoAsset[] = []) {
  return [...items]
    .filter((item) => item.iso_639_1 === 'en' || item.iso_639_1 === null)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]?.file_path ?? null
}

export function Collection({ onAddShow, onOpenShow }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const [activeTier, setActiveTier] = useState<TierFilter>('All')
  const [focusedId, setFocusedId] = useState<number | null>(null)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const assignments = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])

  const tierByShowId = useMemo(() => {
    const map = new Map<number, Tier>()
    for (const assignment of assignments) map.set(assignment.showId, assignment.tier)
    return map
  }, [assignments])

  const genres = useMemo(() => {
    const set = new Set(shows.map((show) => show.genres[0]).filter(Boolean) as string[])
    return ['All', ...Array.from(set).sort()]
  }, [shows])

  const filtered = useMemo(() => {
    return shows.filter((show) => {
      const matchesSearch = show.name.toLowerCase().includes(searchQuery.toLowerCase())
      const primaryGenre = show.genres[0] ?? 'Drama'
      const matchesGenre = activeGenre === 'All' || primaryGenre === activeGenre
      const tier = tierByShowId.get(show.id)
      const matchesTier = activeTier === 'All' || (activeTier === 'Unsorted' ? !tier : tier === activeTier)
      return matchesSearch && matchesGenre && matchesTier
    })
  }, [shows, searchQuery, activeGenre, activeTier, tierByShowId])

  const top8 = useMemo(
    () =>
      shows
        .filter((show) => typeof show.top8Position === 'number' && show.top8Position >= 0)
        .sort((a, b) => (a.top8Position ?? 99) - (b.top8Position ?? 99)),
    [shows],
  )

  const focusedShow = useMemo(
    () => filtered.find((show) => show.id === focusedId) ?? top8[0] ?? filtered[0] ?? shows[0],
    [filtered, focusedId, shows, top8],
  )

  useEffect(() => {
    if (!filtered.length) {
      setFocusedId(null)
      return
    }
    setFocusedId((current) => (filtered.some((show) => show.id === current) ? current : filtered[0].id))
  }, [filtered])

  useEffect(() => {
    if (filtered.length <= 1) return
    const timer = window.setInterval(() => {
      setFocusedId((current) => {
        const index = filtered.findIndex((show) => show.id === current)
        const nextIndex = index < 0 ? 0 : (index + 1) % filtered.length
        return filtered[nextIndex]?.id ?? current
      })
    }, 5200)
    return () => window.clearInterval(timer)
  }, [filtered])

  useEffect(() => {
    if (!focusedShow || !hasTmdbKey()) {
      setLogoPath(null)
      return
    }
    const cached = logoCache.get(focusedShow.id)
    if (cached !== undefined) {
      setLogoPath(cached)
      return
    }
    let cancelled = false
    getShowImages(focusedShow.id)
      .then((images) => {
        const logo = bestLogo(images.logos)
        logoCache.set(focusedShow.id, logo)
        if (!cancelled) setLogoPath(logo)
      })
      .catch(() => {
        logoCache.set(focusedShow.id, null)
        if (!cancelled) setLogoPath(null)
      })
    return () => {
      cancelled = true
    }
  }, [focusedShow])

  return (
    <div className="relative flex flex-col min-h-full pb-28 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_20%_0%,rgba(245,196,83,0.13),transparent_20rem)]" aria-hidden />

      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-5 pointer-events-none">
        <button
          onClick={() => setSearchOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-full bg-black/34 text-white/78 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.38)] border border-white/[0.08] pointer-events-auto active:scale-95"
          aria-label="Search"
        >
          <Search size={18} />
        </button>
        <button
          onClick={onAddShow}
          className="grid h-11 w-11 place-items-center rounded-full bg-[#f5c453] text-black shadow-[0_0_24px_rgba(245,196,83,0.28)] pointer-events-auto active:scale-95"
          aria-label="Add show"
        >
          <Plus size={17} strokeWidth={3} />
        </button>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-16 right-16 top-5 z-40"
          >
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-full bg-black/58 px-4 text-sm font-bold text-white placeholder:text-white/34 outline-none ring-1 ring-white/[0.09] backdrop-blur-2xl focus:ring-[#f5c453]/55"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {focusedShow && (
        <section className="relative z-10 -mx-4 -mt-1 mb-2 h-[370px] overflow-hidden bg-black shadow-[0_28px_90px_rgba(0,0,0,0.72)]">
          <AnimatePresence mode="wait">
            {focusedShow.backdropPath || focusedShow.posterPath ? (
              <motion.img
                key={focusedShow.id}
                initial={{ opacity: 0, scale: 1.055, filter: 'blur(14px)' }}
                animate={{ opacity: 0.84, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.025, filter: 'blur(10px)' }}
                transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
                src={imgUrl(focusedShow.backdropPath ?? focusedShow.posterPath, focusedShow.backdropPath ? 'original' : 'w500')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-black/76 via-black/16 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08070a] via-black/14 to-black/18" />
          <div className="absolute -bottom-28 left-[-18%] h-80 w-80 rounded-full bg-[#f5c453]/12 blur-3xl" />
          <button onClick={() => onOpenShow(focusedShow)} className="absolute inset-0 text-left">
            <div className="absolute inset-x-0 bottom-[22%] left-0 px-6">
              <div className="min-w-0">
                {logoPath ? (
                  <img src={imgUrl(logoPath, 'w500')} alt={focusedShow.name} className="max-h-[104px] max-w-[72%] object-contain object-left drop-shadow-[0_12px_30px_rgba(0,0,0,0.92)]" />
                ) : (
                  <h2 className="max-w-[300px] text-5xl font-black leading-[0.82] tracking-[-0.12em] text-balance">{focusedShow.name}</h2>
                )}
                <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/48">
                  <span>{focusedShow.year ?? '----'}</span>
                  {typeof focusedShow.top8Position === 'number' && <span className="text-[#f5c453]">Top {(focusedShow.top8Position ?? 0) + 1}</span>}
                  {tierByShowId.get(focusedShow.id) && <span className="text-[#f5c453]">{tierByShowId.get(focusedShow.id)}</span>}
                </div>
              </div>
            </div>
          </button>
        </section>
      )}

      <div className="relative z-10 flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-2">
        <div className="flex items-center justify-center p-2 bg-white/[0.045] rounded-full flex-shrink-0">
          <Filter size={14} className="text-white/35" />
        </div>
        {genres.slice(0, 8).map((genre) => (
          <button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            className={cn(
              'px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-150 flex-shrink-0',
              activeGenre === genre ? (genre === 'All' ? 'bg-white text-black' : 'bg-[#f5c453] text-black') : 'bg-white/[0.045] text-white/36 hover:text-white/70',
            )}
          >
            {genre}
          </button>
        ))}
        <span className="h-6 w-px bg-white/10 flex-shrink-0" aria-hidden />
        {TIER_CHIPS.map((tier) => (
          <button
            key={tier}
            onClick={() => setActiveTier(tier)}
            className={cn(
              'px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-150 flex-shrink-0',
              activeTier === tier ? 'bg-white text-black' : 'bg-white/[0.035] text-white/32 hover:text-white/70',
            )}
          >
            {tier}
          </button>
        ))}
        {activeTier !== 'All' && (
          <button onClick={() => setActiveTier('All')} className="px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap bg-white text-black flex-shrink-0">
            All
          </button>
        )}
      </div>

      <div className="relative z-10 flex-1 px-4 pt-4 pb-6">
        {shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60 bg-white/[0.035] rounded-[34px] mt-4">
            <Package size={56} strokeWidth={1.5} className="mb-4 text-white/35" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Search size={40} className="mb-4 text-zinc-500" />
          </div>
        ) : (
          <div className="grid grid-cols-4 grid-flow-row-dense auto-rows-[132px] gap-3 pb-8">
            {filtered.map((show, index) => {
              const large = index % 7 === 0
              const wide = index % 7 === 3
              return (
                <button
                  key={show.id}
                  onClick={() => onOpenShow(show)}
                  className={cn(
                    'group relative overflow-hidden rounded-[26px] bg-[#151117] text-left shadow-[0_16px_34px_rgba(0,0,0,0.34)] transition-transform duration-300 active:scale-[0.97]',
                    large ? 'col-span-2 row-span-2' : wide ? 'col-span-2' : 'col-span-1',
                  )}
                >
                  {show.posterPath || show.backdropPath ? (
                    <img
                      src={imgUrl(wide && show.backdropPath ? show.backdropPath : show.posterPath, wide && show.backdropPath ? 'w500' : 'w342')}
                      alt={show.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-zinc-500 font-black text-xl">
                      {show.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-transparent to-transparent" />
                  {(large || wide) && (
                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <p className="font-black text-white text-sm tracking-[-0.05em] line-clamp-2 leading-tight">{show.name}</p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
