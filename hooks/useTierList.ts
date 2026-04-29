'use client'
import { useState, useEffect } from 'react'
import { TierData, LootShow, TIERS, loadTiers, saveTiers, loadShows, saveShows } from '@/lib/loot'

const DEFAULT_TIERS: TierData = { S: [], A: [], B: [], C: [], D: [] }

export function useTierList() {
  const [tiers, setTiers] = useState<TierData>(DEFAULT_TIERS)
  const [shows, setShows] = useState<Record<number, LootShow>>({})

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    const savedTiers = loadTiers()
    const savedShows = loadShows()
    if (savedTiers) setTiers(savedTiers)
    if (savedShows) setShows(savedShows)
  }, [])

  // Persist on every change
  useEffect(() => { saveTiers(tiers) }, [tiers])
  useEffect(() => { saveShows(shows) }, [shows])

  function addToTier(show: LootShow, tier: keyof TierData) {
    setShows(prev => ({ ...prev, [show.id]: show }))
    setTiers(prev => {
      // Remove from any existing tier first
      const cleaned = Object.fromEntries(
        TIERS.map(t => [t, prev[t].filter(id => id !== show.id)])
      ) as TierData
      return { ...cleaned, [tier]: [...cleaned[tier], show.id] }
    })
  }

  function removeFromTier(showId: number) {
    setTiers(prev =>
      Object.fromEntries(
        TIERS.map(t => [t, prev[t].filter(id => id !== showId)])
      ) as TierData
    )
  }

  return { tiers, shows, addToTier, removeFromTier }
}