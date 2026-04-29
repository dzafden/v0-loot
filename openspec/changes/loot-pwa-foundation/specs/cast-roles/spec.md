## ADDED Requirements

### Requirement: User can assign cast members to personal roles
The system SHALL allow the user to assign TV show characters to named personal role slots. Predefined role slots SHALL include: "Best Friend", "Life Coach", "Villain I Love", "Comfort Character", and the user MAY add custom role names.

#### Scenario: Assign character to a role
- **WHEN** the user selects "Best Friend" and searches for a cast member from any of their shows
- **THEN** that character is assigned to the Best Friend slot

#### Scenario: Custom role creation
- **WHEN** the user types a new role name and saves
- **THEN** the new role slot appears in the cast roles view and can accept a character assignment

#### Scenario: One character per role slot
- **WHEN** the user assigns a new character to a role that already has one
- **THEN** the new character replaces the old one in that slot

### Requirement: Cast member visual shows character photo and show badge
The system SHALL display cast role cards with the character's image sourced from TMDB, the character name, the actor's name, and a small show title/logo badge indicating which show they are from.

#### Scenario: Character image from TMDB
- **WHEN** a cast role card is rendered
- **THEN** the character's profile image from TMDB is displayed as the card's primary visual

#### Scenario: Show badge on cast card
- **WHEN** a cast role card is rendered
- **THEN** a small badge in the corner shows the show title or poster thumbnail the character is from

#### Scenario: Missing image fallback
- **WHEN** TMDB has no image for the character
- **THEN** a stylized placeholder silhouette with the show's dominant color is shown

### Requirement: Cast roles are discoverable from show cards
The system SHALL allow the user to browse a show's cast list from within the show's detail view and assign any cast member to a role from there.

#### Scenario: Browse cast from show detail
- **WHEN** the user opens a show's detail view
- **THEN** a "Cast" section lists characters with their TMDB images

#### Scenario: Assign role from cast list
- **WHEN** the user taps a cast member and selects "Assign Role"
- **THEN** a role picker appears and the selected role is updated

### Requirement: Cast roles are displayed in a dedicated view
The system SHALL display all assigned cast roles in a dedicated "My Cast" screen, styled similarly to a character lineup or team roster.

#### Scenario: My Cast screen renders role cards
- **WHEN** the user navigates to "My Cast"
- **THEN** all assigned roles are shown as character cards in a grid or list, grouped by role name
