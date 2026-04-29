import { NextResponse } from 'next/server'
import {
  getTrendingShows,
  getTopRatedShows,
  getPopularShows,
  getShowsByGenre,
  getAiringToday,
  getNetworkShows,
} from '@/lib/tmdb'
import { tmdbToLoot } from '@/lib/loot'

export async function GET() {
  try {
    const [trending, topRated, popular, airingToday, crime, scifi, animation, mystery, netflix, hbo, apple, amazon] =
      await Promise.all([
        getTrendingShows(),
        getTopRatedShows(),
        getPopularShows(),
        getAiringToday(),
        getShowsByGenre(80),    // Crime
        getShowsByGenre(10765), // Sci-Fi & Fantasy
        getShowsByGenre(16),    // Animation
        getShowsByGenre(9648),  // Mystery
        getNetworkShows(213),   // Netflix
        getNetworkShows(49),    // HBO
        getNetworkShows(2552),  // Apple TV+
        getNetworkShows(1024),  // Amazon Prime
      ])

    return NextResponse.json({
      trending: trending.map(tmdbToLoot),
      topRated: topRated.map(tmdbToLoot),
      popular: popular.map(tmdbToLoot),
      airingToday: airingToday.map(tmdbToLoot),
      crime: crime.map(tmdbToLoot),
      scifi: scifi.map(tmdbToLoot),
      animation: animation.map(tmdbToLoot),
      mystery: mystery.map(tmdbToLoot),
      netflix: netflix.map(tmdbToLoot),
      hbo: hbo.map(tmdbToLoot),
      apple: apple.map(tmdbToLoot),
      amazon: amazon.map(tmdbToLoot),
    })
  } catch (err) {
    console.error('[LOOT] TMDB fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 })
  }
}