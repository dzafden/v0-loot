import { useEffect, useMemo, useState } from 'react'
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
import type { Show } from './types'

export default function App() {
  const [tab, setTab] = useState<Tab>('discover')
  const [detail, setDetail] = useState<Show | null>(null)
  const [adding, setAdding] = useState(false)
  const [tracking, setTracking] = useState<Show | null>(null)
  const [castingFor, setCastingFor] = useState<Show | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const shows = useDexieQuery(['shows'], () => db.shows.toArray(), [], [])
  const tiers = useDexieQuery(['tierAssignments'], () => db.tierAssignments.toArray(), [], [])
  const unsortedCount = useMemo(() => {
    const sorted = new Set(tiers.map((t) => t.showId))
    return shows.filter((s) => !sorted.has(s.id)).length
  }, [shows, tiers])

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
    <div className="min-h-svh bg-[#0a0a0c] text-white selection:bg-[#4ade80] selection:text-black flex justify-center">
      <div className="w-full max-w-md relative bg-[#0f0f13] min-h-svh border-x border-white/5 overflow-x-hidden">
        {tab === 'discover' && (
          <Discover onOpenSettings={() => setSettingsOpen(true)} />
        )}
        {tab === 'collection' && (
          <Collection onAddShow={() => setAdding(true)} onOpenShow={setDetail} />
        )}
        {tab === 'rankings' && (
          <Rankings onGoDiscover={() => setTab('discover')} onOpenShow={setDetail} />
        )}
        {tab === 'profile' && <ProfileTab />}

        {detail && !tracking && (
          <ShowDetail
            show={detail}
            onBack={() => setDetail(null)}
            onTrackEpisodes={(s) => setTracking(s)}
            onAssignRole={(s) => setCastingFor(s)}
          />
        )}

        <BottomNav
          active={tab}
          onChange={(t) => {
            setDetail(null)
            setTab(t)
          }}
          unsortedCount={unsortedCount}
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
        {tracking && <EpisodeTracker show={tracking} onClose={() => setTracking(null)} />}
        <AssignRoleSheet show={castingFor} onClose={() => setCastingFor(null)} />

        <IOSInstallBanner />
      </div>
    </div>
  )
}
