## Why

TV show tracking apps are boring — spreadsheets masquerading as entertainment. Loot turns your TV watchlist into a living, animated inventory where every show feels like dropping loot in Fortnite: satisfying, playful, and personal. There is no app that treats genre-specific animation, expressive card design, and gamified collection as first-class features.

## What Changes

- Introduce a mobile-first PWA that replaces the static grid paradigm with animated, genre-aware loot cards
- Cards behave like Fortnite loot drops: animated entry, idle animations, and interaction animations all driven by genre
- 2D grid layout with cards that support 3D CSS rotation on hover/interact
- Custom card outlines and overlays per show (color, glow, rarity-style border)
- Top 8 showcase — a pinned hero row with premium animation treatment
- Collections — user-defined groupings of shows
- Emoji categories — pick an emoji, tag shows with it (heart, hamburger, dead flower, etc.)
- Tier ranking game — drag shows into S / A / B / C / D tiers
- Episode tracking — mark episodes and seasons watched
- Cast member cards — assign characters to personal roles ("best friend", "life coach") with character photo + show indicator
- Full offline support via service worker (PWA)

## Capabilities

### New Capabilities

- `loot-card`: Animated show card with genre-driven animation, 3D rotation, custom outline and overlay
- `loot-grid`: 2D responsive grid that hosts loot cards with stagger-in animations
- `genre-animation-engine`: Maps TV genres to animation presets (e.g. horror = flicker + red glow, comedy = bounce + confetti)
- `top-8`: Pinned hero showcase row with premium loot drop animation
- `collections`: User-created named groupings of shows
- `emoji-categories`: Emoji-tagged category system applied to shows
- `tier-game`: Drag-and-drop S/A/B/C/D tier ranking interface
- `episode-tracker`: Per-show episode and season watch progress
- `cast-roles`: Character card assignment to personal role slots with photo + show badge

### Modified Capabilities

## Impact

- New project — no existing code affected
- Dependencies: React + Vite (PWA plugin), Framer Motion (animations), @dnd-kit (drag and drop for tiers), Tailwind CSS, TMDB API (show data + cast images), Workbox (service worker)
- Targets mobile browsers first; desktop is secondary
