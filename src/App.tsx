import { useCallback, useEffect, useMemo, useState } from 'react'
import { BottomNav, type Tab } from './components/ui/BottomNav'
import { Collection } from './features/library/Collection'
import { Rankings } from './features/tier-game/Rankings'
import { ProfileTab } from './features/profile/ProfileTab'
import { Discover } from './features/discover/Discover'
import { ShowDetail } from './features/show-detail/ShowDetail'
import { AddShowSheet } from './features/library/AddShowSheet'
import { EpisodeTracker } from './features/episode-tracker/EpisodeTracker'
import { AssignRoleSheet } from './features/cast-roles/AssignRoleSheet'
import { SettingsSheet } from './features/settings/SettingsSheet'
import { IOSInstallBanner } from './components/ui/IOSInstallBanner'
import { db } from './data/db'
import { useDexieQuery } from './hooks/useDexieQuery'
import type { RecommendationContext, Show } from './types'
import { AnimatePresence } from 'framer-motion'
import { FirstSessionOnboarding, ONBOARDING_STORAGE_KEY } from './features/onboarding/FirstSessionOnboarding'
import { hasTmdbKey } from './lib/tmdb'

type CastingTarget = {
  show: Show
  personId?: number
}

type DetailTarget = {
  show: Show
  recommendationContext?: RecommendationContext
}

type LootHistoryState = {
  lootApp: true
  tab: Tab
  detail: DetailTarget | null
}

const APP_TABS: Tab[] = ['discover', 'collection', 'rankings', 'profile']

function historyState(value: unknown): LootHistoryState | null {
  if (!value || typeof value !== 'object') return null
  const state = value as Partial<LootHistoryState>
  if (state.lootApp !== true || !APP_TABS.includes(state.tab as Tab)) return null
  return { lootApp: true, tab: state.tab as Tab, detail: state.detail ?? null }
}

export default function App() {
  const initialHistory = historyState(window.history.state)
  const [tab, setTab] = useState<Tab>(() => initialHistory?.tab ?? 'discover')
  const [detail, setDetail] = useState<DetailTarget | null>(() => initialHistory?.detail ?? null)
  const [adding, setAdding] = useState(false)
  const [tracking, setTracking] = useState<Show | null>(null)
  const [castingFor, setCastingFor] = useState<CastingTarget | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(() => {
    try { return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'complete' ? false : null } catch { return null }
  })

  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const tiers = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const unsortedCount = useMemo(() => {
    const sorted = new Set(tiers.map((t) => t.showId))
    return shows.filter((s) => !sorted.has(s.id)).length
  }, [shows, tiers])

  useEffect(() => {
    if (showOnboarding !== null) return
    db.shows.count().then((count) => {
      if (count > 0) {
        try { localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete') } catch { /* Device storage is optional. */ }
        setShowOnboarding(false)
      } else {
        setShowOnboarding(true)
      }
    }).catch(() => setShowOnboarding(false))
  }, [showOnboarding])

  useEffect(() => {
    if (!historyState(window.history.state)) {
      window.history.replaceState({ lootApp: true, tab, detail }, '')
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = historyState(event.state)
      if (!state) return
      setTab(state.tab)
      setDetail(state.detail)
      setTracking(null)
      setCastingFor(null)
      setAdding(false)
      setSettingsOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openDetail = useCallback((show: Show, recommendationContext?: RecommendationContext) => {
    const target = { show, recommendationContext }
    window.history.pushState({ lootApp: true, tab, detail: target }, '')
    setDetail(target)
  }, [tab])

  const closeDetail = useCallback(() => {
    const current = historyState(window.history.state)
    if (current?.detail) {
      window.history.back()
      return
    }
    setDetail(null)
  }, [])

  const navigateTab = useCallback((nextTab: Tab) => {
    if (nextTab === tab && !detail) return
    window.history.pushState({ lootApp: true, tab: nextTab, detail: null }, '')
    setDetail(null)
    setTab(nextTab)
  }, [detail, tab])

  // Inject keyframes for shine animation (used by LootCard).
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes shine { 100% { left: 200%; } }
      .animate-shine { animation: shine 1.4s ease-in-out infinite; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="min-h-svh text-white selection:bg-[#f5c453] selection:text-black flex justify-center bg-[#050507]">
      <div className="fixed inset-0 pointer-events-none loot-noise opacity-[0.26]" aria-hidden />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-12%,rgba(255,190,106,0.18),transparent_34rem),radial-gradient(circle_at_88%_28%,rgba(74,222,128,0.08),transparent_22rem)]" aria-hidden />
      <div className="w-full max-w-md relative bg-[#08070a]/92 min-h-svh overflow-x-hidden shadow-[0_0_80px_rgba(0,0,0,0.75)]">
        {tab === 'discover' && (
          <Discover
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenShow={openDetail}
          />
        )}
        {tab === 'collection' && (
          <Collection onAddShow={() => setAdding(true)} onOpenShow={(show) => openDetail(show)} />
        )}
        {tab === 'rankings' && (
          <Rankings onGoDiscover={() => navigateTab('discover')} onOpenShow={(show) => openDetail(show)} />
        )}
        {tab === 'profile' && <ProfileTab onOpenShow={(show) => openDetail(show)} />}

        <AnimatePresence mode="wait">
          {detail && !tracking && (
            <ShowDetail
              key={detail.show.id}
              show={detail.show}
              recommendationContext={detail.recommendationContext}
              onBack={closeDetail}
              onOpenShow={(show) => openDetail(show)}
              onTrackEpisodes={(s) => setTracking(s)}
              onAssignRole={(s, personId) => setCastingFor({ show: s, personId })}
            />
          )}
        </AnimatePresence>

        <BottomNav
          active={tab}
          onChange={navigateTab}
          unsortedCount={unsortedCount}
          subdued={Boolean(detail)}
        />

        <AddShowSheet
          open={adding}
          onClose={() => setAdding(false)}
          onOpenSettings={() => {
            setAdding(false)
            setSettingsOpen(true)
          }}
        />
        <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {tracking && (tracking.mediaType ?? 'tv') === 'tv' && <EpisodeTracker show={tracking} onClose={() => setTracking(null)} />}
        <AssignRoleSheet show={castingFor?.show ?? null} initialPersonId={castingFor?.personId} onClose={() => setCastingFor(null)} />

        <IOSInstallBanner />
        {showOnboarding === null && <div className="fixed inset-0 z-[99] bg-[#050507]" aria-hidden />}
        <AnimatePresence>
          {showOnboarding && <FirstSessionOnboarding onComplete={() => { navigateTab(hasTmdbKey() ? 'discover' : 'collection'); setShowOnboarding(false) }} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
