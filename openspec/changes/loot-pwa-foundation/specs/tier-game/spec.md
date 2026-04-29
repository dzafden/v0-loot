## ADDED Requirements

### Requirement: Tier game presents shows for ranking
The system SHALL provide a tier-ranking mode where the user drags show cards into S, A, B, C, and D tier rows. Each tier row is labeled and color-coded.

#### Scenario: Tier game renders all tiers
- **WHEN** the user opens the tier game
- **THEN** five labeled rows are displayed: S (gold), A (orange), B (yellow), C (blue), D (gray)

#### Scenario: Unranked shows appear in a source pool
- **WHEN** the tier game opens
- **THEN** all shows not yet ranked appear in an "unranked" pool below the tier rows

### Requirement: Drag to assign tier
The system SHALL use @dnd-kit to enable touch-native drag of show cards from the pool or existing tier rows into any tier row.

#### Scenario: Drag from pool to tier
- **WHEN** the user drags a card from the unranked pool and drops it onto the S tier row
- **THEN** the card moves to that tier row and the pool shrinks

#### Scenario: Drag between tiers
- **WHEN** the user drags a card from the A tier to the B tier
- **THEN** the card moves to B tier; A tier reflows

#### Scenario: Drop feedback animation
- **WHEN** a card is dropped into a tier
- **THEN** the card plays a quick landing animation (scale bounce) in its new position

### Requirement: Tier assignments are persisted
The system SHALL save tier assignments to local storage. Tier state SHALL persist between sessions.

#### Scenario: Tier state survives reload
- **WHEN** the user assigns shows to tiers and closes the app
- **THEN** the same tier assignments are present when the app is reopened

### Requirement: Tier ranking can be reset
The system SHALL allow the user to reset all tier assignments, returning all shows to the unranked pool.

#### Scenario: Reset clears all tier assignments
- **WHEN** the user confirms the reset action
- **THEN** all tier rows are emptied and all shows return to the unranked pool with an exit animation
