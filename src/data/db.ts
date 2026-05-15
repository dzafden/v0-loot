import Dexie, { type Table } from 'dexie'
import type {
  Show,
  Collection,
  EmojiCategory,
  TierAssignment,
  EpisodeProgress,
  SeasonCache,
  CastRole,
  WatchlistShelf,
  CanvasItem,
} from '../types'

export class LootDB extends Dexie {
  shows!: Table<Show, number>
  collections!: Table<Collection, string>
  emojiCategories!: Table<EmojiCategory, string>
  tierAssignments!: Table<TierAssignment, number>
  episodeProgress!: Table<EpisodeProgress, string>
  seasonCache!: Table<SeasonCache, string>
  castRoles!: Table<CastRole, string>
  watchlistShows!: Table<Show, number>
  watchlistShelves!: Table<WatchlistShelf, string>
  canvasItems!: Table<CanvasItem, string>

  constructor() {
    super('loot')
    this.version(1).stores({
      shows: 'id, name, addedAt, updatedAt, top8Position',
      collections: 'id, name, createdAt',
      emojiCategories: 'id, emoji, createdAt',
      tierAssignments: 'showId, tier, updatedAt',
      episodeProgress: 'key, showId, [showId+seasonNumber], watched, watchedAt',
      seasonCache: 'key, showId, fetchedAt',
      castRoles: 'id, showId, roleName, createdAt',
    })
    this.version(2).stores({
      shows: 'id, name, addedAt, updatedAt, top8Position',
      collections: 'id, name, createdAt',
      emojiCategories: 'id, emoji, createdAt',
      tierAssignments: 'showId, tier, updatedAt',
      episodeProgress: 'key, showId, [showId+seasonNumber], watched, watchedAt',
      seasonCache: 'key, showId, fetchedAt',
      castRoles: 'id, showId, roleName, createdAt',
      watchlistShows: 'id, name, addedAt, updatedAt',
      watchlistShelves: 'id, name, createdAt, updatedAt',
    })
    this.version(3).stores({
      shows: 'id, name, addedAt, updatedAt, top8Position',
      collections: 'id, name, createdAt',
      emojiCategories: 'id, emoji, createdAt',
      tierAssignments: 'showId, tier, updatedAt',
      episodeProgress: 'key, showId, [showId+seasonNumber], watched, watchedAt',
      seasonCache: 'key, showId, fetchedAt',
      castRoles: 'id, showId, roleName, createdAt',
      watchlistShows: 'id, name, addedAt, updatedAt',
      watchlistShelves: 'id, name, createdAt, updatedAt',
      canvasItems: 'id, showId, kind, createdAt, updatedAt',
    })
  }
}

export const db = new LootDB()
