# Canon Sync v120 — Fitted Items, Worn Equipment, and Allometric Carry

## Sources

- `sarnalen.rpg.pdf` page 192: standard Weapons and Personal Armor are designed for SIZ 12; nonstandard fitted items are named with a `SIZ N` suffix. The explicit SIZ 6/9/12/15/18 tables change Weapon Weight/OR/Damage/minSTR and Armor Weight/AR/Deflect by Index.
- page 192 also states that weapons, armor, clothing, food/water, medicine, and other goods can be scaled; v120 applies the fitted-weight rule to worn/fitted Equipment rather than to every carried object.
- page 114: Allometric Scaling adjusts Carrying and Jump Abilities by the species SIZ band. Klenari are in the +2 band; Drauf and Babbita are +1; Human and Alef are +0.
- page 115: `Brawn X — Increase by +X` for Carrying Abilities.

## Item fitted size

`InventorySelection.sizedForSiz` records the physical SIZ bracket for which a manufactured fitted item was made. Standard SIZ 12 may be omitted. The supported page-192 brackets are 6, 9, 12, 15, and 18.

Legacy sheet names such as `Dagger, Standard SIZ 6` import as canonical `Dagger, Standard` plus `sizedForSiz: 6`. New Weapons, Armor, and fitted/worn Equipment receive the current character's nearest supported fitted bracket when added. A stored fitted bracket is historical instance data and does not silently change if the character is edited later.

## Weapon and Armor scaling

Weapon and Armor Weight changes are **R10 Weight Index changes**, not raw pounds. For example, Light (Boiled) Armor is 25# at SIZ 12; the SIZ 6 Armor adjustment is -6 Weight Index, yielding 6#, exactly as the page-192 table states.

The Sheet Back regenerates normalized Weapon and Armor statistics from the current catalog plus fitted-size adjustments. Legacy source strings remain only in `source-sheet.json` provenance. This prevents a renamed/mapped item from carrying mechanics belonging to another legacy item.

## Worn Equipment

Worn/fitted Equipment uses the same Weight-Index shift as Armor but does not acquire Armor Rating, Deflect, or Armor TCA. The current economical classification is:

- any Equipment catalog entry with `Category: Clothing`;
- `Backpack, ...`;
- `Quiver, ...`.

Other containers, kits, tools, books, cases, loose bags, and Notes are not automatically body-scaled.

## Sheet presentation

Every nonstandard fitted Weapon, Armor, or worn Equipment item is presented with `SIZ N` after its normalized name. Weapon/Armor property lines are regenerated from normalized data, including adjusted Weight, ORa, Damage, AR, and Deflect.

## Zoey validation

Zoey is a Klenari and therefore receives Allometric +2. Brawn 1 adds another +1 to Lift/Shoulder/Carry. Her historical Dagger and Hand Crossbow are explicitly SIZ 6 items. Under the current page-192 table:

- `Dagger, Standard SIZ 6`: 0.4#, ORa -4, Damage 1D-2;
- `Crossbow, Hand SIZ 6`: 0.5#, ORa [5], Damage 1D-5;
- `Backpack, Frameless SIZ 6`: 1.5#;
- `Wardrobe SIZ 6`: 1#.

The old 0.8#/1D+1 Hand Crossbow source line is not a valid normalized SIZ-6 Hand Crossbow and is no longer used for runtime presentation.

## Browser presentation

The static Character Record Sheet suppresses native number-input spinner controls in Firefox/Gecko and WebKit/Blink. Numeric fields remain numeric/editable; only browser chrome is removed.
