import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { db } from '../../data/db'
import { getDiscoverCategoryPage, hasTmdbKey, imgUrl, type LootShow } from '../../lib/tmdb'
import type { Show, Tier } from '../../types'
import { beginOnboardingFollowup } from './onboardingFollowup'

export const ONBOARDING_STORAGE_KEY = 'loot:onboarding:cinematic-v1'

type StarterTitle = Omit<Show, 'addedAt' | 'updatedAt'> & { accent: string }
type Phase = 'pick' | 'rank' | 'reveal'
type OnboardingTier = Extract<Tier, 'S' | 'A'>

const STARTER_TITLES: StarterTitle[] = [
  {
    id: 94605, name: 'Arcane', year: 2021, mediaType: 'tv', posterPath: '/abf8tHznhSvl9BAElD2cQeRr7do.jpg', backdropPath: '/q8eejQcg1bAqImEV8jh8RtBD4uH.jpg',
    overview: 'Two sisters fight on rival sides of a war between magic technologies and clashing convictions.', genres: ['Animation'], rawGenres: ['Animation', 'Action & Adventure', 'Sci-Fi & Fantasy'], tradition: 'western', vibeIds: ['found_family', 'art_house_animation'], accent: '#f2a65a',
  },
  {
    id: 1429, name: 'Attack on Titan', year: 2013, mediaType: 'tv', posterPath: '/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', backdropPath: '/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg',
    overview: 'Humanity fights for survival against the terrifying Titans beyond the walls.', genres: ['Animation'], rawGenres: ['Animation', 'Sci-Fi & Fantasy', 'Action & Adventure'], tradition: 'anime', vibeIds: ['dark_fantasy_grim', 'shounen_escalation'], accent: '#d75a43',
  },
  {
    id: 246, name: 'Avatar: The Last Airbender', year: 2005, mediaType: 'tv', posterPath: '/yaGt4GIutpbXHsv48tWceWg6s56.jpg', backdropPath: '/kU98MbVVgi72wzceyrEbClZmMFe.jpg',
    overview: 'A young Avatar must master the four elements and bring peace to a war-torn world.', genres: ['Animation'], rawGenres: ['Animation', 'Action & Adventure', 'Sci-Fi & Fantasy'], tradition: 'western', vibeIds: ['found_family', 'kids_all_ages'], accent: '#75c9e8',
  },
  {
    id: 225180, name: 'Blue Eye Samurai', year: 2023, mediaType: 'tv', posterPath: '/fXm3JT4WLQVnwukdvghtAblc1wc.jpg', backdropPath: '/oCMZpwLBcb3dnRuzEKWNWrw1tHz.jpg',
    overview: 'A young warrior cuts a bloody path toward revenge in Edo-period Japan.', genres: ['Animation'], rawGenres: ['Action & Adventure', 'Animation', 'Drama'], tradition: 'western', vibeIds: ['art_house_animation', 'dark_fantasy_grim'], accent: '#4fc2da',
  },
  {
    id: 61222, name: 'BoJack Horseman', year: 2014, mediaType: 'tv', posterPath: '/6JFWzlChcGgLiIUo2COgNlWGFKy.jpg', backdropPath: '/qFYDJUIFh8zgEDy3EvnHwhgOl0S.jpg',
    overview: 'A washed-up sitcom star navigates fame, relationships, and his own worst impulses.', genres: ['Animation'], rawGenres: ['Animation', 'Comedy', 'Drama'], tradition: 'western', vibeIds: ['adult_animation_cynical', 'psychological_mindbend'], accent: '#49b8cf',
  },
  {
    id: 15260, name: 'Adventure Time', year: 2010, mediaType: 'tv', posterPath: '/qk3eQ8jW4opJ48gFWYUXWaMT4l.jpg', backdropPath: '/pe4B3OYBb7qYCdkAz7nKWordbls.jpg',
    overview: 'Finn and Jake journey through the surreal, post-apocalyptic Land of Ooo.', genres: ['Animation'], rawGenres: ['Animation', 'Comedy', 'Sci-Fi & Fantasy'], tradition: 'western', vibeIds: ['cartoon_nostalgia', 'kids_all_ages'], accent: '#6cd39c',
  },
  {
    id: 95557, name: 'Invincible', year: 2021, mediaType: 'tv', posterPath: '/4tblBrslcKSifMVZ3TmtT2ukMor.jpg', backdropPath: '/9qrroces8C6R9aKr08hACNPVXdZ.jpg',
    overview: 'A teenager develops powers and discovers the truth behind his superhero father.', genres: ['Animation'], rawGenres: ['Animation', 'Drama', 'Sci-Fi & Fantasy', 'Action & Adventure'], tradition: 'western', vibeIds: ['superhero_animated', 'adult_animation_cynical'], accent: '#f2d34f',
  },
  {
    id: 209867, name: "Frieren: Beyond Journey's End", year: 2023, mediaType: 'tv', posterPath: '/dqZENchTd7lp5zht7BdlqM7RBhD.jpg', backdropPath: '/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg',
    overview: 'An elven mage retraces a heroic journey while learning to understand human lives.', genres: ['Animation'], rawGenres: ['Animation', 'Action & Adventure', 'Drama', 'Sci-Fi & Fantasy'], tradition: 'anime', vibeIds: ['slice_of_life_cozy', 'found_family'], accent: '#d7b7f1',
  },
  {
    id: 40075, name: 'Gravity Falls', year: 2012, mediaType: 'tv', posterPath: '/qwi3p6PzKfQZ4YXBzv3CP5pO2dE.jpg', backdropPath: '/lhg7eA6CTOCL10QNVdKiyxkgPsL.jpg',
    overview: 'Twins discover strange creatures and impossible mysteries during one unforgettable summer.', genres: ['Animation'], rawGenres: ['Animation', 'Comedy', 'Family', 'Mystery'], tradition: 'western', vibeIds: ['cartoon_nostalgia', 'kids_all_ages'], accent: '#d89e4f',
  },
  {
    id: 30991, name: 'Cowboy Bebop', year: 1998, mediaType: 'tv', posterPath: '/xDiXDfZwC6XYC6fxHI1jl3A3Ill.jpg', backdropPath: '/A4PHx94G7mvM3b8vsDJ5HEaQ6uv.jpg',
    overview: 'A crew of bounty hunters drifts through the solar system chasing criminals and their pasts.', genres: ['Animation'], rawGenres: ['Animation', 'Action & Adventure', 'Sci-Fi & Fantasy', 'Western'], tradition: 'anime', vibeIds: ['found_family', 'psychological_mindbend'], accent: '#e35f4f',
  },
  {
    id: 71024, name: 'Castlevania', year: 2017, mediaType: 'tv', posterPath: '/WzFHnJY44uDERER0xi1jOdoafT.jpg', backdropPath: '/jLE5bsPA9xOKzBWOaOmKbp1DWQS.jpg',
    overview: 'A vampire hunter fights an army of otherworldly beasts controlled by Dracula.', genres: ['Animation'], rawGenres: ['Animation', 'Sci-Fi & Fantasy', 'Drama'], tradition: 'western', vibeIds: ['dark_fantasy_grim', 'horror_animated'], accent: '#d45362',
  },
  {
    id: 86831, name: 'Love, Death & Robots', year: 2019, mediaType: 'tv', posterPath: '/vL5BQvXH96cJzmNK5n7QliQxy90.jpg', backdropPath: '/nBrkOZyI75artyizuBFeya48KbO.jpg',
    overview: 'Dark comedy, terrifying creatures, and strange futures collide in animated short stories.', genres: ['Animation'], rawGenres: ['Animation', 'Sci-Fi & Fantasy'], tradition: 'western', vibeIds: ['art_house_animation', 'adult_animation_cynical'], accent: '#e46b65',
  },
  {
    id: 569094, name: 'Across the Spider-Verse', year: 2023, mediaType: 'movie', posterPath: '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', backdropPath: '/9xfDWXAUbFXQK585JvByT5pEAhe.jpg',
    overview: 'Miles Morales is catapulted across the Multiverse and must redefine what it means to be a hero.', genres: ['Animation'], rawGenres: ['Animation', 'Action', 'Adventure', 'Science Fiction'], tradition: 'western', vibeIds: ['superhero_animated', 'art_house_animation'], accent: '#e85c9a',
  },
  {
    id: 129, name: 'Spirited Away', year: 2001, mediaType: 'movie', posterPath: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', backdropPath: '/dyJvKsNs2KP8qQnAXbRwDjblViy.jpg',
    overview: 'A young girl becomes trapped in a strange world of spirits and must save her family.', genres: ['Animation'], rawGenres: ['Animation', 'Family', 'Fantasy'], tradition: 'anime', vibeIds: ['art_house_animation', 'kids_all_ages'], accent: '#e98271',
  },
  {
    id: 1184918, name: 'The Wild Robot', year: 2024, mediaType: 'movie', posterPath: '/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg', backdropPath: '/mQZJoIhTEkNhCYAqcHrQqhENLdu.jpg',
    overview: 'A shipwrecked robot bonds with an island and becomes the guardian of an orphaned goose.', genres: ['Animation'], rawGenres: ['Family', 'Animation', 'Science Fiction', 'Adventure'], tradition: 'western', vibeIds: ['kids_all_ages', 'found_family'], accent: '#ed9c4f',
  },
  {
    id: 128, name: 'Princess Mononoke', year: 1997, mediaType: 'movie', posterPath: '/cMYCDADoLKLbB83g4WnJegaZimC.jpg', backdropPath: '/gl0jzn4BupSbL2qMVeqrjKkF9Js.jpg',
    overview: 'A cursed prince is caught in the struggle between an iron town and the gods of the forest.', genres: ['Animation'], rawGenres: ['Adventure', 'Fantasy', 'Animation'], tradition: 'anime', vibeIds: ['art_house_animation', 'dark_fantasy_grim'], accent: '#8bc184',
  },
  {
    id: 2062, name: 'Ratatouille', year: 2007, mediaType: 'movie', posterPath: '/t3vaWRPSf6WjDSamIkKDs1iQWna.jpg', backdropPath: '/jQ6Vuxe1CEPMXTF7d0fZgdIBY8U.jpg',
    overview: 'A rat with a refined palate forms an unlikely partnership to pursue his culinary dream.', genres: ['Animation'], rawGenres: ['Animation', 'Comedy', 'Family', 'Fantasy'], tradition: 'western', vibeIds: ['comfort_rewatch_classics', 'kids_all_ages'], accent: '#e6b653',
  },
  {
    id: 14836, name: 'Coraline', year: 2009, mediaType: 'movie', posterPath: '/4jeFXQYytChdZYE9JYO7Un87IlW.jpg', backdropPath: '/hofnlIyF6bePkgQOpcuRWLvzf15.jpg',
    overview: 'A hidden door leads Coraline to an idealized life with a terrifying cost.', genres: ['Animation'], rawGenres: ['Animation', 'Family', 'Fantasy'], tradition: 'western', vibeIds: ['horror_animated', 'dark_fantasy_grim'], accent: '#668ee8',
  },
]

const VIBE_LABELS: Record<string, string> = {
  found_family: 'Found family', art_house_animation: 'Visual craft', dark_fantasy_grim: 'Dark worlds', shounen_escalation: 'High stakes', kids_all_ages: 'All-ages wonder',
  adult_animation_cynical: 'Sharp edges', psychological_mindbend: 'Mindbending', cartoon_nostalgia: 'Cartoon comfort', superhero_animated: 'Superhero energy', slice_of_life_cozy: 'Quiet magic',
  horror_animated: 'Beautiful nightmares', comfort_rewatch_classics: 'Comfort rewatches',
}

function tasteLabels(titles: StarterTitle[]) {
  const scores = new Map<string, number>()
  titles.flatMap((title) => title.vibeIds ?? []).forEach((vibe) => scores.set(vibe, (scores.get(vibe) ?? 0) + 1))
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([vibe]) => VIBE_LABELS[vibe] ?? vibe)
}

const ONBOARDING_ACCENTS = ['#f2a65a', '#75c9e8', '#e85c9a', '#8bc184', '#d7b7f1', '#e46b65']

function starterFromLoot(show: LootShow): StarterTitle {
  return {
    id: show.id,
    name: show.title,
    year: Number(show.year) || undefined,
    mediaType: show.mediaType,
    posterPath: show.posterPath,
    backdropPath: show.backdropPath,
    overview: show.overview,
    genres: ['Animation'],
    rawGenres: show.rawGenres,
    tradition: show.tradition,
    vibeIds: show.vibeIds,
    vibeEvidence: show.vibeEvidence,
    cardDescriptor: show.cardDescriptor,
    accent: ONBOARDING_ACCENTS[Math.abs(show.id) % ONBOARDING_ACCENTS.length],
  }
}

export function FirstSessionOnboarding({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [startedAt] = useState(() => Date.now())
  const [availableTitles, setAvailableTitles] = useState<StarterTitle[]>(STARTER_TITLES)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [focusId, setFocusId] = useState(STARTER_TITLES[0].id)
  const [rankings, setRankings] = useState<Record<number, OnboardingTier>>({})
  const [busy, setBusy] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [nextPage, setNextPage] = useState(1)
  const [hasMoreTitles, setHasMoreTitles] = useState(() => hasTmdbKey())
  const loadingMoreRef = useRef(false)
  const selected = useMemo(() => selectedIds.map((id) => availableTitles.find((title) => title.id === id)!).filter(Boolean), [availableTitles, selectedIds])
  const focused = availableTitles.find((title) => title.id === focusId) ?? selected[0] ?? STARTER_TITLES[0]
  const rankedTitles = selected.filter((title) => rankings[title.id])
  const revealTitle = rankedTitles[0] ?? selected[0] ?? focused
  const revealCards = useMemo(() => {
    if (!rankedTitles.length) return selected.slice(0, 3)
    const others = selected.filter((title) => title.id !== revealTitle.id).slice(0, 2)
    return [others[0], revealTitle, others[1]].filter((title): title is StarterTitle => Boolean(title))
  }, [rankedTitles.length, revealTitle, selected])
  const labels = tasteLabels(selected)

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [])

  const toggleTitle = (title: StarterTitle) => {
    setFocusId(title.id)
    setSelectedIds((current) => {
      if (current.includes(title.id)) return current.filter((id) => id !== title.id)
      navigator.vibrate?.(7)
      return [...current, title.id]
    })
  }

  const loadMoreTitles = async () => {
    if (!hasMoreTitles || loadingMoreRef.current) return
    loadingMoreRef.current = true
    try {
      const [series, movies] = await Promise.all([
        getDiscoverCategoryPage('topRated', nextPage),
        getDiscoverCategoryPage('animatedFilms', nextPage),
      ])
      const incoming = [...series.results, ...movies.results].filter((show) => show.posterPath).map(starterFromLoot)
      setAvailableTitles((current) => {
        const byId = new Map(current.map((title) => [title.id, title]))
        incoming.forEach((title) => byId.set(title.id, title))
        return [...byId.values()]
      })
      setNextPage((page) => page + 1)
      setHasMoreTitles(nextPage < Math.max(series.totalPages, movies.totalPages))
    } catch {
      setHasMoreTitles(false)
    } finally {
      loadingMoreRef.current = false
    }
  }

  const rankTitle = (showId: number, tier: OnboardingTier) => {
    setFocusId(showId)
    setRankings((current) => {
      const next = { ...current }
      if (next[showId] === tier) delete next[showId]
      else next[showId] = tier
      return next
    })
    navigator.vibrate?.(8)
  }

  const persist = async () => {
    if (busy) return
    setBusy(true)
    const now = startedAt
    const shows: Show[] = selected.map((title, index) => ({
      id: title.id, name: title.name, year: title.year, mediaType: title.mediaType, posterPath: title.posterPath, backdropPath: title.backdropPath,
      overview: title.overview, genres: title.genres, rawGenres: title.rawGenres, tradition: title.tradition, vibeIds: title.vibeIds, vibeEvidence: title.vibeEvidence, cardDescriptor: title.cardDescriptor,
      addedAt: now + index, updatedAt: now + index,
    }))
    try {
      await db.transaction('rw', [db.shows, db.tierAssignments], async () => {
        await db.shows.bulkPut(shows)
        const positions: Record<OnboardingTier, number> = { S: 0, A: 0 }
        for (const title of selected) {
          const tier = rankings[title.id]
          if (!tier) continue
          await db.tierAssignments.put({ showId: title.id, tier, position: positions[tier]++, updatedAt: now })
        }
      })
      setFocusId(revealTitle.id)
      setPhase('reveal')
      navigator.vibrate?.([8, 24, 12])
    } finally {
      setBusy(false)
    }
  }

  const enterLoot = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete')
    beginOnboardingFollowup(selectedIds)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    onComplete()
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] overflow-hidden bg-[#050507] text-white">
      <div className="relative mx-auto h-full w-full max-w-md overflow-hidden bg-[#08080a] shadow-[0_0_90px_rgba(0,0,0,.82)]">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={`${phase}-${phase === 'reveal' ? revealTitle.id : focused.id}`}
            src={imgUrl(phase === 'reveal' ? revealTitle.backdropPath : focused.backdropPath, 'original')}
            alt=""
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.68, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-0 h-[48svh] w-full object-cover"
          />
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-[#08080a]/50 to-[#08080a]" />
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 80% 16%, ${phase === 'reveal' ? revealTitle.accent : focused.accent}55, transparent 18rem)` }} />

        <AnimatePresence mode="wait">
          {phase === 'pick' && (
            <motion.section key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24 }} className="relative z-10 flex h-full flex-col">
              <header className={`flex items-center justify-between px-5 pb-3 pt-[max(1.2rem,env(safe-area-inset-top))] transition duration-300 ${headerCollapsed ? 'border-b border-white/[0.08] bg-[#08080a]/88 backdrop-blur-2xl' : ''}`}>
                <motion.span layout className={headerCollapsed ? 'text-[16px] font-black tracking-[-0.04em] text-white' : 'text-[12px] font-black uppercase tracking-[0.3em] text-white'}>{headerCollapsed ? 'Pick at least three.' : 'Loot'}</motion.span>
                <div className="flex gap-1.5" aria-label="Step 1 of 3"><i className="h-1.5 w-5 rounded-full bg-white" /><i className="h-1.5 w-1.5 rounded-full bg-white/20" /><i className="h-1.5 w-1.5 rounded-full bg-white/20" /></div>
              </header>
              <div className={`flex items-end overflow-hidden px-5 transition-[height,padding] duration-300 ease-out ${headerCollapsed ? 'h-0 pb-0' : 'h-[29svh] pb-5'}`}>
                <div>
                  <h1 className="max-w-[330px] text-[42px] font-black leading-[0.88] tracking-[-0.075em] text-balance drop-shadow-2xl">Pick at least three.</h1>
                </div>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 no-scrollbar"
                onScroll={(event) => {
                  const element = event.currentTarget
                  setHeaderCollapsed(element.scrollTop > 28)
                  if (element.scrollHeight - element.scrollTop - element.clientHeight < 700) void loadMoreTitles()
                }}
              >
                <div className="grid grid-cols-3 gap-2">
                  {availableTitles.map((title) => {
                    const selected = selectedIds.includes(title.id)
                    return (
                      <button key={title.id} onClick={() => toggleTitle(title)} className="group relative aspect-[2/3] overflow-hidden rounded-[13px] bg-white/[0.05] text-left shadow-[0_12px_30px_rgba(0,0,0,.28)] ring-1 transition active:scale-[0.97]" style={{ boxShadow: selected ? `0 0 0 2px ${title.accent}, 0 13px 32px rgba(0,0,0,.42)` : undefined, borderColor: selected ? title.accent : 'rgba(255,255,255,.08)' }} aria-pressed={selected} aria-label={`${selected ? 'Remove' : 'Select'} ${title.name}`}>
                        <img src={imgUrl(title.posterPath, 'w342')} alt={title.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/64 via-transparent to-black/5" />
                        {selected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-black shadow-lg" style={{ background: title.accent }}><Check size={13} strokeWidth={3.2} /></motion.span>}
                      </button>
                    )
                  })}
                </div>
                {hasMoreTitles && <div className="flex h-20 items-center justify-center gap-1.5" aria-label="Loading more titles"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/24" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/24 [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/24 [animation-delay:240ms]" /></div>}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08080a] via-[#08080a] to-transparent px-4 pb-[max(1.1rem,env(safe-area-inset-bottom))] pt-10">
                <button disabled={selected.length < 3} onClick={() => { setFocusId(selected[0].id); setPhase('rank'); navigator.vibrate?.(8) }} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-white text-[11px] font-black uppercase tracking-[0.14em] text-black shadow-[0_18px_42px_rgba(0,0,0,.38)] transition active:scale-[0.985] disabled:bg-white/[0.08] disabled:text-white/32">
                  {selected.length < 3 ? `${3 - selected.length} more` : 'Continue'}
                  {selected.length >= 3 && <ChevronRight size={15} strokeWidth={3} />}
                </button>
              </div>
            </motion.section>
          )}

          {phase === 'rank' && (
            <motion.section key="rank" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="relative z-10 flex h-full flex-col">
              <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
                <button onClick={() => setPhase('pick')} className="grid h-9 w-9 place-items-center rounded-full bg-black/32 text-white/78 ring-1 ring-white/[0.1] backdrop-blur-xl" aria-label="Back"><ChevronLeft size={18} /></button>
                <div className="flex gap-1.5" aria-label="Step 2 of 3"><i className="h-1.5 w-1.5 rounded-full bg-white/20" /><i className="h-1.5 w-5 rounded-full bg-white" /><i className="h-1.5 w-1.5 rounded-full bg-white/20" /></div>
              </header>
              <div className="flex min-h-[30svh] items-end px-5 pb-6">
                <h1 className="max-w-[350px] text-[39px] font-black leading-[0.9] tracking-[-0.07em] text-balance">Rank your picks.</h1>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28 no-scrollbar">
                <div className={selected.length > 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-3 gap-3'}>
                  {selected.map((title) => {
                    const currentTier = rankings[title.id]
                    return <article key={title.id} onMouseEnter={() => setFocusId(title.id)} className="min-w-0">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] bg-black shadow-[0_14px_34px_rgba(0,0,0,.4)] ring-1 ring-white/[0.1]">
                        <img src={imgUrl(title.posterPath, 'w342')} alt={title.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-transparent" />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button disabled={busy} onClick={() => rankTitle(title.id, 'S')} className={`h-10 rounded-[11px] border text-[16px] font-black text-rose-300 active:scale-95 disabled:opacity-40 ${currentTier === 'S' ? 'border-rose-200/80 bg-rose-400/36 shadow-[0_0_24px_rgba(251,113,133,.22)]' : 'border-rose-300/30 bg-rose-400/15'}`} aria-pressed={currentTier === 'S'} aria-label={`Rank ${title.name} S tier`}>S</button>
                        <button disabled={busy} onClick={() => rankTitle(title.id, 'A')} className={`h-10 rounded-[11px] border text-[16px] font-black text-orange-300 active:scale-95 disabled:opacity-40 ${currentTier === 'A' ? 'border-orange-200/80 bg-orange-400/36 shadow-[0_0_24px_rgba(251,146,60,.22)]' : 'border-orange-300/30 bg-orange-400/15'}`} aria-pressed={currentTier === 'A'} aria-label={`Rank ${title.name} A tier`}>A</button>
                      </div>
                    </article>
                  })}
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08080a] via-[#08080a] to-transparent px-4 pb-[max(1.1rem,env(safe-area-inset-bottom))] pt-10">
                <button disabled={busy || rankedTitles.length < 1} onClick={() => void persist()} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-white text-[11px] font-black uppercase tracking-[0.14em] text-black shadow-[0_18px_42px_rgba(0,0,0,.38)] active:scale-[0.985] disabled:bg-white/[0.08] disabled:text-white/32">{rankedTitles.length ? 'Continue' : 'Rank at least one'}{rankedTitles.length > 0 && <ChevronRight size={15} strokeWidth={3} />}</button>
              </div>
            </motion.section>
          )}

          {phase === 'reveal' && (
            <motion.section key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 flex h-full flex-col items-center justify-end px-5 pb-[max(1.2rem,env(safe-area-inset-bottom))] text-center">
              <div className="absolute inset-x-0 top-[max(1.3rem,env(safe-area-inset-top))] flex items-center justify-center gap-1.5" aria-label="Step 3 of 3"><i className="h-1.5 w-1.5 rounded-full bg-white/20" /><i className="h-1.5 w-1.5 rounded-full bg-white/20" /><i className="h-1.5 w-5 rounded-full bg-white" /></div>
              <div className="absolute inset-x-0 top-[14svh] mx-auto h-[40svh] max-w-[340px]">
                {revealCards.map((title, index) => {
                  const offset = index - 1
                  const tier = rankings[title.id]
                  return <motion.div key={title.id} initial={{ opacity: 0, y: 45, rotate: 0 }} animate={{ opacity: 1, y: Math.abs(offset) * 15, x: offset * 76, rotate: offset * 8 }} transition={{ delay: index * .09, type: 'spring', stiffness: 150, damping: 18 }} className="absolute left-1/2 top-0 aspect-[2/3] w-[142px] -translate-x-1/2 overflow-hidden rounded-[18px] bg-black shadow-[0_28px_65px_rgba(0,0,0,.62)] ring-1 ring-white/[0.14]" style={{ zIndex: tier ? 8 : 3 - Math.abs(offset), boxShadow: tier ? `0 0 0 3px ${title.accent}, 0 28px 70px rgba(0,0,0,.72)` : undefined }}>
                    <img src={imgUrl(title.posterPath, 'w342')} alt={title.name} className="h-full w-full object-cover" />
                    {tier && <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/78 text-[15px] font-black" style={{ color: title.accent }}>{tier}</span>}
                  </motion.div>
                })}
              </div>
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .32 }} className="relative w-full">
                <Sparkles size={17} className="mx-auto mb-3" style={{ color: revealTitle.accent }} />
                <h1 className="text-[37px] font-black leading-[0.9] tracking-[-0.075em] text-balance">This already feels like you.</h1>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">{labels.map((label) => <span key={label} className="rounded-full border border-white/[0.1] bg-black/24 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-white/58 backdrop-blur-xl">{label}</span>)}</div>
                <button onClick={enterLoot} className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] text-[11px] font-black uppercase tracking-[0.14em] text-black shadow-[0_18px_44px_rgba(0,0,0,.4)] active:scale-[0.985]" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${revealTitle.accent} 74%, white), ${revealTitle.accent})` }}>Show my Loot <ChevronRight size={15} strokeWidth={3} /></button>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
