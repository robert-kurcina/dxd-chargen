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

## Inventory and Notes boundary

Canonical catalogues define purchasable/assignable records. Durable assigned possessions retain catalogue-backed `InventorySelection` records. Notes remain editable free text with no catalogue relationship, quantity field, price, weight, provenance, or other mechanical behavior. Ordinary ammunition purchase units (Arrow/Bolt/Bullet/Round/Pellet packages) convert to Notes when assigned; do not introduce consumable counters or active-play resource tracking. Presentation aliases never alter stored canonical names.

## Current release

v133 has functional Background, Intrinsics, Proficiencies, Properties, and in-scope Utilities phases, whole-character validation, deterministic live CRS projection, and a browser-local multi-character Library with JSON portability. Starting Region & Settlement remains a rules-bearing origin context. Inventory normalization distinguishes durable catalogue items from mechanically inert Notes; runtime Armor legality and Trade starting-gear normalization are enforced for imported/completed characters. The main navigation is Forge / Sheet / Library, with cross-character administration under `/admin`, including deterministic randomization controls and administrator-defined Library tags. Save requires explicit approval before filesystem write, and finished Sheet Notes may show presentation-only catalogue reference lines without gaining mechanical weight, cost, Burden, or ownership effects.

See `FINAL_PRODUCT_PLAN.md` for the full implementation and release plan.
