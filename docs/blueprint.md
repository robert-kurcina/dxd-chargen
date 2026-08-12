# Sarna Len Character Forge — Application Blueprint

## Product role

The Forge is the primary DXD character-creation interface. The character sheet is a live projection/result, not the data-entry workflow.

## UX shell

- Left: canonical five-phase creation navigator.
- Center: the current rule decision and its validation/cost information.
- Right: live character summary and warnings.
- Mobile: navigator and summary become drawers while preserving the same creation sequence.
- Backtracking is allowed; only real rule dependencies block a step.

## Data flow

`Static DXD catalogues -> CharacterDraft -> deterministic rules/validation -> CharacterSheetViewModel`

React components should render results and dispatch selections. They should not become the authoritative location for DXD formulas.

## Current release

v99 supplies the workflow foundation, canonical step order, local persistence prototype, and structured CharacterDraft. Rule-specific creation forms are subsequent milestones.

See `FINAL_PRODUCT_PLAN.md` for the full implementation and release plan.
