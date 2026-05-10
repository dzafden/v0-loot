# Loot Product Backlog

Last updated: 2026-05-10
Owner: Product

## North Star
Wow a 10-year-old Fortnite/Minecraft player in the first 15 seconds, while giving them reliable ways to discover, collect, rank, inspect, and express TV identity.

## Workflow
Status values:
- idea
- spec
- in-dev
- test
- shipped
- dropped

Each item includes:
- Problem
- Hypothesis
- Target user
- Success metric
- Scope (smallest testable slice)
- Status
- Changelog

---

## Current Priority Stack

### Next Sprint
1. BL-018 - Episode Tracker Visual Hierarchy + Graceful Watched States
2. BL-019 - Detail Cast/Tracking Vertical Rhythm Pass
3. BL-023 - Detail Rank/Vibe Indicator Cohesion
4. BL-024 - Collection TV-On Moment + Landscape Logos
5. BL-021 - Ranking Tier Shelf Compression + Stronger Color System
6. BL-015 - Discover Recommendation Quality + Freshness Tuning
7. BL-026 - Collection Add Button Affordance Clarification
8. BL-027 - Top 8 Card Tap Actions

### Next After That
1. BL-017 - Profile / Top 8 Showcase Upgrade
2. BL-007 - Favorite Characters / Cast Role Card Upgrade
3. BL-005 - Hold-Drag-Rank Prototype
4. BL-010 - Personal Packets (Small Set Recommendations)
5. BL-028 - Import From External Tracking Services
6. BL-006 - Motion Language System (Squeeze/Stretch)
7. BL-004 - Non-Redundant Navigation Principle

### Later / Concept
1. BL-011 - Quest Crates (Progression Challenges)
2. BL-022 - Rank Review / Comment Layer
3. BL-025 - Episode and Season Ranking Foundation
4. BL-012 - Mind Map / Show Connections
5. BL-013 - AI Persona Recommender UI
6. BL-016 - Tier / Genre Object Effects

---

## P0 - Discovery Trust and Freshness

### BL-015 - Discover Recommendation Quality + Freshness Tuning
Status: spec

Problem:
Discover can technically personalize now, but recommendation quality is the highest current product risk. Bad personalization feels worse than generic discovery because it breaks trust.

Hypothesis:
A lightweight local ranking layer using full-library taste, daily rotation, impression decay, source-honest rows, and diversity caps can make Discover feel alive without needing a server-side recommender.

Target user:
Users with medium-to-large libraries who expect Discover to surface new shows instead of repeating owned or stale items.

Success metric:
- Qualitative: user does not see the same hero/card pinned across repeated sessions.
- Qualitative: Trending/Airing rows feel source-truthful.
- Quantitative proxy: add rate from Discover improves without increasing immediate back-outs.

Scope:
- Tune current Discover v1 algorithm.
- Add debug visibility for why a show surfaced (dev-only is fine).
- Validate that For Your Taste is diverse across a 50+ and 200+ show library.
- Keep calls bounded and cached; no server recommender yet.

Changelog:
- 2026-05-10: Added after Discover v1 showed over-personalization and repeated cards.
- 2026-05-10: Current implementation uses full-library taste, 18 candidate anchors, 8 rotating daily anchors, 24h cache, local impression decay, and source-honest rows.
- 2026-05-10: Added session-stable Discover composition so adding a show updates owned/check state but does not live-recompose hero/rows. Added explicit refresh control for intentional recomposition.

### BL-014 - Discover Personalization v1
Status: shipped

Problem:
Discover showed already-owned items and static generic rows, leaving users with nothing meaningful to do.

Hypothesis:
Filtering owned shows and ranking a candidate pool from the user's library/rankings will make Discover more useful while staying lightweight.

Target user:
Users with existing libraries, especially users with 50+ shows.

Success metric:
- Owned shows do not dominate hero or primary rows.
- For Your Taste changes over time and avoids repeating ignored shows.

Scope:
- Build full-library taste weights locally.
- Select diverse anchors for TMDB recommendations.
- Keep Trending/Airing/Popular rows source-truthful.
- Add local impression tracking.

Changelog:
- 2026-05-10: Shipped full-library taste profile, rotating anchors, 24h recommendation cache, daily shuffle, diversity caps, and impression decay.
- 2026-05-10: Corrected earlier failure where recommendations polluted Trending and Airing Today.

### BL-003 - Discover -> Show Preview State
Status: shipped

Problem:
Users could not inspect show details from Discover unless the show was already added to collection.

Hypothesis:
A preview detail state in Discover reduces friction and improves confidence in adding/ranking unknown shows.

Target user:
Users with low show familiarity.

Success metric:
- Add-to-collection rate from Discover +15%.
- Fewer immediate bounces from Discover cards.

Scope:
- Open show detail from Discover hero, landscape cards, portrait cards, search results, and category grids.
- Keep direct plus action for fast add.
- Allow unowned detail preview with safe add/rank/cast/tracking behavior.

Changelog:
- 2026-05-04: Explicitly prioritized for Gen Alpha onboarding.
- 2026-05-10: Shipped. Discover cards now open detail; unowned detail previews show Add to stash and hide Remove from stash. Rank/cast/tracking claim the show before saving user-specific data.

### BL-004 - Non-Redundant Navigation Principle
Status: idea

Problem:
"See all" from a row can feel repetitive and resets context.

Hypothesis:
Preserving scroll/context and reducing repeated content improves perceived flow quality.

Target user:
All users.

Success metric:
- Reduced quick back navigation after "see all".

Scope:
- Keep contextual scroll anchor when opening category view.
- Avoid duplicate first-screen content between carousel and category view.
- Consider category entry transitions that preserve spatial context.

Changelog:
- 2026-05-04: Captured as global UX principle.
- 2026-05-10: Still open. Category pages exist, but context preservation and duplicate-content handling have not been meaningfully addressed.

---

## P0 - Object Inspection and Collection Feel

### BL-018 - Episode Tracker Visual Hierarchy + Graceful Watched States
Status: test

Problem:
The episode tracker still feels too much like a task checklist. The back button is inconsistent, the top area is visually plain, and watched episodes use strikethrough, which makes watching feel like clearing chores instead of enjoying media.

Hypothesis:
A more cinematic tracker with a full-width show backdrop, consistent left-side back control, season imagery, and graceful watched states will make episode tracking feel like part of the collectible media experience.

Target user:
Users who track episodes and return to the tracker often.

Success metric:
- Users immediately understand where they are and how to get back.
- Watched episodes feel completed/owned, not crossed-off tasks.
- Tracker visual quality matches the show detail page.

Scope:
- Move tracker back control to the left and align it with app-wide back/exit behavior.
- Add a full-width backdrop/header at the top of the tracker.
- Keep season images in the season list and make the top area feel connected to the show.
- Replace watched-title strikethrough with a softer watched state: check, dim, progress accent, or owned-style treatment.
- Keep episode rows simple for now, but leave room for future episode/season ranking.

Changelog:
- 2026-05-10: Added from annotated tracker screenshots. Prioritized because it is concrete, shippable, and protects a core utility flow from feeling like a todo list.
- 2026-05-10: Implemented first pass: backdrop header, left-side back control, and non-strikethrough watched episode state. Needs visual QA.

### BL-019 - Detail Cast/Tracking Vertical Rhythm Pass
Status: test

Problem:
The detail page is much stronger, but the cast and tracking areas still compete for vertical space. Cast assignment is usually a one-time action, while tracking is a recurring action that should be easier to reach and understand.

Hypothesis:
Compressing the cast preview and making tracking more full-width, contextual, and informative will improve scanability without losing the expressive cast-role mechanic.

Target user:
Users inspecting shows they already own or have just added.

Success metric:
- Tracking is visible/reachable without feeling buried.
- Cast can be reviewed quickly without consuming half the page.
- Users understand whether a show is complete, in progress, returning, or has new content.

Scope:
- Reduce cast section height on detail while preserving real cast imagery and add/check controls.
- Show smaller cast cards or a tighter rail for review + assignment.
- Keep Cast Role as a clear action, but make the section less dominant after roles are assigned.
- Make tracking feel full-width rather than a floating widget.
- Replace ambiguous status copy like "Caught up" with context-aware language such as "All watched", "In progress", "New episode", or "New season".
- Surface important new/coming episode or season notices higher in the tracking area when data is available.

Changelog:
- 2026-05-10: Added from annotated detail screenshots. User explicitly wants cast lower-height and tracking to become the center of episode information.
- 2026-05-10: Implemented first pass: tighter cast cards, full-width tracking treatment, and clearer "All watched" language. Needs visual QA.

### BL-023 - Detail Rank/Vibe Indicator Cohesion
Status: test

Problem:
The rank indicator on detail is useful, but it is too small and visually disconnected from the rank controls. Vibe is currently close to metadata but not yet integrated as a coherent secondary identity attribute.

Hypothesis:
Making the top-right rank indicator look like the tier buttons, and grouping vibe near it/metadata, will make show state easier to read at a glance.

Target user:
Users who rank shows and assign vibes.

Success metric:
- Users can identify current rank instantly from the top of the detail page.
- Rank color/shape matches the rank controls.
- Vibe feels like show identity metadata, not a primary action.

Scope:
- Increase rank indicator size and visual weight.
- Use exact tier color with clear white rank letter.
- Match the rank button shape/treatment for cohesion.
- Move vibe emoji/control near metadata or rank state as a small secondary attribute.
- Hide or collapse the rank control row after a rank is selected, while keeping re-rank discoverable.

Changelog:
- 2026-05-10: Added from annotated detail screenshots. This is a quick cohesion pass after the detail redesign.
- 2026-05-10: Implemented first pass: larger rank chip matching tier-button language and smaller vibe treatment near metadata. Needs visual QA.

### BL-024 - Collection TV-On Moment + Landscape Logos
Status: test

Problem:
Collection already has a personal-TV direction, but opening it could feel more special. Landscape cards in the collection should also communicate show identity through logos, not plain title overlays.

Hypothesis:
A first-session CRT/white-noise-on transition plus show-logo overlays on landscape cards will make the collection feel more like a personal channel/vault.

Target user:
Users opening their collection/stash.

Success metric:
- First collection open feels memorable without becoming annoying.
- Landscape cards are easier to recognize at a glance.

Scope:
- Add a subtle CRT-on or white-noise transition to the collection backdrop.
- Play only once per app session, not every visit.
- Respect reduced-motion preferences.
- Add show logos to collection landscape cards where logo assets are available.
- Keep title fallback for shows without logo.

Changelog:
- 2026-05-10: Added from annotated collection screenshot.
- 2026-05-10: Implemented first pass: once-per-session CRT/TV-on hero transition and logo overlays on collection landscape cards. Needs visual QA.

### BL-026 - Collection Add Button Affordance Clarification
Status: spec

Problem:
The add button in the top-right corner of the collection page visually matches Discover card add buttons, so it can read as "add this backdrop show" instead of "add a show to my collection."

Hypothesis:
Changing the collection-level add control into a distinct collection/import affordance will reduce ambiguity and make the hero backdrop feel less actionable in the wrong way.

Target user:
Users on the collection page, especially users with an empty or small stash.

Success metric:
- Users understand the control opens add/import collection flow, not an action on the hero show.
- Fewer accidental taps or confused comments during visual review.

Scope:
- Replace the top-right yellow circular plus with a distinct collection-level control.
- Consider icon/text combinations like "Add show", crate/import icon, or a small dock action that does not resemble card add.
- Keep the control compact and tactile.
- Preserve the left search icon pattern.
- Do not add a large headline or extra explanatory copy.

Changelog:
- 2026-05-10: Added from product review after the collection hero/add affordance was confused with Discover card add.

### BL-001 - Visual Depth and Saturation Pass
Status: shipped

Problem:
The app felt dim, flat, and washed out for Gen Alpha taste.

Hypothesis:
A cohesive vibrant visual pass (not neon chaos), stronger card depth, and better artifact styling increases first-session excitement.

Target user:
10-13 year old first-time user.

Success metric:
- Qualitative: user says app looks cool within first minute.
- Quantitative proxy: first-session duration +20% vs current baseline.

Scope:
- Update Discover and Collection card art treatment.
- Introduce subtle layered depth, shadow, halo, and texture.
- Keep the design tactile and collectible instead of generic streaming-card UI.

Changelog:
- 2026-05-04: Added from weekend observations.
- 2026-05-10: Shipped major visual pass across Discover, Collection, Ranking, and Show Detail. App now uses larger object-led cards, dark atmospheric backgrounds, tier color accents, richer shadows, and collectible poster/backdrop treatments.

### BL-002 - Card Craft: Logo/Cutout Lite System
Status: shipped

Problem:
Card artifacts did not feel collectible/immersive enough.

Hypothesis:
Adding lightweight show logo overlays and improved artifact framing increases emotional attachment without full manual cutout pipeline.

Target user:
Style-sensitive users, especially younger users.

Success metric:
- 5-user test: >=4 call cards "cool" or "premium".

Scope:
- Add optional logo layer to selected card contexts.
- Keep implementation data-light.
- Avoid full manual cutout pipeline until accounts/storage phase.

Changelog:
- 2026-05-04: Deferred full cutout tooling to future accounts/storage phase.
- 2026-05-10: Shipped logo support for Discover landscape cards and detail hero. Landscape cards now show tagline/fallback instead of decorative artifact bars.

### BL-008 - Show Detail Hierarchy Refactor
Status: shipped

Problem:
Detail page was too vertical, form-like, and hard to scan; tracking/cast/ranking were not meaningfully anchored.

Hypothesis:
An immersive object-inspection screen with clear rank/cast/tracking hierarchy improves task completion and makes shows feel collectible.

Target user:
All users.

Success metric:
- Time-to-track-episode reduced in usability tests.
- Users describe detail page as inspection/action rather than settings/form.

Scope:
- Backdrop-first detail hero.
- Metadata under logo/title.
- Larger description.
- Immediate rank controls.
- Cast connected to real cast imagery.
- Tracking made visually explicit.
- Support unowned Discover preview state.

Changelog:
- 2026-05-04: Connected to Discover preview work.
- 2026-05-10: Shipped major detail redesign. Removed hero poster, removed add/search controls, added logo/metadata, larger description, direct rank controls, real cast image role assignment, visual tracking card, season images in episode tracker, and preview support for unowned Discover shows.

### BL-021 - Ranking Tier Shelf Compression + Stronger Color System
Status: test

Problem:
The ranked tiers page takes too much vertical space, the queue header pushes content down, and tier colors are too thin/subtle to distinguish ranks confidently.

Hypothesis:
Compressed tier shelves with stronger color presence, peeking cards, and expandable rank zones will let users see all ranks while preserving a collectible shelf feeling.

Target user:
Users managing ranked shows across multiple tiers.

Success metric:
- All rank tiers are visible or nearly visible on a standard mobile viewport.
- Users can distinguish S/A/B/C/D by color without reading every label.
- Tapping a tier clearly expands it into full browsing mode.

Scope:
- Reduce height of the top queue/session module.
- Replace thin rank color strips with stronger color panels, side rails, glows, or background washes.
- Collapse rank rows by default using peeking poster/card tops and gradient fades.
- Overlay show logos/title on peeking cards where available.
- Tap tier row to expand and show full cards.
- Keep the screen tactile and shelf-like, not spreadsheet-like.

Changelog:
- 2026-05-10: Added from annotated ranking tier screenshot. Prioritized because it is a structural fix to the ranking page rather than extra decoration.
- 2026-05-10: Implemented first pass: smaller queue launcher, stronger tier color blocks, compact tier shelves, counts, and tap-to-expand rows. Needs visual QA.

---

## P0 - Tactile Interaction Quality

### BL-005 - Hold-Drag-Rank Prototype
Status: spec

Problem:
Current rank actions are clearer than before, but still mostly tap-based. Ranking should feel like placing a prized object into a personal canon.

Hypothesis:
Tap-hold-lift-drag into tier targets creates a satisfying game-like interaction loop and increases ranking actions/session.

Target user:
Gamified interaction seekers.

Success metric:
- Ranking actions/session +25% in test group.

Scope:
- Prototype on Discover/Collection cards first.
- Hold card -> lift state -> tier targets appear -> drop to rank.
- If show is unowned, ranking also adds to stash.
- Include undo / visual confirmation.
- Consider whether full-screen ranking should become more detail-like before drag work; a poster-only ranking object may not justify a dedicated full-screen flow.

Changelog:
- 2026-05-04: Includes idea to auto-mark watched with quick correction affordance.
- 2026-05-10: Ranking screen and detail rank controls improved, with tier-colored states and auto-collapse after ranking. Drag-to-rank itself remains unbuilt.
- 2026-05-10: Added critique that full-screen ranking currently over-indexes on poster art; future work should either make it more like a lightweight detail page or support faster list/shelf ranking.

### BL-006 - Motion Language System (Squeeze/Stretch)
Status: in-dev

Problem:
Micro-interactions are visually functional but not yet consistently expressive.

Hypothesis:
Consistent squeeze/stretch + spring-back motion language increases delight and perceived polish.

Target user:
All users, with stronger effect for younger cohorts.

Success metric:
- User feedback: interaction feel score improves in usability test.

Scope:
- Buttons, tier indicators, add actions, poster/card lift states.
- Define reusable motion tokens before broad rollout.

Changelog:
- 2026-05-04: Define reusable motion tokens before broad rollout.
- 2026-05-10: Partial progress shipped through add-button burst, rank transitions, card press states, and tracker progress animations. Still needs a named/reusable motion system.

---

## P1 - Identity and Profile Expression

### BL-007 - Favorite Characters / Cast Role Card Upgrade
Status: in-dev

Problem:
Cast role cards and profile cast surfaces still do not fully deliver the "favorite characters / personal roster" fantasy. The mechanic is promising, but cards can be hard to read and do not immediately explain why assigning a role is fun.

Hypothesis:
Framing the feature first as "my favorite characters" and then as "roles they play in my life" will make the mechanic clearer, more emotional, and easier to understand.

Target user:
Users who engage with cast-role mechanic.

Success metric:
- Cast role creation rate +20%.

Scope:
- Improve profile cast role card visual template.
- Use existing available imagery.
- Add stronger role identity presentation.
- Make character identity readable before role metadata.
- Use role labels as expressive overlays, not tiny form-like captions.
- Explore a more playful "roster" layout for profile.
- No full UGC cutout pipeline yet.

Changelog:
- 2026-05-04: Keep manual/UGC cutout concept as future phase.
- 2026-05-10: Detail-page cast interaction improved: actual cast images now appear, add/check controls live on character images, and role picker can preselect tapped cast member. Profile/My Cast card upgrade remains open.
- 2026-05-10: Reframed from cast-role cards to favorite-character identity cards based on annotated profile feedback.
- 2026-05-10: Implemented first profile roster pass: role label moved onto character card, character name enlarged, show cue quieted, and add slot reframed as "Add character".

### BL-017 - Profile / Top 8 Showcase Upgrade
Status: in-dev

Problem:
Profile still risks feeling like account/profile UI instead of a loadout or showcase of taste.

Hypothesis:
Making Top 8 and cast roles feel equipped/displayed will increase identity expression and sharing intent.

Target user:
Users motivated by taste identity and social display.

Success metric:
- Users can describe another user's taste from profile at a glance.
- Top 8 edits/session increases.

Scope:
- Upgrade Top 8 visual hierarchy.
- Treat profile as a loadout/showcase.
- Elevate cast roles and vibes as identity modules.
- Reduce profile header padding/container height so it does not push the showcase down.
- Add visible rank states to Top 8 cards: rank letter, tier-color outline, or both.
- Show vibe emoji/attribute on Top 8 cards when assigned.
- Keep Top 8 cards collectible and readable rather than flat empty posters.

Changelog:
- 2026-05-10: Added after detail/discover redesign made profile the next weakest identity surface.
- 2026-05-10: Expanded from annotated profile screenshot: compact header, stronger Top 8 rank/vibe states, and clearer character-roster module.
- 2026-05-10: Implemented first pass: compact profile header and Top 8 rank-color outlines, tier chips, position chips, vibe emoji overlays, and title treatment.

### BL-027 - Top 8 Card Tap Actions
Status: spec

Problem:
Tapping a Top 8 card currently removes it immediately. That is too destructive and blocks the more likely intent: inspecting the show or managing the slot.

Hypothesis:
A small action sheet on tap will make Top 8 feel safer and more useful without adding permanent UI.

Target user:
Users editing or browsing their profile showcase.

Success metric:
- Accidental Top 8 removals go down.
- Users can open show detail directly from profile Top 8.

Scope:
- Tapping a filled Top 8 card opens options instead of removing immediately.
- Options: View details, Replace slot, Remove from Top 8.
- Remove should be visually secondary/destructive.
- Empty slot tap still opens Equip flow.
- Long-press remove can be considered later, but tap should not remove.

Changelog:
- 2026-05-10: Added from product review after Top 8 cards became more important showcase objects.

---

## P1 - Recommendation, Crates, and Quest Loops

### BL-028 - Import From External Tracking Services
Status: idea

Problem:
Current import is manual/search-based. Users with existing libraries in other tools should not have to rebuild hundreds of shows by hand.

Hypothesis:
Adding import connectors for popular tracking services will reduce onboarding friction and make Loot useful for users who already track media elsewhere.

Target user:
Users with existing libraries in TV/anime trackers.

Success metric:
- Import completion rate for connected services.
- Time-to-populated-collection drops significantly for users with existing libraries.
- Imported collection quality is high enough that users do not need heavy cleanup.

Scope:
- Start with a research spike and connector architecture, not full implementation.
- Map external IDs to TMDB/Loot shows with confidence scoring and a review step.
- Import watch status/progress where available.
- Import ratings into a temporary "source rating" field; do not auto-map to S/A/B/C/D without user confirmation.
- Add a source-specific import option under the existing import/add flow.
- Include a preview/reconciliation screen: matched, uncertain, skipped, already in stash.
- Keep OAuth tokens local-only unless/until accounts/backend exist.

Provider candidates and initial feasibility:
- Trakt: Best first TV/movie target. Strong fit for shows, watched history, ratings, collection/watchlist. OAuth/client app setup required. Medium difficulty.
- AniList: Best first anime target. GraphQL API, user media lists, scores/progress/status. Good for anime import but requires AniList-to-TMDB mapping. Medium difficulty.
- MyAnimeList: High-value anime source. Official API v2 supports user anime lists and OAuth, but API/auth friction and anime-to-TMDB matching make it medium-high difficulty.
- Kitsu: Useful anime source with JSON:API, library entries, OAuth, and public anime data. Smaller ecosystem than MAL/AniList; good second-wave candidate. Medium difficulty.
- Simkl: Broad TV/movie/anime tracking source with API/app model. Potentially strong, but needs deeper auth/rate-limit/CORS validation. Medium-high difficulty.
- CSV/manual export: Boring but valuable fallback. Could support simple title/year/status CSV before OAuth connectors. Low-medium difficulty.

Changelog:
- 2026-05-10: Added after import-flow planning request. Initial recommendation: research spike first, then implement Trakt + AniList before MAL/Kitsu/Simkl.

### BL-009 - Curated Crate Ontology and Quality Gates
Status: in-dev

Problem:
Early crate generation was noisy; reliability and abundance are not yet proven.

Hypothesis:
Closed curated ontology + recommendation-graph expansion + strict QA metrics can produce scalable crate pools.

Target user:
Discovery users and future personalized recommendation users.

Success metric:
- Coverage >= 100 candidates for viable crates.
- Precision@20 >= 0.75 (human-rated).
- Diversity@20 meets anti-clone thresholds.
- Freshness weekly.
- Stability across runs.

Scope:
- Deterministic TMDB-based retrieval and scoring.
- Pagination-ready output shape.
- Keep crate policy separate from personalized For Your Taste row.

Changelog:
- 2026-05-04: Switched from global keyword-only to seeded recommendation graph.
- 2026-05-04: Added second-hop expansion and pagination metadata.
- 2026-05-04: Expanded curated ontology to 20+ crate archetypes.
- 2026-05-10: Still relevant, but reprioritized behind immediate Discover recommendation trust/tuning.

### BL-010 - Personal Packets (Small Set Recommendations)
Status: spec

Problem:
Large recommendation lists are high-commitment and low-action, especially for younger users.

Hypothesis:
3-5 highly targeted packets based on collection/rankings increase actionability.

Target user:
Users with small-to-large collections, especially younger cohorts.

Success metric:
- Packet click-through and add rate exceed generic discovery rows.

Scope:
- Build separate policy from global crates.
- Short set, higher confidence.
- Could reuse Discover v1 taste profile and impression decay.
- Avoid loot-box/casino presentation; "packet" should feel curated, not gambling.

Changelog:
- 2026-05-04: Position as complement to public discovery crates.
- 2026-05-10: Reprioritized after Discover personalization v1 shipped. This is now a likely next form factor for actionable recommendations.

### BL-011 - Quest Crates (Progression Challenges)
Status: idea

Problem:
Passive recommendations may not convert into watch intent.

Hypothesis:
Structured challenge crates (e.g. universe completion) with visible progress increase retention/motivation.

Target user:
Users motivated by completion and badges.

Success metric:
- Quest start rate, completion rate, 7-day return uplift.

Scope:
- Prototype one quest template with progress bar + reward badge.
- Avoid XP/reward spam and casino mechanics.

Changelog:
- 2026-05-04: Inspired by Zeigarnik effect and challenge framing.
- 2026-05-10: Still later; do not start before recommendation quality baseline is trusted.

---

## P2 - Longer-Term Systems and Concepts

### BL-022 - Rank Review / Comment Layer
Status: idea

Problem:
Ranking captures a letter but not the user's reason, which limits expressiveness and future social value.

Hypothesis:
Optional short rank comments/reviews can turn ranking from a private sorting action into a shareable taste artifact, as long as the interaction stays lightweight.

Target user:
Users who want to explain or show off why something belongs in a tier.

Success metric:
- Users add comments to a meaningful percentage of ranked shows without slowing basic ranking.
- Rank cards clearly indicate when a comment exists.

Scope:
- Explore long-press or hold-on-rank to add a short note.
- Add a visible indicator when a rank has a note/review.
- Make note easy to view from detail/profile/ranking surfaces.
- Do not block simple tap-to-rank.
- Defer social feed/commenting until local note model feels good.

Changelog:
- 2026-05-10: Added from ranking screenshot note. Kept later because it introduces new data model and interaction complexity.

### BL-025 - Episode and Season Ranking Foundation
Status: idea

Problem:
Episode tracking is currently binary watched/unwatched, but the product may later support ranking episodes or seasons as a social and return-engagement feature.

Hypothesis:
Preparing episode and season surfaces for future ranking will avoid reworking the tracker later and make episodes feel like media moments rather than checklist rows.

Target user:
Power users and social ranking users.

Success metric:
- Episode tracker can evolve into rating/ranking without redesigning the entire information architecture.
- Users perceive episodes/seasons as meaningful media units, not tasks.

Scope:
- Do not build full episode ranking yet.
- Avoid visual treatments that imply chores, such as heavy strikethrough.
- Leave space in episode and season rows for future rank/vibe/comment state.
- Consider season-level summary cards and social-ready episode states.

Changelog:
- 2026-05-10: Added as future-facing concept from episode tracker notes.

### BL-012 - Mind Map / Show Connections
Status: idea

Problem:
No explicit way to explore conceptual connections across shows.

Hypothesis:
A simple connection graph can improve exploration and identity expression.

Target user:
Power users and curation-minded users.

Success metric:
- Engagement with connection view; save/share actions.

Scope:
- Discovery-only prototype with predefined edges.

Changelog:
- 2026-05-04: Keep as exploration item, not short-term priority.

### BL-013 - AI Persona Recommender UI
Status: idea

Problem:
AI recommendation concept exists but is not grounded in reliable retrieval yet.

Hypothesis:
Persona wrapper can improve perceived fun only after recommendation quality baseline is met.

Target user:
Users who enjoy themed interfaces.

Success metric:
- Session engagement uplift without degrading recommendation trust.

Scope:
- Blocked until BL-009 and BL-015 quality gates are met.

Changelog:
- 2026-05-04: Marked dependent on recommendation quality foundation.
- 2026-05-10: Still explicitly blocked. Fun wrapper should not precede trustworthy recommendations.

### BL-016 - Tier / Genre Object Effects
Status: idea

Problem:
Tier and genre do not yet deeply affect object identity beyond color/rim state.

Hypothesis:
Subtle tier/genre effects can make owned/ranked shows feel more like digital possessions without becoming noisy.

Target user:
Users who enjoy customization, skins, and rarity-like visual systems.

Success metric:
- Users notice and understand premium/ranked object states without needing explanatory text.

Scope:
- Start with S-tier only.
- Genre adds subtle treatment; tier controls color/intensity.
- Avoid clutter, badges, fake rarity, and marketplace/NFT energy.

Changelog:
- 2026-05-10: Added from earlier concept notes and current tier-color direction. Not near-term until core flows stabilize.

---

## Shipped Recently

### 2026-05-10
- Discover detail preview from all Discover surfaces.
- Unowned show detail state with Add to stash and safe rank/cast/tracking.
- Full-library Discover personalization v1 with rotating anchors, caching, diversity, and impression decay.
- Source-honest Trending/Airing/Popular rows.
- Show Detail object-inspection redesign.
- Cast section with real cast imagery and role assignment controls.
- Tracking card redesign and season imagery in episode tracker.
- Collection/discover visual object-card treatment.
- Rank chip collapse behavior and tier-colored state.

---

## Decision Log

- 2026-05-04: Chose closed curated ontology for crates over open generative taxonomy in v0.
- 2026-05-04: Set quality bar: coverage, precision@20, diversity@20, freshness, stability, explainability.
- 2026-05-04: Agreed that broad discovery crates and short personal packets should be separate policies.
- 2026-05-10: Treat full collection as taste profile; use rotating anchor subset only for bounded TMDB candidate generation.
- 2026-05-10: Keep live rows source-honest. Personalization can filter/reorder source rows lightly, but should not inject unrelated recommendations into Trending/Airing.
- 2026-05-10: AI/persona recommendation UI remains blocked until recommendation trust is strong.
