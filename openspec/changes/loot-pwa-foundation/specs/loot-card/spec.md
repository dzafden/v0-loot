## ADDED Requirements

### Requirement: Card displays show identity
The system SHALL render each TV show as a card displaying the show poster image, title, and year. The card SHALL NOT display movie content.

#### Scenario: Card renders show poster
- **WHEN** a show card is mounted
- **THEN** the poster image from TMDB is displayed as the card's primary visual filling the card face

#### Scenario: Card shows title and year
- **WHEN** a show card is rendered
- **THEN** the show title and premiere year are visible overlaid on or beneath the poster

### Requirement: Card has genre-driven animation preset
The system SHALL apply an animation preset derived from the show's primary genre. The preset SHALL define entry, idle, exit, and interact animation variants.

#### Scenario: Horror genre card flickers on idle
- **WHEN** a horror genre card is in idle state in the grid
- **THEN** the card plays a subtle flicker + red glow animation on loop

#### Scenario: Comedy genre card bounces on entry
- **WHEN** a comedy genre card enters the grid
- **THEN** the card plays a bounce spring entry animation

#### Scenario: Drama genre card fades in slowly
- **WHEN** a drama genre card enters the grid
- **THEN** the card fades in with a slow upward drift

#### Scenario: Sci-fi genre card glitches on entry
- **WHEN** a sci-fi genre card enters the grid
- **THEN** the card plays a glitch/scanline entry animation

#### Scenario: Unknown genre falls back to default
- **WHEN** a show has a genre not mapped in the engine
- **THEN** the card uses the default loot-drop (scale + fade) animation preset

### Requirement: Card supports 3D rotation on interaction
The system SHALL apply 3D CSS perspective rotation to the card face on touch (mobile) or mouse movement (desktop). The grid layout SHALL remain 2D; only the card face tilts.

#### Scenario: Touch tilt on mobile
- **WHEN** the user presses and holds a card on a touch device
- **THEN** the card face rotates on X and Y axes tracking the touch point, up to ±20 degrees

#### Scenario: Mouse parallax on desktop
- **WHEN** the user hovers over a card on desktop
- **THEN** the card face tilts toward the cursor position using CSS rotateX/rotateY

#### Scenario: Card snaps back on release
- **WHEN** the user lifts their finger or moves cursor away
- **THEN** the card springs back to flat (0, 0) rotation

### Requirement: Card has a custom outline
The system SHALL allow each show card to have a custom outline style: color, glow intensity, and border pattern. A default outline style SHALL be applied if the user has not customized it.

#### Scenario: Default outline applied
- **WHEN** a card is added without custom outline settings
- **THEN** a default border with the show's dominant color (derived from poster) is applied

#### Scenario: User sets custom outline color
- **WHEN** the user selects a custom outline color for a show
- **THEN** the card border updates to that color with a matching glow effect

### Requirement: Card supports custom overlay
The system SHALL allow each show card to have an optional overlay layer rendered on top of the poster. Overlays SHALL include options: none, vignette, holographic sheen, rarity glow, and static noise.

#### Scenario: No overlay by default
- **WHEN** a card is added without overlay selection
- **THEN** no overlay layer is rendered on the card face

#### Scenario: Holographic overlay animates
- **WHEN** the user selects the holographic overlay and tilts the card
- **THEN** a rainbow sheen layer shifts position with the tilt angle
