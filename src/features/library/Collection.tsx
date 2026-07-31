import { useEffect, useMemo, useState } from 'react'
import { Bookmark, ChevronLeft, Filter, LibraryBig, Package, Plus, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import { db } from '../../data/db'
import { cn } from '../../lib/utils'
import { getShowImages, hasTmdbKey, imgUrl } from '../../lib/tmdb'
import type { Show, Tier } from '../../types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { WatchlistShelves } from '../watchlist/WatchlistShelves'
import { WatchlistSearchSheet } from '../watchlist/WatchlistSearchSheet'
import { CollectibleMediaCard } from '../../components/show/CollectibleMediaCard'
import { ColorAwareRail } from '../../components/ui/ColorAwareRail'
import { ImdbBadge } from '../../components/ui/ImdbBadge'
import { syncFranchiseDefinitionsForShows } from '../../data/queries'
import type { FranchiseDefinition } from '../../types'
import { FranchiseAchievementRail } from '../achievements/FranchiseAchievementRail'

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
  const [view, setView] = useState<'collection' | 'watchlist'>('collection')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const [activeTier, setActiveTier] = useState<TierFilter>('All')
  const [focusedId, setFocusedId] = useState<number | null>(null)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [tvOn, setTvOn] = useState(false)
  const [watchlistSearchOpen, setWatchlistSearchOpen] = useState(false)
  const [watchlistSearchShelfId, setWatchlistSearchShelfId] = useState<string | null>(null)
  const [newShelfSignal, setNewShelfSignal] = useState(0)
  const reduceMotion = useReducedMotion()

  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const assignments = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const emojiCategories = useDexieQuery(['emojiCategories'], () => db.emojiCategories.toArray(), [], [])
  const franchiseDefinitions = useDexieQuery<FranchiseDefinition[]>(
    ['franchiseDefinitions'],
    () => db.franchiseDefinitions.toArray(),
    [],
    [],
  )

  useEffect(() => {
    if (!shows.length) return
    void syncFranchiseDefinitionsForShows(shows)
  }, [shows])

  const tierByShowId = useMemo(() => {
    const map = new Map<number, Tier>()
    for (const assignment of assignments) map.set(assignment.showId, assignment.tier)
    return map
  }, [assignments])

  const vibesByShowId = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const category of emojiCategories) {
      for (const showId of category.showIds) {
        const list = map.get(showId) ?? []
        list.push(category.emoji)
        map.set(showId, list)
      }
    }
    return map
  }, [emojiCategories])

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

  const heroPool = filtered

  const focusedShow = useMemo(
    () => heroPool.find((show) => show.id === focusedId) ?? top8[0] ?? heroPool[0] ?? shows[0],
    [focusedId, heroPool, shows, top8],
  )

  useEffect(() => {
    if (!heroPool.length) {
      setFocusedId(null)
      return
    }
    setFocusedId((current) => (heroPool.some((show) => show.id === current) ? current : heroPool[0].id))
  }, [heroPool])

  useEffect(() => {
    if (reduceMotion) return
    const key = 'loot.collection.tvOn.v1'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setTvOn(true)
    const timer = window.setTimeout(() => setTvOn(false), 960)
    return () => window.clearTimeout(timer)
  }, [reduceMotion])

  useEffect(() => {
    if (heroPool.length <= 1) return
    const timer = window.setInterval(() => {
      setFocusedId((current) => {
        const index = heroPool.findIndex((show) => show.id === current)
        const nextIndex = index < 0 ? 0 : (index + 1) % heroPool.length
        return heroPool[nextIndex]?.id ?? current
      })
    }, 5200)
    return () => window.clearInterval(timer)
  }, [heroPool])

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
    getShowImages(focusedShow.id, focusedShow.mediaType ?? 'tv')
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
      {view === 'collection' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_20%_0%,rgba(245,196,83,0.13),transparent_20rem)]" aria-hidden />
      )}

      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-5 pointer-events-none">
        {view === 'watchlist' ? (
          <button
            onClick={() => setView('collection')}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/34 text-white/78 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.38)] border border-white/[0.08] pointer-events-auto active:scale-95"
            aria-label="Back to collection"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <button
            onClick={() => setSearchOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/34 text-white/78 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.38)] border border-white/[0.08] pointer-events-auto active:scale-95"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
        )}
        <div className="flex items-center gap-2 pointer-events-auto">
          {view === 'collection' && (
            <button
              onClick={() => setView('watchlist')}
              className="flex h-11 items-center gap-2 rounded-full bg-black/38 px-3 text-white/86 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.38)] border border-white/[0.08] active:scale-95"
              aria-label="Open watchlist"
            >
              <Bookmark size={15} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">Watchlist</span>
            </button>
          )}
          <button
            onClick={() => {
              if (view === 'watchlist') {
                setNewShelfSignal((value) => value + 1)
                return
              }
              onAddShow()
            }}
            className="flex h-11 items-center gap-2 rounded-full bg-black/38 px-3 text-white/86 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.38)] border border-white/[0.08] active:scale-95"
            aria-label={view === 'watchlist' ? 'Create new shelf' : 'Add to collection'}
          >
            {view === 'watchlist' ? null : <LibraryBig size={16} />}
            <span className="text-[10px] font-black uppercase tracking-[0.14em]">{view === 'watchlist' ? 'New shelf' : 'Add'}</span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f5c453] text-black">
              <Plus size={13} strokeWidth={3} />
            </span>
          </button>
        </div>
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

      {view === 'collection' && focusedShow && (
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
          <AnimatePresence>
            {tvOn && (
              <motion.div
                initial={{ opacity: 0.95, scaleY: 0.02 }}
                animate={{ opacity: [0.95, 0.72, 0], scaleY: [0.02, 1.04, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.86, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-0 origin-center mix-blend-screen"
                aria-hidden
              >
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.16)_0px,rgba(255,255,255,0.16)_1px,transparent_1px,transparent_5px)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.92),rgba(255,255,255,0.16)_26%,transparent_58%)]" />
              </motion.div>
            )}
          </AnimatePresence>
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

      {view === 'collection' && (
        <FranchiseAchievementRail definitions={franchiseDefinitions} shows={shows} />
      )}

      <div className={cn('relative z-10 px-4', view === 'watchlist' ? 'pt-[66px] pb-0' : 'py-1.5')}>
        {view === 'collection' && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
        )}
      </div>

      <div className={cn('relative z-10 flex-1 px-4 pb-6', view === 'watchlist' ? 'pt-1' : 'pt-3')}>
        {view === 'watchlist' ? (
          <WatchlistShelves
            newShelfSignal={newShelfSignal}
            onOpenShow={onOpenShow}
            onAddToShelf={(shelfId) => {
              setWatchlistSearchShelfId(shelfId)
              setWatchlistSearchOpen(true)
            }}
          />
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60 bg-white/[0.035] rounded-[34px] mt-4">
            <Package size={56} strokeWidth={1.5} className="mb-4 text-white/35" />
            <p className="text-sm font-black uppercase tracking-[0.14em] text-white/72">Animation only</p>
            <p className="mt-2 max-w-[250px] text-center text-xs leading-relaxed text-white/42">Anime, adult animation, cartoons, and animated films. No live action—ever.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Search size={40} className="mb-4 text-zinc-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 pb-8">
            {filtered.map((show) => (
              <CollectionGridCard
                key={show.id}
                show={show}
                tier={tierByShowId.get(show.id)}
                vibes={vibesByShowId.get(show.id) ?? []}
                onOpenShow={onOpenShow}
              />
            ))}
          </div>
        )}
      </div>
      <WatchlistSearchSheet
        open={watchlistSearchOpen}
        shelfId={watchlistSearchShelfId}
        onClose={() => setWatchlistSearchOpen(false)}
        onOpenSettings={() => setWatchlistSearchOpen(false)}
      />
    </div>
  )
}

function CollectionGridCard({
  show,
  tier,
  vibes,
  onOpenShow,
}: {
  show: Show
  tier?: Tier
  vibes: string[]
  onOpenShow: (show: Show) => void
}) {
  const artPath = show.posterPath ?? show.backdropPath
  const artSize = show.posterPath ? 'w342' : 'w500'
  const artSrc = artPath ? imgUrl(artPath, artSize) : ''

  return (
    <button
      onClick={() => onOpenShow(show)}
      className="group relative min-w-0 overflow-hidden rounded-[27px] bg-[#111416] text-left shadow-[0_18px_42px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.1] transition-transform duration-300 active:scale-[0.97]"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#151117]">
        <CollectibleMediaCard
          id={show.id}
          title={show.name}
          imagePath={artPath}
          imageSize={artSize}
          artScrim={false}
          tier={tier}
          className="rounded-none shadow-none"
        >
          <span />
        </CollectibleMediaCard>
      </div>
      <ColorAwareRail imageSrc={artSrc} className="min-h-[94px] px-3.5 py-3">
        <h3 className="line-clamp-2 min-h-[34px] text-[15px] font-black leading-[1.08] tracking-[-0.025em] text-white">
          {show.name}
        </h3>
        <div className="mt-2 flex min-h-6 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {show.year && <span className="text-[10px] font-black tracking-[0.04em] text-white/78">{show.year}</span>}
            <ImdbBadge showId={show.id} compact className="shadow-none" />
          </div>
          {vibes.length > 0 && (
            <span className="shrink-0 text-[12px] leading-none" aria-label={`${vibes.length} collection vibes`}>
              {vibes.slice(0, 2).join(' ')}
            </span>
          )}
        </div>
      </ColorAwareRail>
    </button>
  )
}
