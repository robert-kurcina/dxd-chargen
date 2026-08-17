# Canon / Product Sync v134

v134 is primarily a UI architecture and administration release. It does not revise DXD character-creation formulas or normalized runtime catalogues.

## Navigation architecture

- Forge, Sheet, and Library are separate Next/React routes sharing one persistent workspace state provider.
- Admin has four route-backed tabs: Global (default), Characters, Tests, and Info.
- Route loading boundaries provide a suspense/loading spinner instead of mounting every tab panel at once.

## Global administration

- Default deterministic seed is `0`.
- Seed editing is locked until explicitly enabled, requires confirmation to persist, then locks again.
- Revery discards an unsaved seed edit.
- Global Library tags are alphanumerically normalized, protected by the same explicit edit model, displayed as read-only spans with character counts, and edited through a token field.

## Library presentation

- Default visible columns: Portrait, Character Name, Tags.
- Optional columns: Ancestry, Profession, Timestamp, Filename.
- Tags are a first-class sortable/filterable Library column and render in alphanumeric order.

## Character administration

- Admin Characters derives from the shared Library component.
- Every filesystem record has a selection checkbox.
- Selected records enable Export PDF and Edit Tags.
- Tag edit mode enables per-record token fields; Cancel reverts staged edits and Save requires an Update confirmation.
- The batch tag API modifies only `utilities.libraryTags` in each selected character JSON record.
- PDF export reuses the actual CRS renderer and emits front/back pages for each selected character in alphanumeric character-name order.

## CRS layout

- Sheet Back Walk/Jog/Run and Lift/Shoulder/Carry index/scalar values move 10px right while retaining the fixed-grid layout introduced in v133.
