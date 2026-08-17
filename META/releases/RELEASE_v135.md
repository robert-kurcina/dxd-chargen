# dxd-chargen v135

## Admin Characters UX

- Compacts Administration chrome and the Characters Library action banner.
- Keeps only the Admin tab strip sticky; the Administration title scrolls away.
- Replaces the desktop Library table/header combination with a shared CSS Grid for headers, filters, and records.
- Makes the desktop header/filter grid sticky immediately beneath the 44px Admin navigation strip.
- Removes the overflow-container/sticky-`thead` interaction that could cover the first character record.

## Mobile Library behavior

- The active mobile column is selected from the currently visible Columns set.
- The default/fallback is the first checked column in canonical Columns order; with defaults this is Portrait.
- Character-name search appears only when Character Name is the active mobile column.
- Timestamp no longer appears as a hard-coded mobile default.
- Sort controls are shown only for sortable active columns; Portrait is presentation-only.
- Default row ordering is Character Name ascending, with a new sort-storage key to discard the stale v134 Timestamp default.

## Rules/data scope

No DXD rules, normalized catalogues, character data, PDF sheet projection, tag persistence semantics, or export semantics changed in v135.
