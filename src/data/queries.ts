import { db } from './db'
import type {
  CastRole,
  CanvasItem,
  Collection,
  EmojiCategory,
  EpisodeProgress,
  SeasonCache,
  Show,
  Tier,
  TierAssignment,
  WatchlistShelf,
} from '../types'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const WATCHLIST_SHELF_SUGGESTIONS = [
  'Watch next',
  'Someday',
  'Comfort chaos',
  'Cry later',
  'Binge with friends',
  'Animated brainrot',
  'One serious episode',
  'Weekend canon',
  'Maybe actually',
]

type CanvasDraft = Omit<CanvasItem, 'id' | 'x' | 'y' | 'scale' | 'createdAt' | 'updatedAt'> & {
  x?: number
  y?: number
  scale?: number
}

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
      db.canvasItems,
      db.collections,
      db.emojiCategories,
    ],
    async () => {
      await db.shows.delete(id)
      await db.tierAssignments.delete(id)
      await db.episodeProgress.where({ showId: id }).delete()
      await db.seasonCache.where({ showId: id }).delete()
      await db.castRoles.where({ showId: id }).delete()
      await db.canvasItems.where({ showId: id }).delete()
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

// ---------- canvas ----------

export async function addCanvasItem(item: CanvasDraft): Promise<CanvasItem> {
  const now = Date.now()
  const existing = await db.canvasItems.toArray()
  const offset = existing.length % 8
  const canvasItem: CanvasItem = {
    ...item,
    id: uid(),
    x: item.x ?? 120 + offset * 34,
    y: item.y ?? 120 + offset * 42,
    scale: item.scale ?? 1,
    createdAt: now,
    updatedAt: now,
  }
  await db.canvasItems.add(canvasItem)
  return canvasItem
}

export async function updateCanvasItem(id: string, patch: Partial<Pick<CanvasItem, 'x' | 'y' | 'scale'>>) {
  await db.canvasItems.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteCanvasItem(id: string) {
  await db.canvasItems.delete(id)
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

// ---------- watchlist shelves ----------

export async function createWatchlistShelf(name: string): Promise<WatchlistShelf> {
  const existing = await db.watchlistShelves.toArray()
  const lastPosition = existing.reduce((max, shelf, index) => {
    const position = typeof shelf.position === 'number' ? shelf.position : index
    return Math.max(max, position)
  }, -1)
  const shelf: WatchlistShelf = {
    id: uid(),
    name,
    showIds: [],
    position: lastPosition + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await db.watchlistShelves.add(shelf)
  return shelf
}

export async function ensureDefaultWatchlistShelves(): Promise<WatchlistShelf[]> {
  return db.transaction('rw', db.watchlistShelves, async () => {
    const existing = await db.watchlistShelves.toArray()
    const defaultNames = ['Watch next', 'Someday']
    const legacyDefaultNames = ['Watching next', 'Maybe actually', 'Binge with friends']

    if (!existing.length) {
      const now = Date.now()
      const defaults: WatchlistShelf[] = defaultNames.map((name, index) => ({
        id: `default-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        showIds: [],
        position: index,
        createdAt: now + index,
        updatedAt: now + index,
      }))
      await db.watchlistShelves.bulkPut(defaults)
      return defaults
    }

    // React StrictMode can double-run first-mount effects. Only clean up duplicate
    // empty defaults; never delete a shelf once the user has put shows into it.
    const byDefaultName = new Map<string, WatchlistShelf[]>()
    for (const shelf of existing) {
      if (![...defaultNames, ...legacyDefaultNames].includes(shelf.name)) continue
      byDefaultName.set(shelf.name, [...(byDefaultName.get(shelf.name) ?? []), shelf])
    }
    for (const shelves of byDefaultName.values()) {
      const sorted = [...shelves].sort((a, b) => a.createdAt - b.createdAt)
      const emptyDuplicates = sorted.slice(1).filter((shelf) => shelf.showIds.length === 0)
      for (const shelf of emptyDuplicates) await db.watchlistShelves.delete(shelf.id)
    }

    for (const legacyName of legacyDefaultNames) {
      const legacy = await db.watchlistShelves
        .filter((shelf) => shelf.name === legacyName && shelf.showIds.length === 0)
        .toArray()
      for (const shelf of legacy) await db.watchlistShelves.delete(shelf.id)
    }

    const current = await db.watchlistShelves.toArray()
    const currentNames = new Set(current.map((shelf) => shelf.name))
    const now = Date.now()
    for (const name of defaultNames) {
      if (currentNames.has(name)) continue
      await db.watchlistShelves.put({
        id: `default-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        showIds: [],
        position: current.length + defaultNames.indexOf(name),
        createdAt: now + defaultNames.indexOf(name),
        updatedAt: now + defaultNames.indexOf(name),
      })
    }

    const normalized = await db.watchlistShelves.toArray()
    const priority = new Map(defaultNames.map((name, index) => [name, index]))
    const ordered = [...normalized].sort((a, b) => {
      const ap = typeof a.position === 'number' ? a.position : undefined
      const bp = typeof b.position === 'number' ? b.position : undefined
      if (ap !== undefined || bp !== undefined) return (ap ?? 999) - (bp ?? 999)
      const ad = priority.get(a.name)
      const bd = priority.get(b.name)
      if (ad !== undefined || bd !== undefined) return (ad ?? 99) - (bd ?? 99)
      return a.createdAt - b.createdAt
    })
    for (let index = 0; index < ordered.length; index++) {
      if (ordered[index].position === index) continue
      await db.watchlistShelves.update(ordered[index].id, { position: index, updatedAt: Date.now() })
    }

    return db.watchlistShelves.toArray()
  }).then((shelves) => shelves.sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || a.createdAt - b.createdAt))
}

export async function renameWatchlistShelf(id: string, name: string) {
  await db.watchlistShelves.update(id, { name, updatedAt: Date.now() })
}

export async function deleteWatchlistShelf(id: string) {
  await db.watchlistShelves.delete(id)
}

export async function reorderWatchlistShelves(orderedIds: string[]) {
  await db.transaction('rw', db.watchlistShelves, async () => {
    for (let index = 0; index < orderedIds.length; index++) {
      await db.watchlistShelves.update(orderedIds[index], { position: index, updatedAt: Date.now() })
    }
  })
}

export async function addToWatchlistShelf(shelfId: string, show: Show) {
  await db.transaction('rw', [db.watchlistShows, db.watchlistShelves], async () => {
    await db.watchlistShows.put({
      ...show,
      addedAt: show.addedAt || Date.now(),
      updatedAt: Date.now(),
    })
    const shelf = await db.watchlistShelves.get(shelfId)
    if (!shelf || shelf.showIds.includes(show.id)) return
    await db.watchlistShelves.update(shelfId, {
      showIds: [...shelf.showIds, show.id],
      updatedAt: Date.now(),
    })
  })
}

export async function removeFromWatchlistShelf(shelfId: string, showId: number) {
  const shelf = await db.watchlistShelves.get(shelfId)
  if (!shelf) return
  await db.watchlistShelves.update(shelfId, {
    showIds: shelf.showIds.filter((id) => id !== showId),
    updatedAt: Date.now(),
  })
}

export async function updateWatchlistShelfShows(shelfId: string, showIds: number[]) {
  await db.watchlistShelves.update(shelfId, {
    showIds,
    updatedAt: Date.now(),
  })
}

export async function moveWatchlistShow(showId: number, fromShelfId: string, toShelfId: string, toIndex?: number) {
  await db.transaction('rw', db.watchlistShelves, async () => {
    const fromShelf = await db.watchlistShelves.get(fromShelfId)
    const toShelf = await db.watchlistShelves.get(toShelfId)
    if (!fromShelf || !toShelf) return

    const fromIds = fromShelf.showIds.filter((id) => id !== showId)
    const nextToIds = toShelf.id === fromShelf.id ? fromIds : toShelf.showIds.filter((id) => id !== showId)
    const insertAt = Math.max(0, Math.min(toIndex ?? nextToIds.length, nextToIds.length))
    nextToIds.splice(insertAt, 0, showId)

    await db.watchlistShelves.update(fromShelfId, { showIds: fromIds, updatedAt: Date.now() })
    await db.watchlistShelves.update(toShelfId, { showIds: nextToIds, updatedAt: Date.now() })
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
