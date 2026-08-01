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
| Recommendation heading | Solid tier color | Medium | May overlap heading composition |

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

### Materials and chrome

- Navigation and controls may float above content using restrained translucent materials.
- Content should not be wrapped in glass merely because glass is available.
- Use enough opacity or dimming to protect legibility over bright media.
- Utility controls should recede until needed and become expressive only when active.
- Do not create a separate container for information that can be grouped through alignment and spacing.

### Generated achievement collectibles

- Achievement cards are generated from achievement data, not individually art-directed by default.
- Use literal, immediately understandable names such as “Cartoon Network” and “Shōnen anime.” Do not invent collectible nicknames that obscure what the user earned.
- Keep the completion number, content noun, and completion state in one achievement cluster. Reserve one consistent top-right classifier position across studio, genre, and series cards so the card anatomy remains recognizable.
- A logo is optional supporting data. It must never be required for the composition to work, overlap the completion number, or force a different information hierarchy.
- Generate cards from a stable anatomy: classifier identity + completion number + literal achievement + source artwork. Variation must come from those inputs rather than additional labels or decorative chrome.
- Support three classifier families: studio, genre, and series. Studio cards behave like catalogue retrospectives, genre cards share a semantic visual energy, and series cards present their installments as one continuous world.
- Treat a recognizable studio or series logo as the classifier name. Never repeat the same identity as an equally prominent text label beside or beneath its logo. When no logo exists, render the literal classifier name in the same reserved classifier position.
- Series cards must not use installment posters when their embedded titles would repeat the series classifier. Prefer logo-free stills, character art, or environmental key art composed as one shared world, with the franchise logo appearing exactly once in the classifier position.
- Keep the achievement—not the classifier—as the primary textual message. A card should read directly as a number plus a content noun and earned state, such as “10 shows completed” or “4 films completed.”
- Give completion numerals a solid, colored core with a protected dark edge. Foil, shine, texture, glow, and extrusion may reinforce the earned object but must not make the glyph transparent, clipped, or ambiguous.
- Use no more than one visible outer card edge. Do not stack decorative outlines, frames, or information containers.
- Adapt the artwork composition to the number of source shows: dense mosaic for many, directional slices for a medium set, and full-bleed panels for a small set.
- Preserve a consistent information hierarchy across generated cards even when artwork composition changes.
- Begin series achievement progress as soon as the user watches one required installment. Keep incomplete achievements visible by default, without dismissal, so unfinished collections remain a useful invitation rather than a transient recommendation.
- Treat achievement cards as navigable collection summaries. Activating a card must reveal its required titles, current watched/total progress, direct title navigation, and the canonical Seen and Watchlist actions.
- Reserve celebratory gold material for earned history. Incomplete achievements use neutral progress treatment; if a completed collection later gains a new installment, preserve the earned card and identify the new chapter without revoking the original achievement.
- Treat completion as recognition, not victory. The full-screen moment may be loud and physical, but its copy states a truth about the user; never use “unlocked,” score, XP, confetti, or congratulatory fanfare.
- Scale completion treatment by how rarely an event of that scope occurs: small everyday sets stay plain, medium bodies receive a fuller cover moment, and substantial canons receive the strongest placement. Do not expose these as rarity labels.
- Below half-complete, frame a collection as a capture prompt (“Seen the others?”), not a debt or progress chore. Detailed views may show the factual record, but low-progress rail cards should not lead with a remaining-work bar.
- Use one coherent hero composition for collection covers: collection or member backdrop, artwork-derived colour field, and title as a type layer. Use a multi-poster split only when no suitable hero image exists.
- Dismissal means “not for me,” not deletion. Keep it behind detail or long-press, restore it when new watching contradicts the dismissal, and provide a reversible list in Settings.
- Studio pages are discovery infrastructure available independently of progress. Personal studio records materialize only after at least two watched titles form a meaningful pattern and the studio visibility rule is satisfied.

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

## Maintaining This Document

- Update this document when a deliberate product decision changes the visual grammar.
- Do not silently introduce a conflicting pattern.
- A direct user decision overrides this document; record the new decision here so future work remains coherent.
- When uncertain, prototype alternatives and evaluate them against the full-page experience rather than judging an isolated component.
