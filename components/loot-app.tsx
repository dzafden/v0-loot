'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { LootShow, TierData, Tier } from '@/lib/loot'
import { ShopScreen } from '@/components/screens/shop-screen'
import { LockerScreen } from '@/components/screens/locker-screen'
import { RankingsScreen } from '@/components/screens/rankings-screen'
import { ProfileScreen } from '@/components/screens/profile-screen'
import { BottomNav, TabId } from '@/components/bottom-nav'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function LootApp() {
  const [activeTab, setActiveTab] = useState<TabId>('shop')
  const [ownedIds, setOwnedIds] = useState<number[]>([])
  const [tierData, setTierData] = useState<TierData>({ S: [], A: [], B: [], C: [], D: [] })
  const [top8, setTop8] = useState<(number | null)[]>(Array(8).fill(null))

  // Fetch all available shows for total count and locker
  const { data } = useSWR('/api/trending', fetcher)
  const allShows: LootShow[] = useMemo(() => {
    if (!data) return []
    const combined = [...(data.trending ?? []), ...(data.topRated ?? []), ...(data.popular ?? [])]
    const seen = new Set<number>()
    return combined.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
  }, [data])

  const ownedShows = useMemo(
    () => allShows.filter(s => ownedIds.includes(s.id)),
    [allShows, ownedIds]
  )

  const sortedIds = useMemo(() => Object.values(tierData).flat(), [tierData])
  const unsorted = useMemo(
    () => ownedShows.filter(s => !sortedIds.includes(s.id)),
    [ownedShows, sortedIds]
  )

  function handleAdd(id: number) {
    setOwnedIds(prev => prev.includes(id) ? prev : [...prev, id])
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
      <div className="w-full max-w-md relative min-h-screen bg-[#0f0f14] border-x border-white/5 overflow-x-hidden overflow-y-auto pb-32">

        <div className="animate-in fade-in duration-300">
          {activeTab === 'shop' && (
            <ShopScreen ownedIds={ownedIds} onAdd={handleAdd} />
          )}
          {activeTab === 'locker' && (
            <LockerScreen ownedShows={ownedShows} totalShows={allShows.length} />
          )}
          {activeTab === 'rankings' && (
            <RankingsScreen
              ownedShows={ownedShows}
              tierData={tierData}
              onSort={handleSort}
              onRemoveFromTier={handleRemoveFromTier}
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
          lockerCount={ownedIds.length}
          unsortedCount={unsorted.length}
        />
      </div>
    </div>
  )
}
