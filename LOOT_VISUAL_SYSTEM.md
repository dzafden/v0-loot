# Loot Visual System

> **A living editorial world for animation.**

This document is the source of truth for Loot's visual and interaction design. Read it before designing, reviewing, prototyping, or implementing any user-facing interface.

The goal is not to make Loot look like a decorated streaming app. The goal is to make animation feel present, alive, personal, and worth exploring.

## North Star

**Content-cinematic. Interaction-kinetic. Chrome-quiet.**

- **Content-cinematic:** Artwork, title logos, clips, creators, studios, and color establish the world.
- **Interaction-kinetic:** Navigation and actions feel direct, continuous, responsive, and physical.
- **Chrome-quiet:** Controls and containers provide structure without competing with the content.

Loot should feel like a living animation publication: broader than a recommender, more expressive than a database, and more culturally aware than a streaming catalog.

## What Immersion Means

Immersion is not an effect. It is the result of several systems working together:

> **Immersion = content presence + attentional focus + spatial continuity + agency + emotional relevance + sensory reinforcement - interface friction**

### 1. Content presence

The animated work is the primary visual material.

- Prefer strong artwork, expressive character imagery, original title logos, stills, and video.
- Let artwork supply atmosphere and color before adding decorative UI color.
- Use editorial crops appropriate to the size and purpose of the surface.
- Avoid covering meaningful imagery with containers or metadata.
- At small sizes, prefer a clear focal subject over crowded ensemble art.

### 2. Attentional focus

Every viewport needs an obvious entry point and an intentional reading order.

- Allow one dominant visual event per viewport.
- Use position, contrast, color, typography, overlap, and whitespace together.
- Do not make headings, tags, controls, cards, and metadata equally loud.
- Supporting information should become quieter as it becomes less important.
- A user should understand a module before reading its smallest text.

### 3. Spatial continuity

Loot should behave like a continuous place rather than a series of replaced screens.

- Preserve scroll position and back-navigation context.
- Let selected imagery or elements carry into destination views where practical.
- Animate elements from their apparent origin instead of introducing arbitrary motion.
- Use layering, overlap, translucency, and depth to explain relationships.
- Avoid excessive independent containers that fragment the page.

### 4. Kinetic continuity

Motion communicates cause, relationship, and state.

- Motion should respond to user input, preserve orientation, or explain change.
- Prefer shared-element transitions, direct manipulation, and responsive touch states.
- Use restrained environmental motion to keep content alive without demanding attention.
- Avoid perpetual floating, pulsing, or oscillation without meaning.
- Respect reduced-motion preferences.

### 5. Agency and responsiveness

The system must feel immediate and dependable.

- Use optimistic feedback for reversible actions such as Seen and Watchlist.
- Avoid intermediate steps that do not improve the decision.
- Keep touch feedback crisp and transitions short enough to preserve momentum.
- Prevent layout shifts when artwork or metadata arrives.
- Treat loading performance and back navigation as part of the aesthetic.

### 6. Emotional and personal relevance

Personalization should feel like recognition, not algorithmic labeling.

- Connect recommendations to meaningful taste signals when useful.
- Surface creators, studios, eras, techniques, and related works as navigable worlds.
- Use personal history, ranks, followed makers, and progress to create continuity.
- Prefer specific, earned language over generic mood labels.
- Use editorial context to explain why a work matters, not merely what category it occupies.

### 7. Sensory reinforcement

Light, color, depth, motion, sound, and haptics amplify meaning. They do not replace it.

- Every effect needs a semantic, spatial, or causal reason.
- Sound and haptics must reinforce an action and remain optional.
- Effects that feel special occasionally become noise when repeated everywhere.

## Visual Grammar

### Imagery

- Give animation artwork the largest share of the visual field.
- Prefer title logos over generic text when the logo is legible and available.
- Treat trailers and clips as immersive destinations, not small utility thumbnails.
- Use artwork variants suited to portrait, landscape, hero, and compact contexts.
- Preserve recognizability; do not change a title's presentation so frequently that it becomes hard to identify.

### Composition

- Full-bleed media may establish the environment.
- Important display elements may overlap or break card boundaries when the overlap strengthens meaning.
- Use open space to establish chapters; do not insert decorative dividers by default.
- Vary module composition intentionally. Avoid an endless sequence of visually equivalent rails.
- Containers are for grouping, interaction, or contrast—not for every piece of content.

### Color

Color needs an identifiable source:

- **Artwork-derived color** for atmosphere and title-specific actions.
- **Tier color** for S–D ranking semantics.
- **Electric cyan-white** for live ordinal momentum, such as Trending numerals.
- **Neutral materials** for navigation, utility, and inactive controls.
- **Status color** only for a real state requiring attention.

Do not introduce arbitrary cyan/gold accents to decorate section transitions.

### Lumination and glow

Glow is a signature material, not the visual system itself.

Use it to communicate:

- Cultural momentum or ranking prominence.
- Selection, activation, or successful placement.
- Light apparently emitted by video or artwork.
- A rare focal object that should feel alive.

Every luminous object needs this construction:

1. **Sharp core:** a crisp, legible silhouette.
2. **Colored aura:** a controlled bloom that suggests emitted light.
3. **Separation depth:** a dark edge or shadow that protects the form from the background.

Rules:

- Never use bloom to compensate for weak hierarchy.
- Do not let a white stroke consume the semantic color at small sizes.
- Scale glow optically; do not reuse identical CSS at every size.
- Avoid glowing dividers, routine headings, inactive buttons, and decorative dots.
- Test luminous elements on bright, dark, warm, cool, and visually busy artwork.

### Rank and ordinal language

Trending ordinals and tier ranks belong to the same expressive family but have different semantic roles.

#### Trending ordinals

- Near-white or hollow core.
- Electric cyan aura.
- Large dark extrusion.
- Oversized, condensed, italic typography.
- May overlap artwork and card boundaries.

They communicate momentum and sequence before the user reads anything.

#### Tier ranks

- Solid tier-colored core.
- Dark protective edge.
- Tier-colored aura with intensity appropriate to size.
- Condensed italic typography using the same angle and physicality across surfaces.

Optical variants:

| Context | Core treatment | Aura | Depth |
| --- | --- | --- | --- |
| Rankings overview | Solid tier color | Medium | Clear dark extrusion |
| Ranking picker | Solid tier color | Stronger only when active | Container response reinforces selection |
| Collection card | Solid tier color | Tight, restrained | Thin dark edge |

Consistency means shared material and behavior—not identical rendering at every size.

### Typography

Use two voices:

- **Editorial/display:** expressive, condensed, dimensional, or logo-led. Reserved for important moments.
- **Interface/reading:** highly legible, restrained, and mostly sentence case.

Hierarchy should generally follow:

- Page or chapter title: large, confident, limited in number.
- Module heading: clear and quieter than the page title.
- Content title: prominent but subordinate to the artwork when artwork is the focus.
- Taxonomy and metadata: regular or medium weight, sentence case, visually secondary.
- Supporting copy: readable size and line height; never compressed merely to fit more chrome.

Avoid using bold uppercase for every label. Weight, casing, size, and spacing must create distinct roles.

### Text necessity gate

Before adding any visible text to a component, ask all three questions:

1. Is this text actionable?
2. Is it absolutely necessary and load-bearing for understanding or completing the task?
3. Do the existing visual, spatial, or interaction cues already communicate it?

Apply this gate to every existing and proposed visible string whenever a component is created or modified. Run it before implementation and again during final review, in the context of the whole screen and user journey.

If the text is neither actionable nor load-bearing, remove it. If other cues already communicate it, remove it. Internal taxonomy, ceremonial labels, brand stamps, explanatory captions, and restatements of visible state do not earn a place merely because a composition has empty space. Status feedback is permitted only when it reports a change the user could not otherwise perceive.

The positive test is equally strict. New text, metadata, or visual information earns space only when it does at least one of these jobs:

- Enables a clear next action.
- Reveals a trustworthy, user-specific truth that makes the object meaningfully theirs.
- Clarifies the scope or contents of an object when the artwork and title cannot.
- Confirms a state change the user could not otherwise perceive.

Then verify that the information is accurate, cannot be inferred from stronger existing cues, and receives no more visual emphasis than its decision or expressive value warrants. Do not manufacture rarity, provenance, dates, personality, or social proof from data Loot does not genuinely have. Empty space is allowed; it is not an invitation to invent meaning.

### Materials and chrome

- Navigation and controls may float above content using restrained translucent materials.
- Content should not be wrapped in glass merely because glass is available.
- Use enough opacity or dimming to protect legibility over bright media.
- Utility controls should recede until needed and become expressive only when active.
- Do not create a separate container for information that can be grouped through alignment and spacing.

#### Container necessity gate

Begin new and substantially revised components from a content-first, uncontained composition. Existing shells do not earn automatic preservation. Before adding or retaining a background, border, radius, shadow, inset panel, material surface, padded shell, or other visible boundary, name its indispensable purpose. It must establish a distinct interactive object, group controls with shared behavior or state, protect legibility when lighter techniques cannot, or communicate a real semantic or spatial relationship.

Perform a removal pass before approval:

1. Remove the container's background, border, radius, shadow, and extra padding.
2. If the component remains understandable and usable, leave the container removed.
3. Reject nested containers unless the inner object has genuinely separate behavior or state.
4. Reject blank chrome created mainly to house sparse metadata. Adapt information to the content composition instead of shrinking content to accommodate it.
5. Inspect the component in the rendered full-page context. If its material, silhouette, or panel system registers before its content or purpose, it fails.

One visible boundary is the default maximum for one semantic object. This is not a requirement for universal full bleed; a boundary that passes the gate remains valid. Artwork and content must still determine the composition rather than appearing as an insert inside interface furniture.

### Generated achievement collectibles

- Achievement cards are generated from achievement data, not individually art-directed by default.
- Use literal, immediately understandable names such as “Cartoon Network” and “Shōnen anime.” Do not invent collectible nicknames that obscure what the user earned.
- Treat counts as supporting evidence, not the achievement's identity. Their prominence must reflect the decision value they provide on that surface.
- A logo is optional supporting data. It must never be required for the composition to work, overlap the completion number, or force a different information hierarchy.
- Generate cards from a stable anatomy: recognizable identity + source artwork + only the minimum supporting data that passes the text necessity gate. Variation must come from those inputs rather than additional labels or decorative chrome.
- Support three classifier families: studio, genre, and series. Studio cards behave like catalogue retrospectives, genre cards share a semantic visual energy, and series cards present their installments as one continuous world.
- Treat a recognizable studio or series logo as its identity. Never repeat the same identity as an equally prominent text label beside or beneath its logo.
- One title maps to one collectible card. A multi-title collection maps to a binder page or sticker-album grid of slots, never to a single card or a sealed pack. Filled slots show title cards; unfinished slots remain visible as quiet silhouettes so scope and progress are understandable without opening a nested selector.
- Do not use pack-opening or gacha framing for earned records. Surprise completion may carry unboxing energy because the completion was earned, but the object revealed is the title card and the collection remains the binder page.
- Build title cards from existing truth: key art, title logo, year, a verified studio mark, artwork-derived dominant colour, and the user's tier where available. Prefer a recognizable property or studio logo when one is available. Animation tradition or vibe may shape the optical material, but an invented glyph must not appear as standalone card information unless Loot has already taught users its meaning.
- At title-card inspection scale, a studio logo is identity rather than incidental metadata. Give its native mark enough size, contrast protection, and clear space to be recognized immediately across bright, dark, and busy artwork. Do not force it into a generic badge or tint it into invisibility.
- Treat the holo material as data-driven card material, not a generic rainbow overlay. The swappable foil texture comes from the title's studio mark or animation-tradition/vibe glyph; dominant colour tints the material; collection-frequency treatment selects the finish: everyday is matte, Sunday is regular holo, and heirloom uses the richer cosmos treatment. These treatment names remain internal.
- Series cards must not use installment posters when their embedded titles would repeat the series classifier. Prefer logo-free stills, character art, or environmental key art composed as one shared world, with the franchise logo appearing exactly once in the classifier position.
- Do not add an earned-state slogan when the completed object, its context, and its progress already communicate the state. Let artwork and identity carry the object before adding a textual achievement message.
- Give completion numerals a solid, colored core with a protected dark edge. Foil, shine, texture, glow, and extrusion may reinforce the earned object but must not make the glyph transparent, clipped, or ambiguous.
- Use no more than one visible outer card edge. Do not stack decorative outlines, frames, or information containers.
- Adapt the artwork composition to the number of source shows: dense mosaic for many, directional slices for a medium set, and full-bleed panels for a small set.
- Preserve a consistent information hierarchy across generated cards even when artwork composition changes.
- Begin series achievement progress as soon as the user watches one required installment. Keep incomplete achievements visible by default, without dismissal, so unfinished collections remain a useful invitation rather than a transient recommendation.
- Treat achievement cards as navigable collection summaries. Activating a card must reveal its required titles, current watched/total progress, direct title navigation, and the canonical Seen and Watchlist actions.
- Name the collection boundary wherever it appears. A direct installment line is a “series”; a wider group containing spin-offs or distinct subseries is a “universe.” Never show a bare root title when the membership extends beyond that root (for example, Puss in Boots inside the Shrek universe).
- Registry-backed collection details hydrate released members into canonical title records on demand. Every listed title receives real artwork and metadata when available, the full editorial row has an obvious details affordance, and Seen and Watchlist remain separate canonical actions. A generated placeholder must not become a dead end.
- Reserve celebratory gold material for earned history. Incomplete achievements use neutral progress treatment; if a completed collection later gains a new installment, preserve the earned card and identify the new chapter without revoking the original achievement.
- Treat completion as recognition, not victory. The full-screen moment may be loud and physical, but its copy states a truth about the user; never use “unlocked,” score, XP, confetti, or congratulatory fanfare.
- Materialize a full-screen completion as one focused title card displayed on a quiet artwork-derived stage, not as an announcement written across a dimmed hero and not as a proxy card for the whole set. The revealed card is the title that completed the binder page. Do not add scope labels, a Loot stamp, an earned-state slogan, an app-derived date, or explanatory record copy when the object and its context already communicate those facts. Surrounding chrome only offers View collection and Share card. The shared export must preserve the same card anatomy so the thing shown, saved, and shared is recognizably the same earned artifact.
- Give completion collectibles a physically responsive material at inspection scale: pointer or touch position may drive restrained 3D tilt, directional shadow, local glare, and masked prismatic foil. Keep title artwork and identity above the optical material so they remain legible. The effect must respond to interaction, settle when interaction ends, use a quiet static treatment under reduced motion, and never become perpetual ambient animation. Shared exports preserve a deliberate static foil pose rather than pretending to capture motion.
- Scale completion treatment by how rarely an event of that scope occurs: small everyday sets stay plain, medium bodies receive a fuller cover moment, and substantial canons receive the strongest placement. Do not expose these as rarity labels.
- Below half-complete, frame a collection as a capture prompt (“Seen the others?”), not a debt or progress chore. Detailed views may show the factual record, but low-progress rail cards should not lead with a remaining-work bar.
- Use one coherent hero composition for collection covers: collection or member backdrop, artwork-derived colour field, and title as a type layer. Use a multi-poster split only when no suitable hero image exists.
- Dismissal means “not for me,” not deletion. Keep it behind detail or long-press, restore it when new watching contradicts the dismissal, and provide a reversible list in Settings.
- Studio pages are discovery infrastructure available independently of progress. Personal studio records materialize only after at least two watched titles form a meaningful pattern and the studio visibility rule is satisfied.
- Enter studio discovery from Discover's Explore chapter as a compact glimpse of the directory: a Studios heading, a direct All action, and a small number of studio headers with representative title rows. Do not add a slogan, featured-studio card rail, or hero treatment there. Studio name, factual catalogue total, and chevron belong on the tappable header; the artwork row simply demonstrates the catalogue beneath it. Heterogeneous studio logos are reserved for singular identity moments where their native treatment has room to breathe, never normalized into a forced-white rail. Do not use unrelated feed artwork as a generic studio promotion. Keep Collections focused on the user's personal studio progress and earned records.
- A studio directory uses one clearly navigable header per studio: name, factual catalogue total, and chevron. Activating that header opens the complete studio catalogue. A quiet, static row of representative title artwork beneath it demonstrates breadth; it is not another card, does not animate for decoration, and does not repeat the studio's identity.
- A discovery studio page uses a compact brand-and-count header followed immediately by its titles. Do not reuse achievement progress copy or introductory prose there. Give each title enough room for canonical artwork, name, year, format, a short overview when available, and the standard Seen and Watchlist actions.

## Motion and Feedback

### Motion purposes

Every animation must perform at least one job:

- Preserve spatial continuity.
- Confirm cause and effect.
- Communicate status or progress.
- Direct attention to newly relevant information.
- Express the character of animated content at a signature moment.

If it performs none of these jobs, remove it.

### Motion intensity

- **Ambient:** slow, low-contrast, optional; never competes with reading.
- **Navigational:** quick and spatially coherent.
- **Interactive:** immediate and tactile.
- **Celebratory:** rare, brief, and proportional to the achievement.

### Haptics and sound

- Pair with discrete, meaningful events such as a successful rank placement.
- Match sharp motion with sharp feedback and soft motion with soft feedback.
- Never use audio or haptics as the only feedback channel.
- Avoid automatic audio in browsing surfaces.

## Page-Level Rhythm

- Begin with the most valuable reason to be in the product, not the most data-heavy module.
- Discover is one continuous feed, not three tabbed chapters. Do not add persistent “Now / For you / Explore” anchor tabs or a tautological “Explore animation” heading; let literal module promises and page rhythm establish orientation.
- Personal recommendation rails use one natural-language heading: “Because you love [title].” The referenced title must be an earned positive taste anchor—S tier, A tier, or Top 8—but the heading does not expose the underlying rank, split the sentence into separate typographic levels, or add a rank badge. Keep deeper recommendation logic out of the feed unless the user explicitly asks for it.
- Name rotating editorial rails for the specific theme they contain and explain that theme in plain language. Internal concepts such as “vibe crate” are not user-facing labels.
- A ranked-list module must offer multiple useful lenses—such as all-time, current season, films, currently airing, or audience/genre cuts—within one stable anatomy. At least one lens should change with current release or schedule data so the module remains worth revisiting.
- Treat the full-screen trailer experience as an ongoing feed. The entry surface may feature one clip, but must not advertise a small fixed playlist; load new, non-repeating clips as the user approaches the end and preserve a direct retry if the source is temporarily unavailable.
- Alternate visual density; give the eye recovery space after an immersive feature.
- Use chapter changes that are recognizable through scale, spacing, and content—not decorative bars.
- Limit repeated card formats. A layout change must correspond to a content or behavioral change.
- Keep persistent navigation from competing with in-feed controls.

## Accessibility and Performance

- Legibility and contrast are non-negotiable across unpredictable artwork.
- Effects must survive reduced motion, increased contrast, and disabled audio/haptics.
- Do not encode meaning only through color, glow, motion, or sound.
- Keep touch targets usable even when their visible treatment is minimal.
- Avoid large or peripheral motion that causes discomfort.
- Fast response, stable layout, and correct back behavior are part of immersion.

## Anti-Overcorrection Rules

1. Do not turn a successful technique into the entire aesthetic.
2. Do not remove a valuable technique because one scale or implementation failed.
3. Fix the failed parameter before replacing the underlying idea.
4. Do not confuse consistency with identical rendering.
5. Do not confuse spectacle with immersion.
6. Do not add decoration when composition, imagery, or hierarchy can solve the problem.
7. Do not flatten expressive moments in pursuit of generic cleanliness.
8. Do not let effects compromise comprehension.
9. Keep one primary spectacle per viewport.
10. Evaluate the whole page before polishing an isolated component.

## Required Design Review

Before approving a new or changed interface, answer:

### Content

- Is the animated work more prominent than the interface around it?
- Is the chosen artwork appropriate for this size and purpose?
- Can the user understand the module without reading its smallest text?

### Hierarchy

- What does the eye see first, second, and third?
- Is there more than one element fighting to be the focal point?
- Does every container have a functional reason to exist?

### Immersion

- Does the transition preserve context and sense of place?
- Does the interaction respond immediately and predictably?
- Is any effect communicating meaning, or merely decorating space?
- Is there a personal, editorial, or emotional reason to care?

### Visual system

- Is color sourced from content, semantic meaning, or real state?
- Does lumination have a sharp core, controlled aura, and protected silhouette?
- Is the effect optically adjusted for its size and background?
- Does the component use the established display and interface typography roles?

### Restraint

- What could be removed without losing meaning?
- Has every visible string passed the text necessity gate: actionable, load-bearing, and not already communicated by another cue?
- Has every visible boundary passed the container necessity gate and the removal test?
- Does the content define the composition, or has it been reduced to an insert inside chrome?
- Is this viewport offering one clear spectacle or several competing ones?
- Does the chrome become quiet when the content deserves attention?

### Reliability

- Has the design been checked on bright, dark, and busy artwork?
- Does it work with reduced motion and without sound or haptics?
- Does it preserve scroll, back navigation, and state correctly?

## Research Basis

These sources inform the principles above. They are inputs, not substitutes for testing Loot with real users.

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple Human Interface Guidelines: Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [Apple Human Interface Guidelines: Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Netflix: The Power of a Picture](https://about.netflix.com/en/news/the-power-of-a-picture)
- [Netflix TechBlog: Artwork Personalization](https://medium.com/netflix-techblog/artwork-personalization-c589f074ad76)
- [Keeping Users in the Flow: Mapping System Responsiveness with User Experience](https://doi.org/10.1016/j.promfg.2015.07.436)
- [Narrative Transportation: How Stories Shape How We See Ourselves and the World](https://www.sciencedirect.com/science/chapter/bookseries/abs/pii/S0065260124000145)
- [Web Page Visual Hierarchy: Examining Faraday's Guidelines for Entry Points](https://doi.org/10.1016/j.chb.2018.03.014)
- [Simey: Pokémon Cards Holographic Effect](https://codepen.io/simeydotme/pen/abYWJdX)
- [Simey: Pokémon Cards CSS source and implementation notes](https://github.com/simeydotme/pokemon-cards-css)

## Maintaining This Document

- Update this document when a deliberate product decision changes the visual grammar.
- Do not silently introduce a conflicting pattern.
- A direct user decision overrides this document; record the new decision here so future work remains coherent.
- When uncertain, prototype alternatives and evaluate them against the full-page experience rather than judging an isolated component.
