# dxd-chargen v134

## Route-based tabs

- Forge: `/`
- Sheet: `/sheet`
- Library: `/library`
- Admin Global: `/admin`
- Admin Characters: `/admin/characters`
- Admin Tests: `/admin/tests`
- Admin Info: `/admin/info`

Each tab is a separate React/Next page. Workspace routes share persistent character state through a common layout/provider, and route loading boundaries display a spinner during code/content transitions.

## Admin Global

- Seed default changed from 2044 to 0 for new settings.
- Seed field is disabled unless Change Seed Number is enabled.
- Changed seed exposes Save; Save requires confirmation, resets random sequence to 0, then re-locks the field.
- Revery discards the current unsaved seed edit and re-locks the field.
- Global Library tags are alphanumerically sorted and protected by explicit edit mode.
- Read-only tag spans include live filesystem-character counts.
- Tag edit mode uses a token field and confirmation before persistence.

## Library

- Default visible columns: Portrait, Character Name, Tags.
- Optional columns: Ancestry, Profession, Timestamp, Filename.
- Columns button persists Library/Admin visibility independently in browser storage.
- Tags are a dedicated sortable and filterable column.

## Admin Characters

- Characters Library - Admin shares Library filtering/column behavior.
- Every row has a selection checkbox.
- Export PDF and Edit Tags remain disabled until at least one character is selected.
- Edit mode stages per-record token-field changes, supports Cancel rollback, enables Save only after a real change, and requires Update confirmation before filesystem writes.
- `/api/character-files/tags` updates only each draft's `utilities.libraryTags`.
- Selected PDF export reuses the CRS front/back renderer, combines all selected characters into one PDF, and orders characters alphanumerically by display name.

## Character Record Sheet

- Sheet Back Movement and Carrying universal-chart fields shift exactly 10px right while retaining the fixed CSS Grid.
