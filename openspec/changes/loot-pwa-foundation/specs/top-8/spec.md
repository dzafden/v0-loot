## ADDED Requirements

### Requirement: Top 8 is a pinned hero row
The system SHALL display a dedicated Top 8 section above the main grid. It SHALL show exactly up to 8 shows selected by the user, rendered as larger cards with premium animation treatment.

#### Scenario: Top 8 renders above main grid
- **WHEN** the user has at least one Top 8 show
- **THEN** a horizontally scrollable hero row appears above the main grid

#### Scenario: Top 8 is empty state
- **WHEN** the user has no Top 8 shows
- **THEN** the section is hidden or shows a "Add your favorites" prompt

#### Scenario: Limit enforced at 8
- **WHEN** the user tries to add a 9th show to Top 8
- **THEN** the system rejects the action and shows a message explaining the 8-show limit

### Requirement: Top 8 cards have premium loot-drop animation
The system SHALL play a premium, more elaborate loot-drop animation for Top 8 cards distinct from regular grid cards. The animation SHALL feel like a legendary/exotic drop in Fortnite.

#### Scenario: Top 8 card entry animation
- **WHEN** a show is added to Top 8
- **THEN** the card plays a golden-glow drop animation: falls from above, lands with a shockwave ring, and settles with a persistent glow aura

#### Scenario: Top 8 idle animation is more prominent
- **WHEN** Top 8 cards are idle
- **THEN** they play a more visible version of their genre idle animation (larger glow, faster cycle) compared to grid cards

### Requirement: Top 8 order is manually set by drag
The system SHALL allow the user to reorder Top 8 shows by dragging within the hero row.

#### Scenario: Drag to reorder in Top 8
- **WHEN** the user long-presses and drags a Top 8 card to a new position
- **THEN** other cards shift to make room and the order is saved

### Requirement: User can add/remove shows from Top 8
The system SHALL allow the user to mark any show as Top 8 from the show's card context menu or detail view.

#### Scenario: Add to Top 8 from card menu
- **WHEN** the user opens the context menu on a grid card and taps "Add to Top 8"
- **THEN** the show is added to Top 8 and plays the premium drop animation in the hero row

#### Scenario: Remove from Top 8
- **WHEN** the user opens the context menu on a Top 8 card and taps "Remove from Top 8"
- **THEN** the show is removed from the hero row and returns to the regular grid
