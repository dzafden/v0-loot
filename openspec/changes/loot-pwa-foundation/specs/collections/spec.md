## ADDED Requirements

### Requirement: User can create named collections
The system SHALL allow users to create named groupings of shows called collections. A show MAY belong to multiple collections.

#### Scenario: Create a new collection
- **WHEN** the user taps "New Collection" and enters a name
- **THEN** an empty collection is created and appears in the collections list

#### Scenario: Show belongs to multiple collections
- **WHEN** the user adds the same show to two different collections
- **THEN** the show appears in both collections without duplication in the main grid

### Requirement: User can add shows to collections
The system SHALL allow adding any show to a collection from the card context menu or the collection detail view.

#### Scenario: Add from card menu
- **WHEN** the user opens the card context menu and selects "Add to Collection"
- **THEN** a picker appears listing all collections, and selecting one adds the show

#### Scenario: Add from collection view
- **WHEN** the user is viewing a collection and taps the add button
- **THEN** a search/browse sheet opens to pick a show from their library

### Requirement: Collections have their own grid view
The system SHALL render each collection as a filtered grid using the same loot-grid component with the same card animations.

#### Scenario: Collection grid renders member cards
- **WHEN** the user opens a collection
- **THEN** only shows belonging to that collection are rendered in the grid with stagger entry animation

### Requirement: User can rename and delete collections
The system SHALL allow renaming and deleting collections. Deleting a collection SHALL NOT delete the shows — only the grouping.

#### Scenario: Delete collection removes grouping only
- **WHEN** the user deletes a collection
- **THEN** the collection disappears but all its shows remain in the main library
