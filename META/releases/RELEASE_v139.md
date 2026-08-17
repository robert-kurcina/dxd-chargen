# dxd-chargen v139

## Visual Armor Coverage correction

- Canonical Armor Set quick-picks now immediately color Visual Armor Coverage.
- Front Torso maps to Upper Chest / Chest / Abdomen; Back Torso maps to Upper Back / Lower Back; Arms and Legs map to their complete left/right canonical atomic regions.
- Armor Set visualization uses SIZ-adjusted by-Hit-Location AR and intentionally excludes `noHitLocationBonus`.
- Existing Sectional Armor and Helmet visualization remains atomic and uses the strongest effective AR at permitted overlapping articulation regions.

## Personal Armor controls

- Adds a visible **No Armor** quick-pick before the canonical Armor Sets.
- Replaces the less discoverable `No Armor Set` action with that explicit state.
- Adds **Reset** to the Personal Armor panel. Reset restores the Personal Armor state captured when the editor was opened; it becomes enabled only after Armor edits have changed that state.

## Nested responsive-layout repair

- Armor Set cards use content-width-safe auto-fit grids.
- A single Suggested starting decomposition expands to use available width instead of occupying half of a forced two-column grid.
- Derived Armor capability and its explanatory text stack when the editor column is too narrow for two readable panels.
- Helmet / Shield / Gear controls, Armor summary cards, and sectional catalog rows wrap according to their actual container width rather than viewport-level `md` / `xl` breakpoints.

## Rules/data scope

No normalized Armor catalogue record, sectional occupancy atom, SIZ scaling formula, CharacterDraft schema, character JSON, Library/Admin behavior, or CRS projection is changed in v139.
