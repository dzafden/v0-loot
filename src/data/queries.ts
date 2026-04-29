import { db } from './db'
import type {
  CastRole,
  Collection,
  EmojiCategory,
  EpisodeProgress,
  SeasonCache,
  Show,
  Tier,
  TierAssignment,
} from '../types'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// ---------- shows ----------

export async function upsertShow(show: Show) {
  await db.shows.put({ ...show, updatedAt: Date.now() })
}

export async function deleteShow(id: number) {
  await db.transaction(
    'rw',
    [
      db.shows,
      db.tierAssignments,
      db.episodeProgress,
      db.seasonCache,
      db.castRoles,
      db.collections,
      db.emojiCategories,
    ],
    async () => {
      await db.shows.delete(id)
      await db.tierAssignments.delete(id)
      await db.episodeProgress.where({ showId: id }).delete()
      await db.seasonCache.where({ showId: id }).delete()
      await db.castRoles.where({ showId: id }).delete()
      // remove from collections / emoji categories
      const cols = await db.collections.toArray()
      for (const c of cols) {
        if (c.showIds.includes(id)) {
          await db.collections.update(c.id, {
            showIds: c.showIds.filter((s) => s !== id),
          })
        }
      }
      const emojis = await db.emojiCategories.toArray()
      for (const e of emojis) {
        if (e.showIds.includes(id)) {
          await db.emojiCategories.update(e.id, {
            showIds: e.showIds.filter((s) => s !== id),
          })
        }
      }
    },
  )
}

// ---------- top 8 ----------

export async function setTop8(showId: number, position: number | null) {
  if (position === null) {
    await db.shows.update(showId, { top8Position: null })
    return
  }
  const all = await db.shows.where('top8Position').above(-1).toArray()
  if (all.filter((s) => s.id !== showId).length >= 8) {
    throw new Error('Top 8 is full — remove a show first.')
  }
  await db.shows.update(showId, { top8Position: position })
}

export async function reorderTop8(orderedIds: number[]) {
  await db.transaction('rw', db.shows, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.shows.update(orderedIds[i], { top8Position: i })
    }
  })
}

export async function getTop8(): Promise<Show[]> {
  const all = await db.shows.toArray()
  return all
    .filter((s) => typeof s.top8Position === 'number' && s.top8Position! >= 0)
    .sort((a, b) => (a.top8Position! - b.top8Position!))
}

// ---------- collections ----------

export async function createCollection(name: string): Promise<Collection> {
  const c: Collection = { id: uid(), name, showIds: [], createdAt: Date.now() }
  await db.collections.add(c)
  return c
}

export async function renameCollection(id: string, name: string) {
  await db.collections.update(id, { name })
}

export async function deleteCollection(id: string) {
  await db.collections.delete(id)
}

export async function addToCollection(id: string, showId: number) {
  const c = await db.collections.get(id)
  if (!c) return
  if (!c.showIds.includes(showId)) {
    await db.collections.update(id, { showIds: [...c.showIds, showId] })
  }
}

export async function removeFromCollection(id: string, showId: number) {
  const c = await db.collections.get(id)
  if (!c) return
  await db.collections.update(id, {
    showIds: c.showIds.filter((s) => s !== showId),
  })
}

// ---------- emoji categories ----------

export async function createEmojiCategory(emoji: string, label?: string): Promise<EmojiCategory> {
  const c: EmojiCategory = {
    id: uid(),
    emoji,
    label,
    showIds: [],
    createdAt: Date.now(),
  }
  await db.emojiCategories.add(c)
  return c
}

export async function deleteEmojiCategory(id: string) {
  await db.emojiCategories.delete(id)
}

export async function applyEmoji(categoryId: string, showId: number) {
  const c = await db.emojiCategories.get(categoryId)
  if (!c) return
  if (!c.showIds.includes(showId)) {
    await db.emojiCategories.update(categoryId, {
      showIds: [...c.showIds, showId],
    })
  }
}

export async function removeEmoji(categoryId: string, showId: number) {
  const c = await db.emojiCategories.get(categoryId)
  if (!c) return
  await db.emojiCategories.update(categoryId, {
    showIds: c.showIds.filter((s) => s !== showId),
  })
}

export async function emojisForShow(showId: number): Promise<EmojiCategory[]> {
  const all = await db.emojiCategories.toArray()
  return all.filter((c) => c.showIds.includes(showId))
}

// ---------- tier ----------

export async function setTier(showId: number, tier: Tier | null) {
  if (tier === null) {
    await db.tierAssignments.delete(showId)
    return
  }
  const existing = await db.tierAssignments
    .where('tier')
    .equals(tier)
    .count()
  const assignment: TierAssignment = {
    showId,
    tier,
    position: existing,
    updatedAt: Date.now(),
  }
  await db.tierAssignments.put(assignment)
}

export async function reorderTier(tier: Tier, orderedIds: number[]) {
  await db.transaction('rw', db.tierAssignments, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.tierAssignments.put({
        showId: orderedIds[i],
        tier,
        position: i,
        updatedAt: Date.now(),
      })
    }
  })
}

export async function clearAllTiers() {
  await db.tierAssignments.clear()
}

export async function tierMap(): Promise<Map<number, Tier>> {
  const all = await db.tierAssignments.toArray()
  const m = new Map<number, Tier>()
  for (const a of all) m.set(a.showId, a.tier)
  return m
}

// ---------- episodes ----------

export function progressKey(showId: number, season: number, ep: number) {
  return `${showId}-${season}-${ep}`
}

export async function setEpisodeWatched(
  showId: number,
  season: number,
  ep: number,
  watched: boolean,
) {
  const key = progressKey(showId, season, ep)
  const record: EpisodeProgress = {
    key,
    showId,
    seasonNumber: season,
    episodeNumber: ep,
    watched,
    watchedAt: watched ? Date.now() : undefined,
  }
  await db.episodeProgress.put(record)
}

export async function setSeasonWatched(
  showId: number,
  season: number,
  episodeNumbers: number[],
  watched: boolean,
) {
  await db.transaction('rw', db.episodeProgress, async () => {
    for (const ep of episodeNumbers) {
      await setEpisodeWatched(showId, season, ep, watched)
    }
  })
}

export async function setAllCachedSeasonsWatched(showId: number, watched: boolean) {
  const seasons = await db.seasonCache.where({ showId }).toArray()
  await db.transaction('rw', db.episodeProgress, async () => {
    for (const season of seasons) {
      const episodeNumbers = season.episodes.map((ep) => ep.episode_number)
      await setSeasonWatched(showId, season.seasonNumber, episodeNumbers, watched)
    }
  })
}

export async function progressForShow(
  showId: number,
): Promise<{ watched: number; total: number }> {
  const seasons = await db.seasonCache.where({ showId }).toArray()
  const total = seasons.reduce((sum, s) => sum + s.episodes.length, 0)
  const watched = await db.episodeProgress
    .where({ showId })
    .filter((p) => p.watched)
    .count()
  return { watched, total }
}

export async function progressMap(): Promise<Map<number, { watched: number; total: number }>> {
  const seasons = await db.seasonCache.toArray()
  const totalByShow = new Map<number, number>()
  for (const s of seasons) {
    totalByShow.set(s.showId, (totalByShow.get(s.showId) ?? 0) + s.episodes.length)
  }
  const watchedRecords = await db.episodeProgress.filter((p) => p.watched).toArray()
  const watchedByShow = new Map<number, number>()
  for (const r of watchedRecords) {
    watchedByShow.set(r.showId, (watchedByShow.get(r.showId) ?? 0) + 1)
  }
  const out = new Map<number, { watched: number; total: number }>()
  for (const [id, total] of totalByShow) {
    out.set(id, { watched: watchedByShow.get(id) ?? 0, total })
  }
  return out
}

export async function cacheSeason(s: SeasonCache) {
  await db.seasonCache.put(s)
}

// ---------- cast roles ----------

export async function createCastRole(role: Omit<CastRole, 'id' | 'createdAt'>): Promise<CastRole> {
  const r: CastRole = { ...role, id: uid(), createdAt: Date.now() }
  await db.castRoles.add(r)
  return r
}

export async function deleteCastRole(id: string) {
  await db.castRoles.delete(id)
}

export async function listCastRoles(): Promise<CastRole[]> {
  return db.castRoles.orderBy('createdAt').reverse().toArray()
}
