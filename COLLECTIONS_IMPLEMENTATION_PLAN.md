# Collections & Achievements — Implementation Plan

**Audience:** Codex
**Status:** Path C implemented and verified (2026-08-01)
**Builds on:** commit `9551067` "Add franchise follow-ups and completion collectibles"
**Theory:** `COLLECTIONS_THINKING_FRAMEWORK.md` (Parts 1–3). Read §2.2 (frequency law), §3.4 (studios), §3.5 (surprise completion) before starting.

---

## HANDOFF — read first

Current tree state: **typecheck clean (0 errors), 56/56 tests pass, production build succeeds.**

### The architecture as it actually is

All three collection pipelines now write achievement definitions:

| Path | Source | Writes to | Covers |
|---|---|---|---|
| A | TMDB `belongs_to_collection`, live | `db.franchiseDefinitions` → achievements | movies only |
| B | `src/lib/studios.ts` + `STUDIO_FILTER`, live | `db.franchiseDefinitions` → achievements | TV + film |
| C | `src/data/generated/franchise-registry.json`, static | `db.franchiseDefinitions` → achievements and onboarding | TV + film |

Path C is materialised by `buildRegistryDefinitionsForShows()` whenever an eligible registry group is touched by the user's library. It runs even without a TMDB API key. Registry definitions use deterministic numeric ids in a reserved negative namespace and retain the original provider id in `sourceKey`.

Cross-path dedupe uses a normalised collection name. A matching TMDB collection keeps its canonical id and artwork while the larger member set wins. Registry sources map to the `franchise` visibility family, so one seen title can surface the collection.

### Registry rebuild result

`npm run build:franchises` now runs the required passes in order: Wikidata first, then the AniList override. Do not run the Wikidata script alone because it overwrites the generated file before anime enrichment.

The successful 2026-08-01 rebuild produced:

- **380 groups**, **687 relationships**
- **149 achievement-eligible groups**: 134 Wikidata + 15 AniList
- **0 unresolved `Q…` names** among eligible groups or their members

### Previously stale “still unbuilt” list

The completion reveal, dismiss storage/UI, studio collections/rail, dedicated all-collections page, and coherent collection artwork are already built. Rarity tiers remain intentionally absent; the plan's own product decision says not to add them.

---

## FACTS THAT COST TIME TO ESTABLISH — do not re-derive

**TMDB**
- `belongs_to_collection` is **movies only**. Verified: Toy Story returns a collection object; Avatar: The Last Airbender has no such field.
- `without_origin_country` is **silently ignored**. Use `with_origin_country` inclusion.
- The curated endpoints (`/trending/tv/week`, `/tv/top_rated`, `/tv/popular`, `/tv/airing_today`) do not accept `with_genres`.
- `/search/tv` cannot be genre-filtered; filter client-side on `genre_ids.includes(16)`.
- `production_companies` is ordered by rights-holder, **not author**. Bob's Burgers returns `20th Century Fox Television` first; the real studio (Bento Box) is second. Attack on Titan returns eight entries mixing three studios with a publisher, a broadcaster and an ad agency. Use `resolveStudios()`.
- Company **name search is unreliable** — ufotable, Trigger, Toei Animation, Production I.G, Studio Mir, Six Point Harness and Walt Disney Animation Studios all resolve to near-empty decoys first (Toei's decoy has 1 title; the real record has 173). All ids in `studios.ts` are verified; do not regenerate them from search.
- Film studio counts are inflated by shorts. `vote_count.gte=20` **plus `with_runtime.gte=60`** yields near-canonical filmographies: Pixar 109→32, Ghibli 32→26, Illumination 45→17, Laika 7→6.

**Wikidata**
- Franchise membership uses `P361` (part of) and `P1434` (fictional universe), not `P179`. TMDB ids come from `P4983` (tv) / `P4947` (movie).
- Coverage is strong for Western animation, weak and sometimes wrong for anime: "Naruto" resolves to 3 members and omits *Naruto: Shippuuden*; "Dragon Ball universe" includes *Dr. Slump*, a different series.
- The same franchise is routinely modelled 2–3 times (Ice Age as collection, franchise **and** universe with identical members). `applyEligibility()` handles this.

**AniList / Fribb**
- AniList exposes typed relation edges (`SEQUEL`, `PREQUEL`, `SIDE_STORY`, `PARENT`) — one seed id reconstructs a franchise.
- **Fribb's id map is not type-safe.** All three original Naruto films carry `themoviedb_id: { tv: 46260 }` — the *TV series* id. It falls back to the parent series when it lacks a movie mapping. `tmdbRefFrom()` only accepts a mapping when the media type matches, then falls back to TMDB title search.
- AniList search resolves badly on English titles — "Demon Slayer" matched an unrelated show called *Onigiri*; "Code Geass" matched a DVD magazine. Use Japanese titles.
- Some 1-member results are **correct, not failures**: TMDB models Attack on Titan, Hunter x Hunter and JoJo's as one show with seasons, while AniList models them per-cour. They are single works, not franchises.

**Behaviour change already landed:** `MIN_COLLECTION_SIZE = 3` means a two-member set can no longer be earned. Three pre-existing tests asserted the opposite and were changed. It is one constant if you disagree.

## What already exists and is correct — do not rebuild

Commit `9551067` shipped a working slice. This is genuinely aligned with the framework and most of it stays:

| Built | Verdict |
|---|---|
| Auto-tracked, no gating, no anti-cheat (`newlyEarnedFranchiseAchievements` merely observes owned ids) | **Correct.** Records, not challenges. |
| Incomplete collections surfaced in a rail | **Correct.** Zeigarnik engine. |
| Sorting by `watchedCount / totalCount` | **Correct.** Proximity-aware already. |
| Rail card → full-screen detail with the full member list | **Correct.** This is states 1 → 2 of the three-state model. |
| Member rows showing `Watched / In watchlist / Not watched` | **Correct, and the best thing in the commit.** This is the sticker-album gap rendering — absence drawn as part of the object. |
| Seen/Watchlist actions *inside* the collection detail | **Correct.** This makes the collection a recommendation surface with a built-in reason (Framework §Lens 4). |
| `hasNewChapter` (franchise grows after you earned it) | **Correct, and beyond spec.** Keep. |
| `criteriaVersion` for membership drift | **Correct.** Good engineering. |
| No rarity tiers | **Correct.** That system is dead. |

---

## Gap 1 — Visibility threshold (highest priority)

**Current:** `definitions.filter(d => d.memberIds.some(id => ownedIds.has(id)))` — a collection appears at **1 of N**.

**Problem:** 2/39 is noise; it reads as evidence of failure, not invitation (Framework §Lens 3). And 1/N can't produce the "oh — these are the same thing" recognition, which needs at least two.

**The minimum-seen floor differs by family, and this is the important part:**

- **Studios need 2**, because the *recognition is the payload*. "Bob's Burgers is by Bento Box" is a fact; "Bob's Burgers, Hazbin Hotel and Grimsburg are all Bento Box" is a pattern. One title teaches nothing.
- **Franchises need 1**, because membership is self-evident — nobody needs to be taught that Toy Story is a series, so the floor buys nothing.

**Implement:**

```ts
const MIN_RATIO = 0.25
const NEAR_DONE = 3

function isVisible(seen: number, total: number, family: 'studio' | 'franchise') {
  if (family === 'franchise') return seen >= 1          // membership is self-evident
  if (seen < 2) return false                            // studios need a pattern, not a fact
  return seen / total >= MIN_RATIO || (total - seen) <= NEAR_DONE
}
```

Franchises carry **no ratio gate at all.** Volume is handled by the proximity sort plus the rail cap (below), not by a threshold — a 1-of-many franchise sorts to the bottom and falls off the cap naturally. This is deliberate: large animated movie franchises (Pokémon, Land Before Time, Doraemon) run to dozens of entries, and rather than inventing a threshold to suppress them, the existing ordering already does it. Fewer knobs, same result.

Behaviour this produces:

| Case | Result |
|---|---|
| 1/4 Toy Story (franchise) | **shown** — capture prompt (see below) |
| 1/20+ Pokémon films (franchise) | technically visible, but sorts last and falls off the cap |
| 1/8 Cartoon Saloon (studio) | hidden — one title reveals no pattern |
| 2/8 Cartoon Saloon (studio) | **shown** — the recognition moment fires |
| 2/39 Titmouse (studio) | **hidden** — 5%, noise |
| 30/39 Titmouse | shown — 77% |
| 36/39 Titmouse | shown — near-done override |

Earned collections are always visible regardless of the rule.

### Low-progress collections are capture prompts, not progress bars

Loot only knows what the user tapped Seen on, so a collection at 1/4 is really *"at least 1, true value unknown."* The user has very likely seen more and simply hasn't logged them.

That changes what a low-progress card is **for**: it is the highest-yield place in the app to ask "did you see these too?" — the candidate list is tiny, specific, and the user has already demonstrated interest. The detail view already carries Seen/Watchlist on every member, so this is a three-second interaction that repairs the record and may complete the collection.

**Consequence for copy:** below ~50% the card should not read as a to-do list. Prefer *"Toy Story — seen the others?"* over *"1 of 4 · 3 films left"*. Above 50%, progress framing is correct.

### Volume control

Surfacing at 1 will increase the number of live collections. **Cap the rail at ~6–8 items ordered by proximity**, rather than tightening the threshold. A cap preserves the capture opportunity while bounding the noise; a stricter gate destroys both. The cap is also what makes the ratio gate unnecessary for franchises.

### Dismiss ("not for me")

A collection you have no intention of finishing is not a pull — it's ambient guilt, and the exploration doc's **no-labor-debt** principle applies directly. Zeigarnik only operates where there's intent to complete; without intent the card is noise. Let the user say so.

**Behaviour:**
- Dismiss is available from the collection detail and on long-press of the rail card. **Not** a visible ✕ on every card — that's clutter and invites misfires.
- Dismissing **hides, never deletes.** The record keeps tracking silently. Reversible from a "dismissed" list in settings.
- **Auto-undismiss on new progress.** If a dismissed collection gains a member — you watched another one after all — it returns. Watching is a stronger signal than an older stated intention, and this stops dismissal from becoming a trap the user can't remember setting.
- **A dismissed collection still earns if completed**, and still fires the reveal. It's a record of truth, and completing something you'd written off is a genuinely good moment.
- Dismissal is a **strong negative taste signal** — feed it to the recommender. "Saw one Minions film, out" is more useful than silence.

**Instrumentation:** if dismissal becomes the dominant interaction on the rail, that's not a UX problem to tune — it means the collections aren't resonating, and the curated list is wrong.

## Gap 2 — Minimum collection size

**Current:** `isComplete` requires `totalCount >= 2`. A two-item set completes the instant you watch both.

Per the frequency law (§2.2), **rank value varies inversely with frequency of the event.** If hundreds of 2-sets can complete, completion is breakfast and the whole system devalues.

**Implement:** `MIN_COLLECTION_SIZE = 3`. Sets of 2 may still tag a title's franchise membership, but cannot be achievements.

## Gap 3 — There is no completion reveal

`newlyEarnedFranchiseAchievements` computes newly-earned collections in `queries.ts:137` and persists them. **Nothing surfaces the moment.** The card just quietly turns gold.

This is the biggest functional gap, because **surprise completion is now the central mechanic** (§3.5) — it's the only honest surprise affordance the product has, and the thing that substitutes for the gacha grammar this audience is conditioned by.

**Implement a full-screen reveal**, triggered when `newlyEarnedFranchiseAchievements` returns a non-empty set:

- **Loud, not congratulatory.** No confetti, no fanfare, no "COMPLETE!", no score, no XP. This audience is maximalist — loud is correct; *victory grammar* is not, because there was no earned difficulty to justify fiero (§2.3).
- Copy is **declarative about the user**: "You've seen every Cartoon Saloon film." Not "Achievement unlocked."
- Full-bleed artwork, the number lands physically, optional haptic.
- **Export for share** — 9:16 and square. The share artifact is the only visibility this system has (§3.6, private-first).
- Dismissible and interruptible; queue if several complete at once (never stack modals).

Also soften existing labels: `Achievement earned` / `Achievement in progress` → declarative equivalents.

## Gap 4 — Artwork is the pattern the research told you to avoid

`artworkFor()` takes up to 3 member images and splits them side-by-side. That is precisely the *"five posters equal a collection"* / Plex four-image grid that the Codex research itself identified as the generic emergency state.

**Implement the Spotify-cover principle:** one coherent composition per collection —
- one hero image (collection backdrop, or the best member backdrop),
- the collection's own colour field driven by `dominantColor.ts` (already in the codebase),
- title as a type layer, never a container.

Keep the 3-up split **only** as the fallback when no usable hero art exists.

## Gap 5 — Studios don't exist yet

Codex built **franchises** (TMDB movie collections). The **studio** family — the strongest one for animation — isn't built.

### 5.1 Why this matters
Studio knowledge is cultural capital the app *confers* (§3.4). Learning that BoJack Horseman, Robot Chicken, Moral Orel and Tuca & Bertie are all **Shadowmachine** genuinely explains a taste cluster the user couldn't previously name. Verified examples:

| Studio | Filtered titles | Body of work |
|---|---|---|
| Shadowmachine | 12 | BoJack, Robot Chicken, Final Space, Moral Orel, Tuca & Bertie |
| Powerhouse | 9 | Castlevania, Blood of Zeus, Nocturne, MOTU: Revelation |
| Bento Box | 18 | Bob's Burgers, Hazbin Hotel, The Great North, Krapopolis, Grimsburg |
| Cartoon Saloon | 8 shows / 24 films | Wolfwalkers, Song of the Sea, Secret of Kells |
| Titmouse | 39 | Vox Machina, Big Mouth, Lower Decks, Venture Bros. |

### 5.2 Data reality — read before building
- `production_companies` **is** returned by `/tv/{id}` and `/movie/{id}` but is **not yet in Loot's `TmdbShowDetail` type**. Add it.
- **You cannot take `companies[0]`.** Bob's Burgers returns `20th Century Fox Television` first; the real studio (`Bento Box`) is second. Attack on Titan returns 8 entries mixing three real studios with a publisher, a broadcaster and an ad agency (`dentsu`).
- **Name→ID search is unreliable — worse than first assessed.** Seven studios returned the *wrong entity* as the top search result: ufotable, Trigger, Toei Animation, Production I.G, Studio Mir, Six Point Harness and Walt Disney Animation Studios all resolve to near-empty decoys first (Toei's decoy holds 1 title; the real record holds 173). Anything generated from name search ships a registry of ghosts.
- **Raw counts are inflated** by shorts and distribution credits — but this one turned out to be **solvable**, see below.

### 5.3 The curated studio registry — ✅ BUILT

`src/lib/studios.ts` exists. **39 studios, every TMDB id verified by querying it and confirming the returned filmography.** Do not regenerate it from search.

Exports:
```ts
STUDIOS: StudioDefinition[]          // id, name, tradition, cls, collectible, approxCount
STUDIO_FILTER                        // the membership filter, below
COLLECTIBLE_MAX = 30
COLLECTIBLE_STUDIOS                  // pre-filtered convenience list
resolveStudios(production_companies) // intersects TMDB companies against the allowlist
getStudio(id)
```

`resolveStudios()` is the answer to the `companies[0]` problem — pass it a title's raw `production_companies` and it returns only recognised authoring studios, in order. A title resolving to **several** studios is correct, not a bug (Attack on Titan is genuinely WIT *and* MAPPA across seasons).

#### Membership is derivable — this corrects the plan's earlier claim

The plan previously said membership must be hand-curated. **That was wrong.** Applying a runtime floor alongside the vote floor yields near-canonical filmographies:

```ts
STUDIO_FILTER = {
  tv:    { 'vote_count.gte': '20' },
  movie: { 'vote_count.gte': '20', 'with_runtime.gte': '60' },
}
```

| Studio | vote only | + runtime | reality |
|---|---|---|---|
| Pixar | 109 | **32** | ~28 features |
| Studio Ghibli | 32 | **26** | ~25 |
| Illumination | 45 | **17** | ~17 |
| Aardman | 21 | **10** | ~10 |
| Laika | 7 | **6** | exactly 6 |
| Cartoon Saloon | 8 | **7** | ✓ |

The runtime floor is **load-bearing for film studios** — without it, shorts flood the counts and a collection claiming "0 of 109 Pixar films" is unachievable and poisons trust in every other collection on screen.

**So: the allowlist is curated, the membership is derived.** Only `studios.ts` needs human judgement; contents come from TMDB at runtime.

#### Inclusion test used (for future additions)
1. **Revelation** — authorship invisible until revealed, output forms a coherent cluster. *ShadowMachine (BoJack, Robot Chicken, Moral Orel, Tuca & Bertie), Titmouse, Bento Box, Powerhouse, MAPPA, TRIGGER.*
2. **Canon** — known, bounded, authored body worth completing. *Ghibli, Laika, Aardman, Cartoon Saloon.*

**Excluded deliberately:** networks and broadcasters (FOX, Adult Swim, Netflix — already branded on the front of the thing so they teach nothing, and unbounded so they can't be completed), rights-holders (`20th Television`), publishers and ad agencies (Kodansha, Pony Canyon, dentsu).

**`collectible` is set per entry**, guided by filtered size against `COLLECTIBLE_MAX = 30` — above that it's a page you browse, not a set you finish (Titmouse 47, Madhouse 132, Toei 173 are page-only).

### 5.4 Studio page vs studio collection — different objects
- **Studio page** — discovery infrastructure. Available from day one to everyone, regardless of progress. Lists the studio's filtered catalogue.
- **Studio collection** — the user's record against it. Materialises per Gap 1's visibility rule, tracks gaps, completes.

The incomplete collection card links **into** the studio page — that's state 2 of the three-state model, already built as `CollectionProgressDetail`. Reuse it.

### 5.5 Studio rail
Personalised, not editorial: *"Studios you've been watching"*, ordered by proximity to completion, gated by the visibility rule. A separate editorial browse entry point can come later.

## Gap 6 — TV franchises: what was tested, and what to build

**First, the thing that is already solved:** the **studio registry covers TV**, and for Western animation TV is the dominant medium — ShadowMachine 12 TV/3 film, Powerhouse 9/0, Bento Box 18/3, Titmouse 39/8, MAPPA 38/9, Bones 39/13. Shipping the studio page and rail (§5.4/5.5) *is* TV collections. No extra work.

What TV lacks is **franchises**. Three data paths were tested:

### ❌ `created_by` — unusable, do not build on it
TMDB's TV creator data is sparse and sometimes factually wrong:
- **Steven Universe → `['Glenn Gordon Caron']`.** He created Moonlighting. Rebecca Sugar created Steven Universe.
- **Samurai Jack → `[]`.** Genndy Tartakovsky is not credited at all.
- Person-name resolution fails the same way company search does.

"Creator" is a genuinely attractive authorial unit for TV animation and it passes the revelation test on paper — but the underlying data can't support it. Recorded so nobody re-tries this.

### 🟡 Keywords — excellent where they exist, and they mostly don't
`with_keywords` + `with_genres=16` returns a **perfect** DC Animated Universe set:

> `dc animated universe (dcau)` **#329136** → 8 shows, chronologically exact: Batman: TAS (1992), Superman: TAS (1996), The New Batman Adventures, Batman Beyond, Gotham Girls, Static Shock, The Zeta Project, Justice League.

But `star wars` (#379196) returns **0** animated shows, and there is no usable keyword for Avatar: The Last Airbender or Pokémon. Use keywords as an **accelerator for seeding specific definitions**, never as the mechanism.

### ✅ Build: hand-curated `src/lib/tvFranchises.ts`
Same shape as `studios.ts`, but members are **explicit TMDB ids** rather than derived — there is no query that produces them.

```ts
{ id: string; name: string; memberIds: number[]; source: 'curated' }
```

Candidates: DCAU (seed from the keyword above), Avatar → Korra → Seven Havens, Dragon Ball line, Naruto → Shippuden → Boruto, Gundam, Fate, Monogatari, JoJo's parts, Pokémon series, Digimon, Transformers, Scooby-Doo, Ben 10, Star Wars animated, Castlevania/Netflix-Konami. Roughly 30–40 entries.

### Priority note — studios have curation leverage, TV franchises don't
Each curated **studio** id unlocks a *derived* filmography via `STUDIO_FILTER` — 39 judgement calls produced ~1,500 title memberships. Each curated **TV franchise** requires hand-listing every member, so effort scales linearly with coverage.

**Therefore: ship the studio page and rail first.** TV franchises are worth building, but they are the lower-yield half and should follow.

## Gap 6b — original notes

`belongs_to_collection` is **movie-only** — verified: Toy Story returns a full collection object; Avatar: The Last Airbender doesn't have the field at all.

So TV franchises (Avatar → Korra, the Ghibli TV work, DC animated continuity) can only come from a **hand-curated definition list**, same shape as studios. Treat as a later phase; studios are the higher-yield unit for TV.

## Gap 7 — Frequency tiers

All collections currently render identically. Per §2.2 preciousness comes from how rarely that *kind* of completion occurs:

| Tier | Scope | Treatment |
|---|---|---|
| Everyday | 3–5 item franchises | plain card, no reveal ceremony |
| Sunday | 6–15 studio/franchise sets | full cover, full reveal |
| Heirloom | rare, substantial canons (Ghibli ~25) | the loudest reveal, permanent placement |

The everyday tier is **load-bearing, not decorative** — without frequent small completions, nobody discovers that the rare ones exist.

---

## Order of work

~~1. Gap 1 + Gap 2~~ — ✅ done, tested.
~~2. Gap 5.3 curated registry~~ — ✅ done, `src/lib/studios.ts`.

**Remaining, in order:**

1. **Gap 3 — completion reveal.** The central mechanic and still entirely absent; `newlyEarnedFranchiseAchievements` fires into nothing.
2. **Dismiss storage + UI.** Logic seam exists (`dismissedIds` param); needs a Dexie table, the long-press/detail affordance, auto-undismiss on new progress, and the settings list.
3. **Gap 5.4/5.5 — studio page + rail**, consuming `STUDIOS` / `STUDIO_FILTER` / `resolveStudios()`. Add `production_companies` to `TmdbShowDetail` first — it's returned by the API but missing from the type.
4. **Gap 4 — artwork.**
5. **Gap 7** (tiers), then **Gap 6** (TV franchises) if warranted.

**Coordination:** `src/lib/studios.ts`, `franchise-achievements.ts` and its test file were just modified. `Discover.tsx`, `FranchiseAchievementRail.tsx` and the UI layer were deliberately left untouched and are free.

## Acceptance criteria

- No collection appears below 2 seen, or below 25% unless within 3 of completion.
- No 2-item set can be earned.
- Completing a collection produces a full-screen reveal with an export, and no victory grammar anywhere in it.
- No collection cover uses a multi-poster split unless it has no usable hero art.
- Every studio in `studios.ts` passes the revelation-or-canon test; no networks, no rights-holders.
- A studio page is reachable for any listed studio regardless of user progress; a studio *collection* only materialises under the visibility rule.
- Every list respects `prefers-reduced-motion`.
