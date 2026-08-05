# Repository Instructions

## Required visual-system consultation

Before proposing, reviewing, prototyping, or implementing any user-facing UI, interaction, motion, or visual change, read [`LOOT_VISUAL_SYSTEM.md`](LOOT_VISUAL_SYSTEM.md) completely.

Treat it as the product's visual and interaction source of truth:

- Apply its North Star, immersion model, visual grammar, anti-overcorrection rules, and review checklist.
- Evaluate changes in the context of the whole page and user journey, not only the edited component.
- Do not interpret consistency as identical rendering across different scales or contexts.
- Do not add effects without semantic, spatial, or causal purpose.
- If a direct user decision changes the system, follow the user's decision and update `LOOT_VISUAL_SYSTEM.md` in the same task so the project remains coherent.

These instructions apply recursively to the entire repository.

## Required text necessity gate

For every user-facing component you create or modify, audit every visible string in that component—both existing and proposed—before implementation and again during final review. Ask:

1. Is this text actionable?
2. Is it absolutely needed and load-bearing?
3. Are there sufficient visual, spatial, or interaction cues on the screen that make this text redundant?

Keep visible text only when it enables an action or carries meaning the user cannot reliably get from stronger existing cues. Remove redundant explanation, labels, metadata, and restatements of visible state. Empty space is preferable to unnecessary copy. Apply this gate in the context of the whole screen and user journey, not only the isolated component.

## Required container necessity gate

Start every new or substantially revised user-facing component from a content-first, uncontained composition. Do not preserve an existing shell merely because it is already present. Before adding or retaining any background, border, radius, shadow, inset panel, glass or metal surface, padded shell, or other visible container, identify the indispensable job it performs. A container earns its place only when it:

- Establishes a genuinely distinct interactive object.
- Groups controls that share behavior or state.
- Protects legibility when alignment, spacing, a local gradient, or artwork treatment cannot.
- Communicates a real semantic or spatial relationship.

Perform a removal pass before considering the component complete:

1. Temporarily remove the container's background, border, radius, shadow, and extra padding.
2. If the component remains understandable and usable, keep the container removed.
3. Reject a container inside another container unless the inner object has genuinely separate behavior or state.
4. Reject blank chrome created mainly to hold sparse metadata; adapt information to the content composition instead of shrinking content to accommodate it.
5. Inspect the rendered component in its full-screen context. If the material, silhouette, or panel system is noticed before the content or purpose, the component fails review.

One visible boundary is the default maximum for one semantic object. This is not a mandate to make everything full-bleed: boundaries remain valid when they pass the gate. Implementation is not complete until this check has been applied to both newly introduced and existing containers in the touched component.
