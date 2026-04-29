import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Plus, Check, X } from 'lucide-react'
import {
  type DiscoverCategoryKey,
  getDiscoverFeed,
  getCachedDiscoverFeed,
  getDiscoverCategoryPage,
  getShowDetail,
  hasTmdbKey,
  imgUrl,
  searchShows,
  tmdbToLoot,
  type DiscoverFeed,
  type LootShow,
} from '../../lib/tmdb'
import { upsertShow } from '../../data/queries'
import { db } from '../../data/db'
import { useDexieQuery } from '../../hooks/useDexieQuery'
import type { Genre, Show } from '../../types'
import { cn } from '../../lib/utils'

interface Props {
  onOpenSettings: () => void
}

export function Discover({ onOpenSettings }: Props) {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [results, setResults] = useState<LootShow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [feed, setFeed] = useState<DiscoverFeed | null>(() => getCachedDiscoverFeed())
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<null | { key: DiscoverCategoryKey; title: string }>(null)
  const [categoryItems, setCategoryItems] = useState<LootShow[]>([])
  const [categoryPage, setCategoryPage] = useState(1)
  const [categoryTotalPages, setCategoryTotalPages] = useState(1)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const keyOk = hasTmdbKey()

  const ownedShows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const ownedIds = ownedShows.map((s) => s.id)

  // Trending feed — fetched on mount, cached at module level for 5 min.
  useEffect(() => {
    if (!keyOk) return
    let cancelled = false
    if (!feed) setFeedLoading(true)
    setFeedError(null)
    getDiscoverFeed()
      .then((data) => {
        if (!cancelled) setFeed(data)
      })
      .catch((e) => {
        if (!cancelled) setFeedError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [keyOk])

  // Search debounce.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!keyOk) return
    if (!debouncedQ.trim()) {
      setResults([])
      setSearchError(null)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    setSearchError(null)
    searchShows(debouncedQ.trim())
      .then((res) => {
        if (!cancelled) setResults(res.map(tmdbToLoot))
      })
      .catch((e) => {
        if (!cancelled) setSearchError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQ, keyOk])

  useEffect(() => {
    if (!activeCategory || !keyOk) return
    let cancelled = false
    setCategoryLoading(true)
    getDiscoverCategoryPage(activeCategory.key, categoryPage)
      .then((data) => {
        if (cancelled) return
        setCategoryTotalPages(data.totalPages)
        setCategoryItems((prev) => (categoryPage === 1 ? data.results : [...prev, ...data.results]))
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeCategory, categoryPage, keyOk])

  useEffect(() => {
    if (!activeCategory || !sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry.isIntersecting || categoryLoading) return
        if (categoryPage >= categoryTotalPages) return
        setCategoryPage((p) => p + 1)
      },
      { rootMargin: '220px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [activeCategory, categoryLoading, categoryPage, categoryTotalPages])

  const categoryOwnedIds = useMemo(() => new Set(ownedIds), [ownedIds])

  const openCategory = (key: DiscoverCategoryKey, title: string) => {
    setActiveCategory({ key, title })
    setCategoryItems([])
    setCategoryPage(1)
    setCategoryTotalPages(1)
  }

  return (
    <div className="flex flex-col min-h-full pb-28">
      <div className="sticky top-0 z-30 bg-[#0f0f13]/85 backdrop-blur-xl border-b border-white/5 pt-5 pb-3 px-4 flex flex-col gap-3">
        <div className="relative group">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#4ade80] transition-colors pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for shows..."
            disabled={!keyOk}
            className="w-full bg-[#1a1a24] border-2 border-white/10 rounded-xl py-2.5 pl-9 pr-9 font-bold text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#4ade80] transition-colors disabled:opacity-50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {searchError && <p className="text-xs text-rose-300">{searchError}</p>}
      </div>

      <div className="flex-1 pt-4">
        {activeCategory ? (
          <CategoryGrid
            title={activeCategory.title}
            items={categoryItems}
            loading={categoryLoading}
            sentinelRef={sentinelRef}
            ownedIds={categoryOwnedIds}
            onBack={() => setActiveCategory(null)}
          />
        ) : !keyOk ? (
          <NoKey onOpenSettings={onOpenSettings} />
        ) : query.trim() ? (
          <SearchResults loading={searchLoading} results={results} ownedIds={ownedIds} />
        ) : feedError ? (
          <p className="px-5 py-10 text-center text-rose-300 text-sm">{feedError}</p>
        ) : feedLoading || !feed ? (
          <SkeletonRows />
        ) : (
          <FeedRows feed={feed} ownedIds={ownedIds} onOpenCategory={openCategory} />
        )}
      </div>
    </div>
  )
}

function CategoryGrid({
  title,
  items,
  loading,
  sentinelRef,
  ownedIds,
  onBack,
}: {
  title: string
  items: LootShow[]
  loading: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  ownedIds: Set<number>
  onBack: () => void
}) {
  const [showFloatingBack, setShowFloatingBack] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    const onScroll = () => setShowFloatingBack(window.scrollY > 140)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0]
    touchStartX.current = t.clientX
    touchStartY.current = t.clientY
  }

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartX.current
    const dy = Math.abs(t.clientY - touchStartY.current)
    const startedAtLeftEdge = touchStartX.current <= 24
    if (startedAtLeftEdge && dx > 70 && dy < 40) onBack()
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div className="px-4 pb-8" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 bg-[#0f0f13]/92 backdrop-blur-xl border-b border-white/5 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="h-9 px-3 rounded-xl bg-white/10 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
          <div className="w-[72px]" aria-hidden />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((show) => (
          <PortraitCard key={`${title}-${show.id}`} show={show} isOwned={ownedIds.has(show.id)} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-7 h-7 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {showFloatingBack && (
        <button
          onClick={onBack}
          className="fixed bottom-24 left-4 h-10 px-4 rounded-full bg-[#14141c]/95 border border-white/15 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.5)] z-40"
        >
          <ChevronLeft size={14} /> Back
        </button>
      )}
    </div>
  )
}

function NoKey({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="px-5 py-16 text-center">
      <p className="text-sm text-white/75">Add a TMDB API key in Settings to discover shows.</p>
      <button
        onClick={onOpenSettings}
        className="mt-4 rounded-xl bg-white text-black px-4 h-10 text-sm font-semibold"
      >
        Open Settings
      </button>
    </div>
  )
}

function SearchResults({
  loading,
  results,
  ownedIds,
}: {
  loading: boolean
  results: LootShow[]
  ownedIds: number[]
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40 px-4">
        <Search size={40} className="mb-3 text-zinc-500" />
        <p className="font-black uppercase tracking-widest text-sm">No Results</p>
      </div>
    )
  }
  return (
    <div className="px-4 pb-8">
      <p className="text-[11px] font-black text-zinc-600 uppercase tracking-widest mb-4">
        {results.length} results
      </p>
      <div className="grid grid-cols-2 gap-4">
        {results.map((show) => (
          <PortraitCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} />
        ))}
      </div>
    </div>
  )
}

function FeedRows({
  feed,
  ownedIds,
  onOpenCategory,
}: {
  feed: DiscoverFeed
  ownedIds: number[]
  onOpenCategory: (key: DiscoverCategoryKey, title: string) => void
}) {
  return (
    <>
      <CarouselRow title="Trending This Week" categoryKey="trending" shows={feed.trending.slice(0, 8)} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} />
      <CarouselRow title="Airing Today" categoryKey="airingToday" shows={feed.airingToday} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} />
      <CarouselRow title="Trending Now" categoryKey="popular" shows={feed.popular} ownedIds={ownedIds} onOpenCategory={onOpenCategory} />
      <CarouselRow title="On Netflix" categoryKey="netflix" shows={feed.netflix} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} />
      <CarouselRow title="Crime" categoryKey="crime" shows={feed.crime} ownedIds={ownedIds} onOpenCategory={onOpenCategory} />
      <CarouselRow title="On HBO" categoryKey="hbo" shows={feed.hbo} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} />
      <CarouselRow title="Sci-Fi & Fantasy" categoryKey="scifi" shows={feed.scifi} ownedIds={ownedIds} onOpenCategory={onOpenCategory} />
      <CarouselRow title="On Apple TV+" categoryKey="apple" shows={feed.apple} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} />
      <CarouselRow title="Animation" categoryKey="animation" shows={feed.animation} ownedIds={ownedIds} onOpenCategory={onOpenCategory} />
      <CarouselRow title="Mystery" categoryKey="mystery" shows={feed.mystery} ownedIds={ownedIds} onOpenCategory={onOpenCategory} />
      <CarouselRow title="On Amazon Prime" categoryKey="amazon" shows={feed.amazon} ownedIds={ownedIds} landscape onOpenCategory={onOpenCategory} />
      <CarouselRow title="Top Rated All Time" categoryKey="topRated" shows={feed.topRated} ownedIds={ownedIds} onOpenCategory={onOpenCategory} />
    </>
  )
}

function SkeletonRows() {
  return (
    <div className="px-4 flex flex-col gap-8">
      {[true, false, false, true, false].map((isLandscape, i) => (
        <div key={i}>
          <div className="h-3 w-28 bg-white/10 rounded-full animate-pulse mb-3" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: isLandscape ? 2 : 4 }).map((_, j) => (
              <div
                key={j}
                className={cn(
                  'flex-shrink-0 rounded-[20px] bg-white/5 animate-pulse',
                  isLandscape ? 'w-[280px] aspect-[16/9]' : 'w-[130px] aspect-[2/3]',
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CarouselRow({
  title,
  categoryKey,
  shows,
  ownedIds,
  landscape = false,
  onOpenCategory,
}: {
  title: string
  categoryKey: DiscoverCategoryKey
  shows: LootShow[]
  ownedIds: number[]
  landscape?: boolean
  onOpenCategory: (key: DiscoverCategoryKey, title: string) => void
}) {
  if (shows.length === 0) return null
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-black tracking-widest text-sm uppercase text-white">{title}</h2>
        <button
          onClick={() => onOpenCategory(categoryKey, title)}
          className="text-zinc-600 hover:text-white transition-colors"
          aria-label={`Open ${title}`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 px-4">
        {shows.map((show) =>
          landscape ? (
            <LandscapeCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} />
          ) : (
            <PortraitCard key={show.id} show={show} isOwned={ownedIds.includes(show.id)} variant="carousel" />
          ),
        )}
        <button
          onClick={() => onOpenCategory(categoryKey, title)}
          className={cn(
            'flex-shrink-0 snap-center rounded-[20px] border border-dashed border-white/20 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] transition-colors',
            landscape ? 'w-[220px] aspect-[16/9]' : 'w-[130px] aspect-[2/3]',
          )}
        >
          <div className="w-full h-full grid place-items-center">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest">
              See all <ChevronRight size={14} />
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

async function persistShow(show: LootShow) {
  const detail = await getShowDetail(show.id)
  const genres = detail.genres.map((g) => g.name) as string[]
  const yr = show.year && show.year !== '—' ? Number(show.year) : undefined
  const persisted: Show = {
    id: show.id,
    name: show.title,
    year: yr,
    posterPath: show.posterPath,
    backdropPath: show.backdropPath,
    overview: show.overview,
    genres: genres as Genre[],
    rawGenres: genres,
    addedAt: Date.now(),
    updatedAt: Date.now(),
  }
  await upsertShow(persisted)
}

function PortraitCard({
  show,
  isOwned,
  variant = 'grid',
}: {
  show: LootShow
  isOwned: boolean
  variant?: 'grid' | 'carousel'
}) {
  const [isAnimatingAdd, setIsAnimatingAdd] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (isOwned || adding) return
    setIsAnimatingAdd(true)
    setAdding(true)
    setTimeout(() => setIsAnimatingAdd(false), 150)
    try {
      await persistShow(show)
    } catch {
      // silent for now; surface via toast later
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      className={cn(
        'relative group cursor-pointer rounded-[20px] overflow-hidden border border-white/10 bg-[#1a1a24] shadow-lg transition-transform duration-150 active:scale-95',
        variant === 'carousel'
          ? 'flex-shrink-0 snap-center w-[130px] aspect-[2/3]'
          : 'aspect-[2/3]',
        isAnimatingAdd ? 'scale-[0.93]' : 'scale-100',
      )}
    >
      {show.posterPath ? (
        <img
          src={imgUrl(show.posterPath, 'w342')}
          alt={show.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <button
        onClick={handleAdd}
        disabled={isOwned || adding}
        className={cn(
          'absolute top-2 right-2 z-30 w-8 h-8 rounded-lg font-black transition-all duration-200 flex items-center justify-center shadow-lg',
          isOwned
            ? 'bg-black/60 text-white cursor-default backdrop-blur-md border border-white/10'
            : 'bg-[#4ade80] text-black hover:brightness-110 active:scale-95 disabled:opacity-50',
        )}
        aria-label={isOwned ? 'In collection' : 'Add to collection'}
      >
        {isOwned || adding ? <Check size={14} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
      </button>
      {variant === 'grid' && (
        <div className="absolute bottom-0 inset-x-0 p-2 z-10 pointer-events-none">
          <h3 className="font-black text-white text-xs leading-tight truncate">{show.title}</h3>
          {show.year !== '—' && (
            <span className="text-[10px] font-bold text-zinc-300">{show.year}</span>
          )}
        </div>
      )}
    </div>
  )
}

function LandscapeCard({ show, isOwned }: { show: LootShow; isOwned: boolean }) {
  const [isAnimatingAdd, setIsAnimatingAdd] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (isOwned || adding) return
    setIsAnimatingAdd(true)
    setAdding(true)
    setTimeout(() => setIsAnimatingAdd(false), 150)
    try {
      await persistShow(show)
    } catch {
      // silent for now
    } finally {
      setAdding(false)
    }
  }

  const bg = show.backdropPath
    ? imgUrl(show.backdropPath, 'w500')
    : show.posterPath
      ? imgUrl(show.posterPath, 'w342')
      : ''

  return (
    <div
      className={cn(
        'relative group cursor-pointer flex-shrink-0 snap-center rounded-[20px] overflow-hidden border border-white/10 bg-[#1a1a24] shadow-lg transition-transform duration-150 active:scale-95',
        'w-[280px] aspect-[16/9]',
        isAnimatingAdd ? 'scale-[0.93]' : 'scale-100',
      )}
    >
      {bg && (
        <img src={bg} alt={show.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <button
        onClick={handleAdd}
        disabled={isOwned || adding}
        className={cn(
          'absolute top-3 right-3 z-30 w-9 h-9 rounded-xl font-black transition-all duration-200 flex items-center justify-center shadow-lg',
          isOwned
            ? 'bg-black/60 text-white cursor-default backdrop-blur-md border border-white/10'
            : 'bg-[#4ade80] text-black hover:brightness-110 active:scale-95 disabled:opacity-50',
        )}
        aria-label={isOwned ? 'In collection' : 'Add to collection'}
      >
        {isOwned || adding ? <Check size={16} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
      </button>
      <div className="absolute bottom-0 inset-x-0 p-4 z-10 pointer-events-none">
        <h3 className="font-black text-white text-base leading-tight uppercase tracking-tight truncate">
          {show.title}
        </h3>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 block truncate">
          {show.year} &bull; {show.genre}
        </span>
      </div>
    </div>
  )
}
