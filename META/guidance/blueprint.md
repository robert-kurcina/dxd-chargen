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

v135 has functional Background, Intrinsics, Proficiencies, Properties, and in-scope Utilities phases, whole-character validation, deterministic live CRS projection, and a browser-local multi-character Library with JSON portability. Starting Region & Settlement remains a rules-bearing origin context. Inventory normalization distinguishes durable catalogue items from mechanically inert Notes; runtime Armor legality and Trade starting-gear normalization are enforced for imported/completed characters. Forge, Sheet, and Library are separate routes under a persistent workspace layout; `/admin` defaults to Global and provides separate Characters, Tests, and Info routes. Admin seed/tag controls use protected edit-and-confirm flows. Library presentation defaults to Portrait / Character Name / Tags with optional Ancestry, Profession, Timestamp, and Filename columns. Admin Characters can batch-edit Library tags and export selected CRS records as a multi-character PDF; its compact responsive Library uses a sticky grid header on desktop and a first-visible-column mobile control. Save requires explicit approval before filesystem write, and finished Sheet Notes may show presentation-only catalogue reference lines without gaining mechanical weight, cost, Burden, or ownership effects.

See `FINAL_PRODUCT_PLAN.md` for the full implementation and release plan.
