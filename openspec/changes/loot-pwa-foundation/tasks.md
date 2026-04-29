## 1. Project Scaffolding

- [x] 1.1 Create Vite + React + TypeScript project with `npm create vite@latest loot -- --template react-ts`
- [x] 1.2 Install dependencies: framer-motion, @dnd-kit/core, @dnd-kit/sortable, dexie, tailwindcss, vite-plugin-pwa
- [x] 1.3 Configure Tailwind CSS with mobile-first base styles
- [x] 1.4 Configure vite-plugin-pwa with Workbox, app manifest (name, icons, theme color), and runtime caching for TMDB images
- [x] 1.5 Set up Dexie database schema with tables: shows, collections, emojiCategories, tierAssignments, episodeProgress, castRoles
- [x] 1.6 Create project folder structure: src/engine, src/components/card, src/components/grid, src/components/top8, src/features/*
- [x] 1.7 Set up TMDB API key input in app settings and store in localStorage

## 2. Genre Animation Engine

- [x] 2.1 Create `src/engine/genre-animations.ts` defining the `AnimationPreset` type with entry, idle, exit, interact Framer Motion variants
- [x] 2.2 Implement presets for all 9 defined genres (Horror, Comedy, Drama, Sci-Fi, Action, Romance, Thriller, Animation, Documentary) plus Default
- [x] 2.3 Implement `getAnimationPreset(genre: string): AnimationPreset` with fallback to Default
- [x] 2.4 Implement `useGenreAnimation(genre: string)` React hook that reads from the engine and respects `prefers-reduced-motion`
- [x] 2.5 Add reduced-motion minimal preset (opacity-only 200ms, no idle, no interact)

## 3. Loot Card Component

- [x] 3.1 Build `LootCard` component with poster image, title, and year display
- [x] 3.2 Wire `useGenreAnimation` hook into LootCard to apply entry, idle, and interact variants via Framer Motion
- [x] 3.3 Implement 3D tilt on touch: track touch point, apply rotateX/rotateY (±20deg) on the card face using CSS perspective
- [x] 3.4 Implement mouse parallax for desktop: track cursor position relative to card, apply same rotateX/rotateY transform
- [x] 3.5 Add spring-back to flat (0,0) on touch release / mouse leave
- [x] 3.6 Implement custom outline system: border-color + box-shadow glow driven by user-set color (default: dominant poster color via Canvas API)
- [x] 3.7 Implement overlay layer system: none | vignette | holographic | rarity-glow | static-noise; holographic overlay shifts with tilt angle
- [x] 3.8 Add emoji badge display (top-right corner pills) for applied emoji categories
- [x] 3.9 Add episode progress pill (e.g. "3/10") and "Completed" badge with confetti animation
- [x] 3.10 Add card context menu (long-press on mobile, right-click on desktop): Add to Top 8, Add to Collection, Add Emoji, Customize, Tier

## 4. Loot Grid

- [x] 4.1 Build `LootGrid` component using CSS Grid (2-col mobile, 3-col tablet) hosting `LootCard` items
- [x] 4.2 Implement stagger entry animation with 60ms delay between cards using Framer Motion `AnimatePresence` + `staggerChildren`
- [x] 4.3 Assign `layoutId` to each card so reorder/filter transitions animate positions without unmount
- [x] 4.4 Implement sort controls (alphabetical, recently added, recently watched, tier rank)
- [x] 4.5 Implement filter bar (by emoji category, by collection, by tier)
- [x] 4.6 Animate filter: excluded cards play exit animation, remaining cards reflow with layout transition

## 5. Top 8

- [x] 5.1 Build `Top8Row` component as a horizontally scrollable pinned row above the main grid
- [x] 5.2 Render Top 8 cards at larger size with premium animation: golden-glow drop on entry, shockwave ring, persistent aura idle
- [x] 5.3 Enforce 8-show max with an error message on overflow attempt
- [x] 5.4 Implement drag-to-reorder within the Top 8 row using @dnd-kit/sortable
- [x] 5.5 Wire "Add to Top 8" / "Remove from Top 8" from card context menu
- [x] 5.6 Hide the row (or show empty state prompt) when no Top 8 shows exist

## 6. Collections

- [x] 6.1 Build collections data layer in Dexie (create, rename, delete, add/remove shows)
- [x] 6.2 Build `CollectionsList` screen showing all collections with show count and a preview of card thumbnails
- [x] 6.3 Build `CollectionDetail` view rendering shows in a `LootGrid` filtered to that collection
- [x] 6.4 Wire "Add to Collection" from card context menu with collection picker sheet
- [x] 6.5 Implement collection creation/rename/delete UI

## 7. Emoji Categories

- [x] 7.1 Build emoji categories data layer in Dexie (create category, apply to show, remove from show)
- [x] 7.2 Build emoji category creation UI with an emoji picker (use emoji-picker-element or native input)
- [x] 7.3 Wire emoji filter chips into the main grid filter bar
- [x] 7.4 Wire "Add Emoji" action from card context menu with category picker
- [x] 7.5 Render emoji badges on cards (top-right pill stack, max 3 visible + overflow count)

## 8. Tier Game

- [x] 8.1 Build `TierGame` screen with 5 labeled/color-coded rows (S/A/B/C/D) and an unranked pool
- [x] 8.2 Set up @dnd-kit with `DndContext` and `SortableContext` for drag between rows and pool
- [x] 8.3 Implement drop landing animation (scale bounce) when a card settles into a tier row
- [x] 8.4 Persist tier assignments to Dexie on every drop
- [x] 8.5 Implement reset action that empties all tier rows back to the unranked pool with exit animations

## 9. Episode Tracker

- [x] 9.1 Fetch season/episode data from TMDB `/tv/{id}/season/{n}` endpoints and cache in Dexie
- [x] 9.2 Build `EpisodeTracker` sheet/modal with seasons as collapsible sections and episode checkboxes
- [x] 9.3 Implement per-episode watched toggle with checkmark animation on check
- [x] 9.4 Implement "Mark all / Unmark all" per season with staggered checkmark animation
- [x] 9.5 Surface episode progress on the LootCard (progress pill) and show "Completed" badge with confetti when all done
- [x] 9.6 Use cached episode data when offline

## 10. Cast Roles

- [x] 10.1 Fetch cast data from TMDB `/tv/{id}/credits` and display in show detail view
- [x] 10.2 Build `CastRoles` data layer in Dexie (role name, character name, actor name, TMDB person image, show reference)
- [x] 10.3 Build `MyCast` screen displaying all assigned roles as character cards in a grid
- [x] 10.4 Build cast role card with character photo, character name, actor name, and show badge (poster thumbnail)
- [x] 10.5 Implement character placeholder (stylized silhouette + show dominant color) for missing TMDB images
- [x] 10.6 Build role assignment UI: predefined roles (Best Friend, Life Coach, Villain I Love, Comfort Character) + custom role creation
- [x] 10.7 Wire "Assign Role" action from the cast list in show detail view

## 11. PWA & Offline

- [x] 11.1 Verify service worker registers and app installs on iOS and Android
- [x] 11.2 Implement Workbox runtime caching for TMDB image URLs (CacheFirst, 30-day expiry)
- [x] 11.3 Add iOS "Add to Home Screen" prompt banner on first visit
- [x] 11.4 Test offline: grid loads from Dexie, episode data loads from cache, images load from Cache Storage

## 12. Polish & Performance

- [x] 12.1 Add `will-change: transform` to all animated card elements
- [x] 12.2 Audit animation frame rate on mid-range Android device (target 60fps)
- [x] 12.3 Implement stagger caps (max 12 cards animate simultaneously) to reduce GPU load on large libraries
- [x] 12.4 Add app-level loading skeleton for initial TMDB fetch
- [x] 12.5 Verify `prefers-reduced-motion` disables all idle loops and complex entry animations
