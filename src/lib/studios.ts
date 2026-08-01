import type { AnimationTradition } from '../types'

/**
 * Curated animation studio registry.
 *
 * WHY THIS IS HAND-CURATED
 * TMDB's company data cannot be trusted unsupervised:
 *   1. `production_companies` is ordered by rights-holder, not by author. Bob's Burgers
 *      returns "20th Century Fox Television" first; the actual studio (Bento Box) is second.
 *      Attack on Titan returns eight entries mixing three real studios with a publisher,
 *      a broadcaster and an advertising agency (dentsu). NEVER take `companies[0]`.
 *   2. Company name search resolves to the wrong entity often enough to be unusable.
 *      "ufotable" → an empty duplicate; "Trigger" → an entity with 1 title; "Toei Animation",
 *      "Production I.G", "Studio Mir", "Six Point Harness" and "Walt Disney Animation Studios"
 *      all resolve to near-empty decoys before the real record.
 * Every `id` below was verified by querying it and confirming the returned filmography.
 *
 * MEMBERSHIP, BY CONTRAST, *CAN* BE DERIVED — see FILTER below.
 *
 * INCLUSION TEST — an entry must pass one:
 *   'revelation' — authorship is invisible until revealed, and the body of work forms a
 *                  coherent cluster. Learning that BoJack, Robot Chicken, Moral Orel and
 *                  Tuca & Bertie are all ShadowMachine explains a taste cluster the user
 *                  could not previously name. This is cultural capital Loot *confers*.
 *   'canon'      — a known, bounded, authored body a fan would want to complete (Ghibli, Laika).
 *
 * EXCLUDED, DELIBERATELY:
 *   - Networks and broadcasters (FOX, Adult Swim, Netflix, Cartoon Network). They fail both
 *     tests: already branded on the front of the thing, so they teach nothing, and unbounded,
 *     so they cannot be completed.
 *   - Rights-holders and corporate shells (20th Television, 20th Century Fox Television).
 *   - Publishers, production committees, ad agencies (Kodansha, Pony Canyon, dentsu).
 */

export type StudioClass = 'revelation' | 'canon'

export interface StudioDefinition {
  /** Verified TMDB company id. */
  id: number
  name: string
  tradition: AnimationTradition
  cls: StudioClass
  /**
   * true  → also a completable collection (materialises per the visibility rule)
   * false → browsable studio page only; too large to complete, so never a collection
   */
  collectible: boolean
  /** Filtered title count at time of curation. Sanity check only — recompute at runtime. */
  approxCount: number
}

/**
 * Membership filter. Applying these to `/discover/*?with_companies=<id>` yields
 * near-canonical filmographies — verified: Ghibli 26 (real ~25), Laika 6 (exact),
 * Cartoon Saloon 7, Aardman 10, Illumination 17, Pixar 32.
 *
 * The runtime floor is load-bearing for film studios: without it, shorts inflate the
 * counts badly (Pixar 109 → 32, Illumination 45 → 17, Ghibli 32 → 26). A collection
 * that claims "0 of 109 Pixar films" is unachievable and destroys trust in every other
 * collection on the screen.
 */
export const STUDIO_FILTER = {
  tv: { 'vote_count.gte': '20' },
  movie: { 'vote_count.gte': '20', 'with_runtime.gte': '60' },
} as const

/** Above this, a studio is a page you browse rather than a set you finish. */
export const COLLECTIBLE_MAX = 30

export const STUDIOS: StudioDefinition[] = [
  // ─── Anime ────────────────────────────────────────────────────────────────
  { id: 21444,  name: 'MAPPA',              tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 47 },
  { id: 2849,   name: 'Bones',              tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 52 },
  { id: 5438,   name: 'Kyoto Animation',    tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 37 },
  { id: 5887,   name: 'ufotable',           tradition: 'anime', cls: 'revelation', collectible: true,  approxCount: 21 },
  { id: 50908,  name: 'TRIGGER',            tradition: 'anime', cls: 'revelation', collectible: true,  approxCount: 16 },
  { id: 31058,  name: 'WIT Studio',         tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 32 },
  { id: 121589, name: 'CloverWorks',        tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 31 },
  { id: 6689,   name: 'Shaft',              tradition: 'anime', cls: 'revelation', collectible: true,  approxCount: 28 },
  { id: 99494,  name: 'Science SARU',       tradition: 'anime', cls: 'revelation', collectible: true,  approxCount: 15 },
  { id: 45188,  name: 'David Production',   tradition: 'anime', cls: 'revelation', collectible: true,  approxCount: 21 },
  { id: 20867,  name: 'P.A. Works',         tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 31 },
  { id: 10342,  name: 'Studio Ghibli',      tradition: 'anime', cls: 'canon',      collectible: true,  approxCount: 26 },
  // Page-only: real identities, but far too large to complete.
  { id: 3464,   name: 'Madhouse',           tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 132 },
  { id: 529,    name: 'Production I.G',     tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 118 },
  { id: 5542,   name: 'Toei Animation',     tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 173 },
  { id: 13113,  name: 'A-1 Pictures',       tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 78 },
  { id: 3234,   name: 'Studio Pierrot',     tradition: 'anime', cls: 'revelation', collectible: false, approxCount: 72 },

  // ─── Western television animation ─────────────────────────────────────────
  // The strongest revelation cases in the whole registry: almost nobody knows these.
  { id: 81667,  name: 'ShadowMachine',      tradition: 'western', cls: 'revelation', collectible: true,  approxCount: 15 },
  { id: 121093, name: 'Powerhouse Animation', tradition: 'western', cls: 'revelation', collectible: true, approxCount: 9 },
  { id: 30452,  name: 'Bento Box',          tradition: 'western', cls: 'revelation', collectible: true,  approxCount: 21 },
  { id: 19,     name: 'Film Roman',         tradition: 'western', cls: 'revelation', collectible: true,  approxCount: 23 },
  { id: 58209,  name: 'Studio Mir',         tradition: 'western', cls: 'revelation', collectible: true,  approxCount: 11 },
  { id: 73757,  name: 'Bardel Entertainment', tradition: 'western', cls: 'revelation', collectible: true, approxCount: 8 },
  { id: 40055,  name: 'Floyd County',       tradition: 'western', cls: 'revelation', collectible: true,  approxCount: 7 },
  { id: 5615,   name: 'Six Point Harness',  tradition: 'western', cls: 'revelation', collectible: true,  approxCount: 5 },
  { id: 20,     name: 'Rough Draft Studios', tradition: 'western', cls: 'revelation', collectible: true, approxCount: 4 },
  { id: 4152,   name: 'Titmouse',           tradition: 'western', cls: 'revelation', collectible: false, approxCount: 47 },

  // ─── Feature animation ────────────────────────────────────────────────────
  { id: 11537,  name: 'Laika',              tradition: 'western', cls: 'canon', collectible: true,  approxCount: 6 },
  { id: 297,    name: 'Aardman',            tradition: 'euro',    cls: 'canon', collectible: true,  approxCount: 15 },
  { id: 23948,  name: 'Cartoon Saloon',     tradition: 'euro',    cls: 'canon', collectible: true,  approxCount: 8 },
  { id: 6704,   name: 'Illumination',       tradition: 'western', cls: 'canon', collectible: true,  approxCount: 17 },
  { id: 9383,   name: 'Blue Sky Studios',   tradition: 'western', cls: 'canon', collectible: true,  approxCount: 15 },
  { id: 6125,   name: 'Walt Disney Animation Studios', tradition: 'western', cls: 'canon', collectible: true, approxCount: 25 },
  { id: 3,      name: 'Pixar',              tradition: 'western', cls: 'canon', collectible: false, approxCount: 40 },
  { id: 2251,   name: 'Sony Pictures Animation', tradition: 'western', cls: 'canon', collectible: false, approxCount: 35 },
  { id: 521,    name: 'DreamWorks Animation', tradition: 'western', cls: 'canon', collectible: false, approxCount: 64 },

  // ─── European / indie ─────────────────────────────────────────────────────
  { id: 89705,  name: 'Folivari',           tradition: 'euro', cls: 'revelation', collectible: true, approxCount: 5 },
  { id: 21660,  name: 'Ankama',             tradition: 'euro', cls: 'revelation', collectible: true, approxCount: 6 },

  // Attribution only — one title. Kept so Arcane resolves to a named studio; it becomes a
  // collection on its own once Fortiche ships a second work.
  { id: 99496,  name: 'Fortiche',           tradition: 'euro', cls: 'revelation', collectible: false, approxCount: 1 },
]

const BY_ID = new Map(STUDIOS.map((studio) => [studio.id, studio]))

/** Resolve a title's authoring studio from TMDB `production_companies`. */
export function resolveStudios(
  productionCompanies: { id: number; name?: string }[] | undefined,
): StudioDefinition[] {
  if (!productionCompanies?.length) return []
  const seen = new Set<number>()
  const out: StudioDefinition[] = []
  for (const company of productionCompanies) {
    const studio = BY_ID.get(company.id)
    if (studio && !seen.has(studio.id)) {
      seen.add(studio.id)
      out.push(studio)
    }
  }
  // A title legitimately belonging to several studios is correct, not a bug:
  // Attack on Titan is genuinely WIT *and* MAPPA across different seasons.
  return out
}

export function getStudio(id: number) {
  return BY_ID.get(id)
}

export const COLLECTIBLE_STUDIOS = STUDIOS.filter((studio) => studio.collectible)
