import { NextResponse } from 'next/server'
import { searchShows } from '@/lib/tmdb'
import { tmdbToLoot } from '@/lib/loot'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') ?? ''
  
  if (!query.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchShows(query)
    return NextResponse.json({ results: results.map(tmdbToLoot) })
  } catch (err) {
    console.error('[LOOT] Search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
