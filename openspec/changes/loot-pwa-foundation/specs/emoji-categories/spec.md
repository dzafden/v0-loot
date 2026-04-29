## ADDED Requirements

### Requirement: User can create emoji categories
The system SHALL allow users to create categories where each category is represented by a single emoji chosen from an emoji picker. Category names are optional; the emoji IS the primary identifier.

#### Scenario: Create a category with emoji
- **WHEN** the user taps "New Category", picks an emoji (e.g. 🍔), and confirms
- **THEN** a new category with that emoji is created

#### Scenario: Category name is optional
- **WHEN** the user creates a category with an emoji but no text name
- **THEN** the category is saved and the emoji is used as its display label everywhere

### Requirement: Categories are applied to shows
The system SHALL allow any emoji category to be applied to any show. A show MAY have multiple emoji categories.

#### Scenario: Apply category to show
- **WHEN** the user opens the card context menu and selects an emoji category to apply
- **THEN** the emoji badge appears on the show card

#### Scenario: Show displays multiple emoji badges
- **WHEN** a show has 3 emoji categories applied
- **THEN** all 3 emoji badges are visible on the card face (stacked or row)

### Requirement: Emoji badge is visible on the card
The system SHALL display applied emoji categories as small badges on the card face. Badges SHALL be positioned without obscuring the show title.

#### Scenario: Emoji badge position
- **WHEN** a card has emoji categories
- **THEN** emoji badges appear in the top-right corner of the card face as small pill badges

### Requirement: User can filter the grid by emoji category
The system SHALL allow filtering the main grid to show only shows tagged with a specific emoji category.

#### Scenario: Filter by emoji
- **WHEN** the user taps an emoji category in the filter bar
- **THEN** the grid filters to only show cards tagged with that emoji, with smooth exit/enter animations

#### Scenario: Clear filter restores all cards
- **WHEN** the user taps the active emoji filter again
- **THEN** the filter is cleared and all shows return to the grid
