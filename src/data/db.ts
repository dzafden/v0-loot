import Dexie, { type Table } from 'dexie'
import type {
  Show,
  Collection,
  EmojiCategory,
  TierAssignment,
  EpisodeProgress,
  SeasonCache,
  CastRole,
} from '../types'

export class LootDB extends Dexie {
  shows!: Table<Show, number>
  collections!: Table<Collection, string>
  emojiCategories!: Table<EmojiCategory, string>
  tierAssignments!: Table<TierAssignment, number>
  episodeProgress!: Table<EpisodeProgress, string>
  seasonCache!: Table<SeasonCache, string>
  castRoles!: Table<CastRole, string>

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
  }
}

export const db = new LootDB()
