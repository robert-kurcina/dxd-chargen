# Canon / Product Sync v140

v140 tightens Personal Armor representation and Visual Armor Coverage without changing normalized Armor catalogue values.

- Structured Armor inventory is singleton: one selection represents one physical Armor Set, sectional piece, Helm, Shield, or Gear layer. Armor quantities cannot be increased above 1. Left/right sectional pairs are represented as separate side-specific selections.
- Legacy v125/v126 unsided one-side sectional records stored as quantity 2 are preserved by normalizing them into explicit Left and Right singleton selections.
- Abstract `Arms` coverage no longer directly claims Shoulder atoms. A Shoulder is inferred when Upper Chest and the adjacent Upper Arm are both protected; inferred Shoulder AR is the lower adjacent AR, unless explicit Shoulder protection is stronger.
- Visual Armor Coverage changes presentation colors only: warmer yellow, less-saturated blue, and a 1px non-scaling black outline on colored coverage regions.

No `src/data` Armor catalogue record, SIZ scaling formula, sectional occupancy atom definition, CharacterDraft schema, character file, Admin/Library behavior, or CRS projection is changed.
