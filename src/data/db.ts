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
  DiscoverFeedback,
  FranchiseDefinition,
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
  discoverFeedback!: Table<DiscoverFeedback, number>
  franchiseDefinitions!: Table<FranchiseDefinition, number>

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
    this.version(4).stores({
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
      discoverFeedback: 'showId, hiddenUntil, updatedAt',
    })
    this.version(5).stores({
      shows: 'id, name, addedAt, updatedAt, top8Position',
      collections: 'id, name, createdAt',
      emojiCategories: 'id, emoji, createdAt',
      tierAssignments: 'showId, tier, updatedAt',
      episodeProgress: 'key, showId, [showId+seasonNumber], watched, watchedAt',
      seasonCache: 'key, showId, fetchedAt',
      castRoles: 'id, showId, roleName, createdAt',
      watchlistShows: 'id, name, addedAt, updatedAt',
      watchlistShelves: 'id, name, createdAt, updatedAt',
      canvasItems: null,
      discoverFeedback: 'showId, hiddenUntil, updatedAt',
    })
    this.version(6).stores({
      shows: 'id, name, addedAt, updatedAt, top8Position, tradition',
      collections: 'id, name, createdAt',
      emojiCategories: 'id, emoji, createdAt',
      tierAssignments: 'showId, tier, updatedAt',
      episodeProgress: 'key, showId, [showId+seasonNumber], watched, watchedAt',
      seasonCache: 'key, showId, fetchedAt',
      castRoles: 'id, showId, roleName, createdAt',
      watchlistShows: 'id, name, addedAt, updatedAt, tradition',
      watchlistShelves: 'id, name, createdAt, updatedAt',
      discoverFeedback: 'showId, hiddenUntil, updatedAt',
    }).upgrade(async (tx) => {
      await tx.table('shows').toCollection().modify((show) => {
        show.mediaType ??= 'tv'
      })
      await tx.table('watchlistShows').toCollection().modify((show) => {
        show.mediaType ??= 'tv'
      })
    })
    this.version(7).stores({
      shows: 'id, name, addedAt, updatedAt, top8Position, tradition',
      collections: 'id, name, createdAt',
      emojiCategories: 'id, emoji, createdAt',
      tierAssignments: 'showId, tier, updatedAt',
      episodeProgress: 'key, showId, [showId+seasonNumber], watched, watchedAt',
      seasonCache: 'key, showId, fetchedAt',
      castRoles: 'id, showId, roleName, createdAt',
      watchlistShows: 'id, name, addedAt, updatedAt, tradition',
      watchlistShelves: 'id, name, createdAt, updatedAt',
      discoverFeedback: 'showId, hiddenUntil, updatedAt',
      franchiseDefinitions: 'id, name, updatedAt',
    })
  }
}

export const db = new LootDB()
