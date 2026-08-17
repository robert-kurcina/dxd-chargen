# dxd-chargen v140

## Singleton Armor inventory

- Armor selections are no longer stackable quantities. A structured Armor row represents one physical piece and is constrained to quantity 1.
- Current Armor no longer displays quantity +/- controls or a quantity column.
- Side-specific sectional pieces display `(Left)` or `(Right)` in Current Armor so paired sleeves/leggings are visibly distinct physical pieces.
- Legacy unsided one-side sectional quantity-2 records are expanded into explicit Left and Right singleton selections before worn-armor conflict resolution.

## Shoulder coverage inference

- Broad `Arms` coverage maps to Upper Arm / Elbow / Forearm / Hand.
- If Upper Chest and a side's Upper Arm both have effective protection, that side's Shoulder is inferred as protected.
- Inferred Shoulder AR uses the lower adjacent AR; explicit Shoulder armor may provide a higher value.

## Coverage palette

- AR 1-2: `#dc2626` red.
- AR 3-11: `#f59e0b` orange.
- AR 12-17: `#f2c94c` warm yellow.
- AR 18-23: `#2f8f46` green.
- AR 24+: `#5874a6` desaturated blue.
- Colored body regions receive a 1px non-scaling black outline; legend swatches use the same palette and outline.

## Rules/data scope

No normalized Armor catalogue record, SIZ scaling formula, body-location atom definition, CharacterDraft schema, character JSON, Library/Admin behavior, or CRS projection is changed in v140.
