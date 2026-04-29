## ADDED Requirements

### Requirement: Grid renders shows in 2D responsive layout
The system SHALL display all shows in a 2D CSS grid. On mobile the default SHALL be 2 columns. The grid SHALL NOT use 3D transforms on the container — only individual cards may tilt.

#### Scenario: Two-column layout on mobile
- **WHEN** the viewport is 390px wide (iPhone-sized)
- **THEN** the grid renders 2 equal-width columns

#### Scenario: Three-column layout on wider mobile/tablet
- **WHEN** the viewport is 768px wide
- **THEN** the grid renders 3 columns

### Requirement: Cards stagger-animate into the grid
The system SHALL animate cards into view with a staggered delay so they appear to drop in sequentially like loot falling from the sky.

#### Scenario: Stagger entry on initial load
- **WHEN** the grid first mounts with shows
- **THEN** each card animates in with a 60ms stagger delay between cards, starting from the top-left

#### Scenario: New card drops in at the end
- **WHEN** the user adds a new show
- **THEN** the new card plays a single loot-drop entry animation and settles into its grid position

### Requirement: Grid supports sort and filter without full re-mount
The system SHALL reorder and filter cards using layout animations (not unmount/remount) so cards slide smoothly to new positions.

#### Scenario: Sort changes animate card positions
- **WHEN** the user changes sort order (e.g. alphabetical to recently added)
- **THEN** cards animate to their new grid positions using Framer Motion layoutId transitions

#### Scenario: Filter hides cards with exit animation
- **WHEN** the user applies a filter that excludes some shows
- **THEN** excluded cards play their exit animation and disappear; remaining cards reflow into new positions
