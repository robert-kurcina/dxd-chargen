# Canon Sync v129 — Armor Historical Repricing and Mantle Refinement

## Pricing basis

Armor prices were recalibrated against the user-supplied `calculations-and-tables.xlsx`, principally the `PRICING` and `WAGES` sheets. The workbook is treated as a historical calibration source rather than a timeless price authority. DXD capability, coverage, material, and neighboring catalog entries remain controlling considerations.

The strongest direct anchors include historical values for gambeson/quilt, mail and plate suits, buckler/small/medium/tower shields, breastplate, cuirass, mail gauntlets, boiled/plate greaves, half/full helmets, plate rerebraces, and leather/plate vambraces.

- 93 Armor records audited.
- 50 prices changed.
- 43 prices retained after calibration.
- `ARMOR_REPRICING_v129.csv` contains old/new values and the calibration basis for every entry.
- `ARMOR_BOOK_PARITY_v129.csv` is the current table-ready ledger for the later book-rewrite parity pass.

## Native catalog currency

Armor records now carry canonical `priceSp` values. `priceGp` remains as a compatibility mirror equal to `priceSp / 10` because character finances and purchase-session accounting are presently gp-based. Armor customization presents catalog prices in **sp**. SIZ/TCA scaling operates from the canonical sp price and then derives its gp equivalent for spending.

## Major recalibrations

Representative changes:

- Breastplate, Metal: 800 -> 300 sp.
- Cuirass, Metal: 1000 -> 600 sp.
- Gauntlets, Mail: 40 -> 75 sp.
- Vambraces, Metal: 150 -> 125 sp.
- Long Shirt, Quilted: 120 -> 225 sp (historical gambeson anchor about 228 sp).
- Thin Long Shirt, Mail: 250 -> 600 sp.
- Armor Set, Light (Soft): 500 -> 250 sp.
- Armor Set, Medium (Mail): 1200 -> 800 sp.
- Armor Set, Field (Plate): 2500 -> 4000 sp.

Armor Set prices remain abstraction/quick-pick prices, not strict sums of one mandatory sectional decomposition.

## Metal mantles

A DXD helmet mantle is not a cloth drape. It is articulated overlapping metal plate protecting the rear neck, analogous in construction concept to articulated lames. The default `[Noisy]` trait was removed from:

- Helmet, Half Mantled
- Helmet, Full Mantled
- Helmet, Full Visored Mantled

`[Noisy X]` creates an explicit movement-noise penalty, so ordinary fitted articulation is not sufficient by itself to justify the trait. A poorly fitted, damaged, loose, or deliberately clattering mantle can still acquire `[Noisy]` as an item condition/variation if the fiction warrants it.

Helmet prices were also recalibrated: Half 100 sp; Half Mantled 150 sp; Full 225 sp; Full Mantled 275 sp; Full Visored 275 sp; Full Visored Mantled 350 sp.

## Deferred

- Character inventory normalization remains deferred until the armor editor stabilizes.
- Book-rewrite table parity remains deferred, but the v129 parity ledger now contains the values that should be propagated when that pass begins.
- Weight, D, and AR were not globally recalculated in this pricing pass; the v128 numeric audit remains the active review record for those values.
