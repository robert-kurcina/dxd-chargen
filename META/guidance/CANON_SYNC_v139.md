# Canon / Product Sync v139

v139 corrects Visual Armor Coverage behavior for canonical Armor Set quick-picks and repairs nested Armor-editor responsiveness. It does not change normalized Armor catalogue values, SIZ scaling rules, sectional occupancy legality, CharacterDraft schema, character data, or CRS projection.

## Visual Armor Coverage

- Canonical Armor Sets now color the silhouette using the broad Hit Locations already listed on the canonical quick-pick: Front Torso, Back Torso, Arms, and Legs.
- Broad quick-pick locations are projected onto the existing 27 canonical atomic SVG locations only for visualization. This does not assert a hidden sectional decomposition.
- The displayed value is the Armor Set's effective SIZ-adjusted **by-Hit-Location AR**. `noHitLocationBonus` is excluded because the visualization is explicitly displaying Hit Locations.
- Sectional Armor and Helms continue to use their canonical atomic coverage. Shield and Gear remain outside fixed body-region coverage.

## Armor editing states

- **No Armor** is an explicit Suit quick-pick state (D 0, AR 0, no Suit coverage). Helm, Shield, and Gear remain independently selectable as before.
- **Reset** restores the complete Personal Armor state that existed when the Armor editor was opened, including Suit/sectional selections, Helm, Shield, Gear, and the Forge-only Armor editor state.

## Responsive presentation

Armor-editor internal grids now size from available content width rather than viewport breakpoints. This prevents a narrow center column from forcing decomposition cards and explanatory panels into unusably thin columns.
