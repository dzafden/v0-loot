## ADDED Requirements

### Requirement: Track watched episodes per show
The system SHALL allow users to mark individual episodes as watched. Episodes SHALL be organized by season within each show's detail view.

#### Scenario: Mark episode as watched
- **WHEN** the user taps the checkbox next to an episode
- **THEN** the episode is marked as watched and a small checkmark animation plays

#### Scenario: Episodes grouped by season
- **WHEN** the user opens the episode tracker for a show
- **THEN** episodes are grouped under collapsible season headers (Season 1, Season 2, etc.)

### Requirement: Season-level bulk actions
The system SHALL allow marking an entire season as watched or unwatched in one action.

#### Scenario: Mark season as watched
- **WHEN** the user taps "Mark all watched" on a season header
- **THEN** all episodes in that season are marked watched with a staggered checkmark animation

#### Scenario: Unmark entire season
- **WHEN** the user taps "Unmark all" on a season header
- **THEN** all episodes in that season are cleared

### Requirement: Episode data sourced from TMDB
The system SHALL fetch season and episode data from TMDB using the show's TMDB ID. Episode count, names, and air dates SHALL be displayed.

#### Scenario: Episodes load from TMDB
- **WHEN** the user opens the episode tracker for a show
- **THEN** the system fetches season/episode data from TMDB and displays episode titles and air dates

#### Scenario: Offline episode list uses cached data
- **WHEN** the user opens the episode tracker while offline
- **THEN** previously fetched episode data from the local cache is displayed

### Requirement: Watch progress shown on card
The system SHALL display a watch progress indicator on the show card in the main grid. The indicator SHALL show percentage or episode count (e.g. "12/22").

#### Scenario: Progress badge on card
- **WHEN** a show has tracked episodes
- **THEN** a small progress pill (e.g. "3/10") is visible on the card face

#### Scenario: Completed show shows completion badge
- **WHEN** all episodes in all seasons are marked watched
- **THEN** the card shows a "Completed" badge with a celebratory animation (confetti pop)
