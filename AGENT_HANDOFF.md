# Agent Handoff — Loot App v0 Port

> **Read this first.** This doc is a self-contained handoff for a coding agent continuing a screen-porting task.
> The work was interrupted mid-session. Pick up from **Current State** and work through the task list in order.

---

## What this project is

**Loot** is a mobile-first PWA for tracking, rating, and organising TV shows.
- Stack: **Vite 8 + React 19 + TypeScript 6 + Tailwind 3 + Dexie (IndexedDB) + vite-plugin-pwa**
- A reference design repo lives at **`/Users/denisdzaferovic/v0-loot`** (local clone of `github.com/dzafden/v0-loot`) — a Next.js version of the same app generated with v0. Its screens and flows are the visual reference for this port.
- **DO NOT migrate to Next.js.** The PWA/offline/Dexie setup is intentional. Port the UI only.

## Key files to know

```
src/
  App.tsx                          # root; tab state, modal state, Dexie subscriptions
  types/index.ts                   # Show, Tier, TierAssignment, CastRole, etc.
  data/db.ts                       # Dexie schema
  data/queries.ts                  # all Dexie reads/writes (upsertShow, setTier, …)
  lib/tmdb.ts                      # TMDB client — user-provided API key, all endpoints
  lib/utils.ts                     # cn() helper (clsx + tailwind-merge)
  components/ui/BottomNav.tsx      # bottom tab nav — Tab type lives here
  components/ui/button.tsx         # shadcn Button primitive
  components/ui/input.tsx          # shadcn Input primitive
  components/ui/sheet.tsx          # shadcn Sheet primitive (vaul-based drawer)
  components/ui/label.tsx          # shadcn Label primitive
  features/discover/Discover.tsx   # NEW — Discover tab (search + trending carousels)
  features/library/Locker.tsx      # current "stash" tab (to be replaced by Collection)
  features/library/AddShowSheet.tsx # old add-show modal (to be removed when Collection done)
  features/tier-game/TiersPage.tsx # current "tiers" tab (to be replaced by Rankings)
  features/top8/Top8Page.tsx       # current "top8" tab (folds into Profile)
  features/cast-roles/MyCast.tsx   # current "cast" tab (folds into Profile)
  features/profile/Profile.tsx     # stub (to become the new Profile tab)
  features/settings/SettingsSheet.tsx # settings modal — keep as-is

/Users/denisdzaferovic/v0-loot/components/screens/
  discover-screen.tsx              # DONE — used as reference, ported
  collection-screen.tsx            # NEXT — reference for Collection tab
  rankings-screen.tsx              # reference for Rankings tab
  profile-screen.tsx               # reference for Profile tab
```

## Non-obvious constraints (important)

1. **npm install needs `--legacy-peer-deps`** — `vite-plugin-pwa@1.2` has a peer conflict with vite 8. Pre-existing, not our bug.
2. **6 pre-existing TypeScript errors** — in `Top8Row.tsx`, `LootGrid.tsx`, `TierGame.tsx`, `ShowDetail.tsx`, `App.tsx`. Do NOT touch them; they predate this work.
3. **TMDB key** — the app requires the user to paste a TMDB API key in Settings before search/carousels work. `hasTmdbKey()` in `src/lib/tmdb.ts` guards all TMDB calls.
4. **Tailwind v3** — the project stays on v3 (v0-loot uses v4). Adapt any `tw-*` or new v4 utilities when porting.
5. **Dexie not localStorage** — v0 uses `localStorage` + a `LootShow` display type. This project uses Dexie (`Show` type from `src/types/index.ts`). When porting screens, convert `LootShow` → `Show` at the boundary. The `tmdbToLoot()` helper converts raw TMDB results to `LootShow` for display only. `upsertShow()` writes to Dexie.
6. **shadcn CSS variables** — added to `src/index.css` and `tailwind.config.js`. Use `cn()` from `src/lib/utils.ts` for conditional classes.

## Final tab structure (agreed with user)

| Tab | Route key | Source | Status |
|---|---|---|---|
| Discover | `discover` | v0 discover-screen | ✅ done |
| Collection | `collection` | v0 collection-screen + preserve behaviours | ⬜ todo |
| Rankings | `rankings` | v0 rankings-screen (tier game only, no top8) | ⬜ todo |
| Profile | `profile` | v0 profile-screen + top8 + cast merged in | ⬜ todo |

Current transitional `Tab` type: `'discover' | 'stash' | 'top8' | 'tiers' | 'cast'`
Target `Tab` type: `'discover' | 'collection' | 'rankings' | 'profile'`

The bottom nav is in `src/components/ui/BottomNav.tsx`. The final icons (from v0) are:
`Compass` (discover), `Package` (collection), `Trophy` (rankings), `User` (profile).

---

## Task list (in order)

### TASK 0 — Verify Discover screen in browser ⚠️ do this first

The Discover screen was written but the session ended before browser verification.

```bash
npm run dev   # runs on http://localhost:5173
```

1. Open the app → click the **Compass** tab (first tab).
2. **Without a TMDB key**: should show "Add a TMDB API key in Settings" message.
3. **With a TMDB key set in Settings**: skeleton rows should appear while loading, then carousels (portrait + landscape rows). Search bar should debounce and show a 2-col grid of results.
4. Tap `+` on a result → it should switch to `✓` and the show should appear in the Stash tab.

If carousels don't load: check browser console for TMDB errors. Common issues: key not set, TMDB rate limit, CORS (shouldn't be an issue — TMDB allows browser requests).

---

### TASK 1 — Port Collection screen

**Goal:** Replace the current `stash` tab with a v0-styled Collection screen, while preserving two existing behaviours:
- **Inline `+ ADD` button** (triggers AddShowSheet / opens Discover) while browsing the collection
- **Tier-based filtering** (current Locker has filter chips for S/A/B/C/D/Unsorted)

**Reference files:**
- v0 source: `/Users/denisdzaferovic/v0-loot/components/screens/collection-screen.tsx`
- Current screen: `src/features/library/Locker.tsx`
- Current types: `src/types/index.ts` — `Show` has `genres: Genre[]` (not a single string like v0's `LootShow.genre`)
- Dexie query hook: `src/hooks/useDexieQuery.ts`

**v0's CollectionScreen props:** `{ ownedShows: LootShow[] }` — reads genre as single string.
**Our Show type** uses `genres: Genre[]`. Map `show.genres[0] ?? 'Drama'` for filter label.

**Steps:**
1. Create `src/features/library/Collection.tsx` — port v0's `CollectionScreen` layout.
   - Keep the search bar + genre filter chips from v0.
   - Add a `+ ADD` button in the header (or top-right) that sets `adding = true` in `App.tsx` (same as current Locker's `onAddShow` prop). Alternatively, tapping `+` navigates to the Discover tab.
   - Wire tier filters: use the `TierAssignment` Dexie table to know each show's tier. Query `db.tierAssignments.toArray()` alongside `db.shows.toArray()`, then filter.
   - The tier filter chips should be: `All | S | A | B | C | D | Unsorted` (Unsorted = no tier assignment yet).
2. Update `App.tsx`:
   - Import and render `<Collection />` when `tab === 'collection'` (add alongside existing screens for now).
3. Update `BottomNav.tsx`:
   - Add `'collection'` to the `Tab` type (keep existing tabs for now — transitional).
4. After visual confirmation, remove `Locker` render + `stash` tab from `BottomNav`.

**Do NOT delete** `AddShowSheet.tsx` yet — keep it as the "add show" modal triggered from Collection.

---

### TASK 2 — Port Rankings screen

**Goal:** Replace the `tiers` tab with v0's Rankings screen (tier card-swipe game + tier list display). Top8 does NOT go here.

**Reference files:**
- v0 source: `/Users/denisdzaferovic/v0-loot/components/screens/rankings-screen.tsx` (342 lines)
- Current screens: `src/features/tier-game/TiersPage.tsx`, `src/features/tier-game/TierGame.tsx`
- v0's `TierData`: `{ S: number[], A: number[], B: number[], C: number[], D: number[] }` — maps tier → array of showIds. This matches `src/data/queries.ts` `TierAssignment` table (use `tierMap()` to build the same shape).
- v0's `TIER_STYLES` (in `lib/loot.ts`) — copy the style map to `src/lib/tierStyles.ts` or inline it.

**v0 Rankings props:**
```ts
{ ownedShows: LootShow[], tierData: TierData, onSort, onRemoveFromTier, onGoDiscover }
```
Adapt: `ownedShows: Show[]`, build `tierData` from Dexie `tierMap()`, wire `onSort` → `setTier(showId, tier)`, `onRemoveFromTier` → `setTier(showId, null)`, `onGoDiscover` → switch tab to `discover`.

**Steps:**
1. Create `src/features/tier-game/Rankings.tsx` — port v0's `RankingsScreen`.
   - The `SorterGame` component (card-swipe to assign tiers) is the core feature. Port it directly.
   - `TierRow` shows shows already sorted into each tier. Port it.
   - Replace `LootShow` with `Show` throughout; replace `getPosterUrl` with `imgUrl` from `src/lib/tmdb.ts`.
2. Update `App.tsx`: render `<Rankings />` when `tab === 'rankings'`.
3. Update `BottomNav.tsx`: add `'rankings'` to `Tab` type.
4. After visual confirmation, remove `TiersPage` render + `tiers` tab from `BottomNav`.

---

### TASK 3 — Port Profile screen (merges top8 + cast)

**Goal:** Create a new Profile tab that combines:
- v0's `ProfileScreen` (avatar, top-8 grid, stats)
- Top8 slot editing (currently in `src/features/top8/Top8Page.tsx`)
- Cast roles (currently in `src/features/cast-roles/MyCast.tsx`)

**Reference files:**
- v0 source: `/Users/denisdzaferovic/v0-loot/components/screens/profile-screen.tsx` (272 lines)
- v0 `ProfileScreen` props: `{ ownedShows: LootShow[], top8: (number|null)[], onSetTop8 }`
- Current top8: `src/features/top8/Top8Page.tsx` — reads from Dexie `shows.where('top8Position').above(-1)`
- Current cast: `src/features/cast-roles/MyCast.tsx`

**Steps:**
1. Create `src/features/profile/ProfileTab.tsx` (the file `Profile.tsx` is a stub).
   - Port v0's `ProfileScreen` layout (avatar banner, stats row, top-8 grid).
   - Replace v0's `SelectionModal` with the existing slot-picking logic from `Top8Page.tsx`.
   - Below the top-8 section, add a **Cast Roles** section — reuse/inline the `MyCast` component.
   - Wire top8 reads: `useDexieQuery` → `db.shows.toArray()` filtered by `top8Position`.
   - Wire top8 writes: `setTop8(showId, position)` from `src/data/queries.ts`.
2. Update `App.tsx`: render `<ProfileTab />` when `tab === 'profile'`.
3. Update `BottomNav.tsx`: add `'profile'` to `Tab` type.
4. After confirmation, remove `top8` and `cast` tabs from `BottomNav` + their renders in `App.tsx`.

---

### TASK 4 — Final BottomNav cleanup

Once Tasks 1–3 are done and confirmed:

1. In `src/components/ui/BottomNav.tsx`, set:
   ```ts
   export type Tab = 'discover' | 'collection' | 'rankings' | 'profile'
   ```
2. Remove `stash`, `top8`, `tiers`, `cast` from the TABS array.
3. In `App.tsx`, remove all renders for the old tabs and their associated state (`adding`, `tracking`, `castingFor` may still be needed — check what Collection uses).
4. Delete or archive:
   - `src/features/library/Locker.tsx`
   - `src/features/library/AddShowSheet.tsx` (only if Collection tab has its own add-show flow)
   - `src/features/tier-game/TiersPage.tsx` (keep `TierGame.tsx` only if Rankings reuses it)
   - `src/features/top8/Top8Page.tsx`
5. Verify full app: all 4 tabs work, no console errors, no TypeScript regressions beyond the 6 pre-existing ones.

---

### TASK 5 — Discover trending carousels (extension, lower priority)

Already partially done in `src/lib/tmdb.ts`. The `getDiscoverFeed()` function fetches 12 lists in parallel with a 5-min module-level cache. The Discover screen shows skeleton rows while loading and renders `CarouselRow` components (portrait + landscape) once data arrives.

**If carousels work**: nothing to do.
**If carousels are empty/broken**: check `hasTmdbKey()`. The user must provide their own TMDB API key in Settings (stored in localStorage as `loot:tmdb-api-key`).

Potential future enhancement: add a "Trending carousels" → show all page on `ChevronRight` tap. Not scoped for now.

---

## How to run

```bash
cd /Users/denisdzaferovic/loot
npm install --legacy-peer-deps   # flag required — pre-existing peer conflict
npm run dev                      # http://localhost:5173
```

For type-checking (6 pre-existing errors are expected and OK):
```bash
npx tsc -b --noEmit
```

## How to read the v0 reference

```bash
# Full file read:
cat /Users/denisdzaferovic/v0-loot/components/screens/collection-screen.tsx

# All screens at once:
ls /Users/denisdzaferovic/v0-loot/components/screens/
cat /Users/denisdzaferovic/v0-loot/lib/loot.ts    # LootShow type, TIER_STYLES, Tier
cat /Users/denisdzaferovic/v0-loot/lib/tmdb.ts    # tmdbToLoot, getGenreName
```

v0 uses `LootShow` (display) everywhere. This project uses `Show` (persisted, Dexie) for storage and `LootShow` (from `src/lib/tmdb.ts`) only inside the Discover screen. When porting other screens, use `Show` from `src/types/index.ts` — adapt field names:

| v0 `LootShow` field | `Show` equivalent |
|---|---|
| `title` | `name` |
| `year` (string) | `year` (number \| undefined) |
| `genre` (string) | `genres[0]` (Genre enum) |
| `posterPath` | `posterPath` |
| `backdropPath` | `backdropPath` |
| `overview` | `overview` |
| `rating` | — (not stored) |
| `popularity` | — (not stored) |
