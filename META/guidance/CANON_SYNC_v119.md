# Canon Sync v119 — Shoulder, Brawn, and Carried Burden

## Sources

- `sarnalen.rpg.pdf` page 113: Shoulder is Physicality (higher of STR or SIZ) minus 9; Lift/Shoulder/Carry are Basic Carrying Ability Indexes.
- page 114: apply Allometric Scaling to Carrying Abilities.
- page 115: `Brawn X — Increase by +X` under Affecting Carrying Abilities.
- page 293: each Weight Index carried above the applicable Basic Carrying Ability is one Burden and a -1 Movement/Jump penalty.

## Sheet Total

`EquipmentTotalWeight` is a presentation scalar in pounds and MUST be `Math.floor(carriedWeight)`. Do not show decimal pounds in the top-right Total box.

Count structured carried Weapons and Equipment normally, except ordinary ammunition, Jewelry, and Gemstones. Notes never count. Helmets never count for this burden summary because wearing a helmet is optional. If more than one `Armor Set, ...` is owned, only the lightest Armor Set contributes because only one Armor Set can be worn at a time. Other Armor such as Shields contributes normally. Structured Magic Items contribute their normalized physical-form weight except Jewelry/Gemstone forms.

## R10 Weight Index

Convert Total pounds to the R10 Weight Index by floor, not ceiling: use the greatest indexed scalar which does not exceed the total. Example: if Index 10 is 100# and Index 11 is 120#, then 100.1999# remains Index 10. The existing `getIndex()` routine implements this floor behavior.

## Shoulder

`Physicality = max(STR, SIZ)`

`Basic Shoulder = Physicality - 9 + Allometric Carry Adjustment + Brawn X`

Brawn modifies Basic Lift, Basic Shoulder, and Basic Carry by +X. FOR DM affects Maximum Carrying Abilities, not Basic Shoulder.

## Burden display

`Burden = max(0, Total Weight Index - Basic Shoulder)`

Display `0` when there is no burden. Otherwise display the negative excess, e.g. one Index above Shoulder is `-1`.

## Iskender validation

Iskender is STR 9, SIZ 12, Human-scale Allometric +0, Brawn 3. Therefore Physicality 12 and Basic Shoulder 6. With the currently projected inventory, helmets are ignored and the lighter of the Light (Boiled) and Medium (Mail) Armor Sets is counted. The decimal Magic Item fallback does not appear in `EquipmentTotalWeight` because the field is floored to whole pounds.
