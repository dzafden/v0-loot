import { NextResponse } from 'next/server'
import { getTrendingShows, getTopRatedShows, getPopularShows } from '@/lib/tmdb'
import { tmdbToLoot } from '@/lib/loot'

export async function GET() {
  try {
    const [trending, topRated, popular] = await Promise.all([
      getTrendingShows(),
      getTopRatedShows(),
      getPopularShows(),
    ])

    return NextResponse.json({
      trending: trending.map(tmdbToLoot),
      topRated: topRated.map(tmdbToLoot),
      popular: popular.map(tmdbToLoot),
    })
  } catch (err) {
    console.error('[LOOT] TMDB fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 })
  }
}
