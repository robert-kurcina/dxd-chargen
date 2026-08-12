# Canon / UX Sync v99

This release establishes the character-creation application architecture without claiming completion of the individual DXD rule forms.

## Changes

- Replaced the non-canonical `steps.json` order with the five DXD creation phases: Background, Intrinsics, Proficiencies, Properties, Utilities.
- Restored omitted creation concerns including Age, Sophont Species, Wealth, Properties, and Relationships.
- Retained PML as the current application term rather than restoring the obsolete player-facing Character Level label.
- Replaced the Worksheet placeholder with the Character Forge workflow shell.
- Made Forge the default top-level application tab.
- Added reversible phase/substep navigation and progress-state prototyping.
- Added browser-local draft autosave for the workflow foundation.
- Added `src/lib/character-draft.ts` to separate creation state from final character-sheet presentation data.
- Added provenance-oriented structures for granted, purchased, calculated/rule, and GM-sourced selections.
- Retained existing data catalogues, tests, Info page, empty sheet, and sample sheet.
- Added `docs/FINAL_PRODUCT_PLAN.md` covering UX, rule architecture, validation, persistence, milestones, and release criteria.

## Important limitation

The current Forge is a workflow and state-model foundation. Individual DXD creation forms are intentionally labeled as pending. The temporary "Mark step complete" control exists only to exercise the complete navigation/progress shell and is to be removed as each step receives real field-based validation.
