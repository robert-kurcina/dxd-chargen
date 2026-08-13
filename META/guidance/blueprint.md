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

`Static DXD catalogues -> CharacterDraft -> deterministic rules/validation -> CharacterSheet projection`

`CharacterDraft <-> local Character Library`

React components should render results and dispatch selections. They should not become the authoritative location for DXD formulas.

## Current release

v110 has functional Background, Intrinsics, Proficiencies, Properties, and in-scope Utilities phases, plus whole-character validation, deterministic live CRS projection, and a browser-local multi-character library with JSON portability. Starting Region & Settlement is now a rules-bearing origin context: detailed locales constrain Environs Heritage and inform language, specialization, deity-context, output identity, and random-origin behavior. Release hardening remains the next tranche.

See `FINAL_PRODUCT_PLAN.md` for the full implementation and release plan.
