## ADDED Requirements

### Requirement: Engine maps genre to animation preset
The system SHALL maintain a mapping of TV genres to animation presets. Each preset SHALL define `entry`, `idle`, `exit`, and `interact` Framer Motion variant objects.

#### Scenario: Genre lookup returns preset
- **WHEN** `getAnimationPreset("Horror")` is called
- **THEN** it returns an object with entry, idle, exit, and interact variants specific to horror

#### Scenario: Unknown genre returns default preset
- **WHEN** `getAnimationPreset("Unknown Genre")` is called
- **THEN** it returns the default loot-drop preset (scale from 0.8 + fade in)

### Requirement: Defined genre presets
The system SHALL implement animation presets for at minimum these genres:

- **Horror**: idle = flicker + red glow pulse; entry = glitch snap-in; interact = screen shake
- **Comedy**: idle = gentle bob; entry = bounce spring overshoot; interact = pop + color burst
- **Drama**: idle = slow breathe (opacity pulse); entry = slow upward drift fade-in; interact = ripple
- **Sci-Fi**: idle = scanline sweep + blue glow; entry = glitch/static reveal; interact = data-stream flash
- **Action/Adventure**: idle = slight shake vibration; entry = slam-down drop; interact = shockwave ring
- **Romance**: idle = heart-glow shimmer; entry = soft bloom fade; interact = sparkle burst
- **Thriller**: idle = shadow flicker; entry = sharp zoom-in; interact = pulse + darken
- **Animation/Cartoon**: idle = jiggle; entry = rubber-band bounce; interact = squish + stretch
- **Documentary**: idle = none (static); entry = slide in from left; interact = highlight underline
- **Default**: idle = subtle float; entry = scale + fade; interact = tilt pop

#### Scenario: Horror idle plays flicker
- **WHEN** a horror card is in idle state
- **THEN** its opacity oscillates between 0.85 and 1.0 with irregular timing and a red box-shadow pulses

#### Scenario: Comedy entry bounces past final scale
- **WHEN** a comedy card enters the grid
- **THEN** it springs to scale 1.0 with an overshoot reaching scale 1.15 before settling

#### Scenario: Sci-Fi card shows scanlines on idle
- **WHEN** a sci-fi card is idle
- **THEN** a repeating linear-gradient scanline overlay animates downward across the card face

### Requirement: Reduced motion fallback
The system SHALL detect the `prefers-reduced-motion` media query. When set to `reduce`, the engine SHALL return a minimal preset (instant entry, no idle loop, no interact effect).

#### Scenario: Reduced motion disables idle loop
- **WHEN** `prefers-reduced-motion` is `reduce`
- **THEN** all cards use opacity-only entry (200ms) and no idle or interact animations

### Requirement: Animation preset is consumed via hook
The system SHALL expose a `useGenreAnimation(genre: string)` React hook that returns the resolved animation preset for use in card components.

#### Scenario: Hook returns correct preset for genre
- **WHEN** `useGenreAnimation("Romance")` is called inside a card component
- **THEN** it returns the romance preset variants
