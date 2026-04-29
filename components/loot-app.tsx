'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { LootShow, TierData, Tier } from '@/lib/loot'
import { DiscoverScreen } from '@/components/screens/discover-screen'
import { CollectionScreen } from '@/components/screens/collection-screen'
import { RankingsScreen } from '@/components/screens/rankings-screen'
import { ProfileScreen } from '@/components/screens/profile-screen'
import { BottomNav, TabId } from '@/components/bottom-nav'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ── Storage helpers ───────────────────────────────────────────────────────────

function loadState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveState<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TIERS: TierData = { S: [], A: [], B: [], C: [], D: [] }
const DEFAULT_TOP8: (number | null)[] = Array(8).fill(null)

// ── Component ─────────────────────────────────────────────────────────────────

export function LootApp() {
  const [activeTab, setActiveTab] = useState<TabId>('discover')

  const [ownedIds, setOwnedIds] = useState<number[]>(() => loadState('loot-owned', []))
  const [showCache, setShowCache] = useState<Record<number, LootShow>>(() => loadState('loot-show-cache', {}))
  const [tierData, setTierData] = useState<TierData>(() => loadState('loot-tiers', DEFAULT_TIERS))
  const [top8, setTop8] = useState<(number | null)[]>(() => loadState('loot-top8', DEFAULT_TOP8))

  useEffect(() => { saveState('loot-owned', ownedIds) }, [ownedIds])
  useEffect(() => { saveState('loot-tiers', tierData) }, [tierData])
  useEffect(() => { saveState('loot-top8', top8) }, [top8])
  useEffect(() => { saveState('loot-show-cache', showCache) }, [showCache])

  const { data } = useSWR('/api/trending', fetcher)

  // Deduplicated list of all shows from the trending API
  const allShows: LootShow[] = useMemo(() => {
    if (!data) return []
    const combined = [
      ...(data.trending ?? []),
      ...(data.topRated ?? []),
      ...(data.popular ?? []),
      ...(data.airingToday ?? []),
      ...(data.crime ?? []),
      ...(data.scifi ?? []),
      ...(data.animation ?? []),
      ...(data.mystery ?? []),
      ...(data.netflix ?? []),
      ...(data.hbo ?? []),
      ...(data.apple ?? []),
      ...(data.amazon ?? []),
    ]
    const seen = new Set<number>()
    return combined.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
  }, [data])

  // Owned shows — merges API shows with search-result cache so search adds work
  const ownedShows = useMemo(() => {
    return ownedIds
      .map(id => allShows.find(s => s.id === id) ?? showCache[id] ?? null)
      .filter(Boolean) as LootShow[]
  }, [allShows, ownedIds, showCache])

  const sortedIds = useMemo(() => Object.values(tierData).flat(), [tierData])
  const unsorted = useMemo(
    () => ownedShows.filter(s => !sortedIds.includes(s.id)),
    [ownedShows, sortedIds]
  )

  function handleAdd(id: number, show?: LootShow) {
    setOwnedIds(prev => prev.includes(id) ? prev : [...prev, id])
    if (show) {
      setShowCache(prev => ({ ...prev, [id]: show }))
    }
  }

  function handleSort(showId: number, tier: Tier) {
    setTierData(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(k => {
        updated[k as Tier] = updated[k as Tier].filter(id => id !== showId)
      })
      updated[tier] = [...updated[tier], showId]
      return updated
    })
  }

  function handleRemoveFromTier(showId: number, tier: Tier) {
    setTierData(prev => ({
      ...prev,
      [tier]: prev[tier].filter(id => id !== showId),
    }))
  }

  function handleSetTop8(index: number, showId: number | null) {
    setTop8(prev => {
      const updated = [...prev]
      if (showId !== null) {
        const existing = updated.indexOf(showId)
        if (existing > -1) updated[existing] = null
      }
      updated[index] = showId
      return updated
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center w-full">
      <div className="w-full max-w-md relative min-h-screen bg-[#0f0f13] border-x border-white/5 overflow-x-hidden overflow-y-auto pb-32">
        <div className="animate-in fade-in duration-300">
          {activeTab === 'discover' && (
            <DiscoverScreen ownedIds={ownedIds} onAdd={handleAdd} />
          )}
          {activeTab === 'collection' && (
            <CollectionScreen ownedShows={ownedShows} />
          )}
          {activeTab === 'rankings' && (
            <RankingsScreen
              ownedShows={ownedShows}
              tierData={tierData}
              onSort={handleSort}
              onRemoveFromTier={handleRemoveFromTier}
              onGoDiscover={() => setActiveTab('discover')}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileScreen
              ownedShows={ownedShows}
              top8={top8}
              onSetTop8={handleSetTop8}
            />
          )}
        </div>

        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collectionCount={ownedIds.length}
          unsortedCount={unsorted.length}
        />
      </div>
    </div>
  )
}