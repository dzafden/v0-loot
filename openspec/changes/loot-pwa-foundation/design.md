## Context

Loot is a greenfield mobile-first PWA. No existing codebase. The core challenge is that the visual/animation system is the product — it must feel like a game inventory, not a web app. Every architectural decision should serve the animation engine first and data management second.

## Goals / Non-Goals

**Goals:**
- Mobile-first PWA installable on iOS and Android
- Genre-driven animation engine as a first-class system (not bolted on)
- 60fps animations on mid-range mobile hardware
- Offline-capable (service worker + IndexedDB local state)
- Cards are 2D grid items with 3D CSS transforms on interaction
- TMDB API as the show/cast data source
- Local-first data (no backend required for MVP)

**Non-Goals:**
- Desktop-optimized layout (desktop gets mobile layout, not a redesigned experience)
- Social features / sharing
- Movie support (TV shows only, hard constraint)
- Backend / user accounts in MVP (local storage only)
- Native apps (PWA only)

## Decisions

### 1. React + Vite + vite-plugin-pwa
**Why**: Fastest PWA setup with hot reload. Workbox integration via plugin handles service worker complexity. Alternatives: Next.js (overkill, SSR not needed for local-first), CRA (dead).

### 2. Framer Motion for all animations
**Why**: The animation engine needs declarative, composable, spring-physics-based animations that work well with React. Framer Motion's `variants`, `layoutId`, and `AnimatePresence` cover every case: stagger grid entry, card 3D rotation, loot drop sequences, tier drag feedback. Alternatives: GSAP (imperative, harder to compose with React state), CSS keyframes only (not dynamic enough for genre-driven system).

### 3. Genre Animation Engine as a standalone module
**Why**: Genre → animation mapping needs to be swappable, testable, and expandable without touching card components. Design: `src/engine/genre-animations.ts` exports a `getAnimationPreset(genre): AnimationPreset` function. `AnimationPreset` defines `idle`, `entry`, `exit`, `interact` Framer Motion variant objects. Cards consume presets via a `useGenreAnimation(genre)` hook.

### 4. 3D rotation via CSS `perspective` + Framer Motion `rotateX/rotateY`
**Why**: Pure CSS 3D transforms are the most performant path — GPU-composited, no layout thrash. Cards stay in a 2D grid (no z-index stacking issues) but individual cards tilt on touch/hover using device gyroscope (mobile) or mouse position (desktop). `transform-style: preserve-3d` on the card wrapper enables layered overlay effects.

### 5. @dnd-kit for tier game drag-and-drop
**Why**: Accessible, touch-native, works with Framer Motion. Alternatives: react-beautiful-dnd (archived), native HTML DnD (poor mobile support).

### 6. TMDB API for show + cast data
**Why**: Free tier, excellent TV coverage, cast images with character names. User provides their own API key in app settings (stored in localStorage). No proxy needed for MVP.

### 7. IndexedDB via Dexie.js for local state
**Why**: localStorage is synchronous and size-limited — bad for show libraries of 100+ items with image metadata. Dexie provides a clean typed API over IndexedDB. All user data (shows, collections, tiers, episode progress, cast roles) lives in Dexie tables.

### 8. Tailwind CSS for layout
**Why**: Utility-first works well with component-level animation logic. No CSS Modules context switching. Mobile-first breakpoints by default.

## Risks / Trade-offs

- **Animation performance on low-end mobile** → Mitigation: provide a `reducedMotion` mode that falls back to simple fade-in. Respect `prefers-reduced-motion` media query automatically.
- **TMDB API key exposure** → Mitigation: key is user-provided and stored client-side only. Document this clearly. No backend proxy for MVP.
- **3D + Framer Motion + grid = potential jank** → Mitigation: `will-change: transform` on cards, layout animations use `layoutId` not position recalculation, stagger entry animations to reduce simultaneous GPU load.
- **PWA install on iOS is manual** → Mitigation: show an "Add to Home Screen" prompt banner on first visit. iOS does not support Web App Install prompt natively.
- **Offline TMDB images** → Mitigation: cache show poster images in Cache Storage via Workbox runtime caching strategy on first load.

## Open Questions

- Should emoji categories be multi-select per show (a show can have heart AND hamburger), or single-select? → Assume multi-select for MVP.
- Top 8 ordering: manually dragged or auto-ranked by some signal? → Manually dragged for MVP.
- Episode tracking granularity: per-episode checkbox or per-season only? → Per-episode with season grouping.
