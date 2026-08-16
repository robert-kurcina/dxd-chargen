# Canon Sync v116 — Jewelry, Gemstones, Forms, and Gold State

## Jewelry

The physical Jewelry vocabulary is intentionally economical:

- `Jewelry, Ring`
- `Jewelry, Bracelet` — bracelets, bangles, anklets
- `Jewelry, Necklace` — necklaces, pendants, amulets
- `Jewelry, Circlet` — circlets, tiaras, crowns
- `Jewelry, Belt` — jewelry belts and girdles
- `Jewelry, Ornament` — charms, earrings, brooches, pins, tassels, and comparable small ornaments

All Jewelry has `Ornate X`, default X=1. Each Ornate level provides +2 TCA. Jewelry weight is negligible for ordinary Sophont character-sheet accounting. Material and narrative appraisal are not mechanically fixed. Jewelry may carry presentation-only `customAppend`.

### Jewelry-weight provenance

User-provided Gemini reference retained for later rules-catalog iteration, not for character-sheet weight:

- Rings: thin/stacking 0.0022–0.0066 lb; standard everyday bands 0.0044–0.0176 lb; wide/heavy signet rings 0.0176–0.0331+ lb.
- Necklaces & chains: lightweight/fine 0.0066–0.0176 lb; medium chains/pendants 0.0176–0.0441 lb; heavy statement chains 0.0661+ lb.
- Earrings: small studs/light hoops 0.0022–0.0088 lb; medium/large hoops or dangles 0.0088–0.0220 lb.
- Bracelets & bangles: delicate links 0.0110–0.0220 lb; solid single bangles 0.0331–0.0551+ lb.

## Ordinary gemstones

Ordinary gemstones are distinct from Wildstone. Four economic grades are normalized:

- `Gemstone, Valuable` — 100 gp each
- `Gemstone, Precious` — 10 gp each
- `Gemstone, Semi-precious` — 1 gp each
- `Gemstone, Common` — 0.1 gp each

Gemstone weight is negligible on the character sheet. Provenance assumption for later rules work: 2,267.96 carats per pound; normalize approximately 1,000 standard stones per pound, about 2.27 carats each, rounded to roughly 2 carats for rules simplicity. Wildstone continues to use cubic-inch (cuin) measurement. Gemstones may carry presentation-only `customAppend`.

## Magic Item physical forms

Structured Magic Items remain X=1. Their physical form determines weight whenever an actual catalog form can be resolved. Jewelry forms use the Jewelry catalog above. `Charm` resolves to `Jewelry, Ornament`. Package-derived forms such as Flask or magic ammunition derive singular weight from the catalog package. Otherwise an unsupported small physical form uses a 0.01 lb fallback. Jewelry and gemstones remain zero-weight for sheet accounting.

`Banweapon X` remains the canonical catalog name. `Banhammer` and `Bansword` are form/history descriptions, not replacement catalog classes.

## Armor X

Add the generic Lesser Magic Item `Armor X`. Choose a physical wearable form. Presentation is `${formFactor} of Armor X`; the effect is +X Deflect and +3X Armor. Structured chargen selections remain X=1; higher-X or mechanically customized examples remain Notes. Retain this rule for later rules-book integration.

## Ammunition and Gold

Ordinary ammunition purchase units remain in the catalog for character creation. Buying ammunition deducts its catalog gp from current available Gold and writes the acquired quantity into Notes (for example `10 x Arrows`). It does not become structured inventory and contributes no tracked character-sheet weight.

The spend is pending only for the current loaded editing session. On save/unload/reload it becomes historical Gold already spent; Notes are never re-priced. Legacy/imported ammunition Notes likewise do not alter Gold.

Recorded available gp is historical state and is independent of the gp implied by Wealth Rank. When an imported character provides Gold, that value is authoritative. Wealth Rank supplies a baseline only when no explicit available-gp record exists.

## Magazine and pouch identity

The two mechanically different magazine records are now `Magazine, Crossbow` and `Magazine, Hvy Crossbow`.

The two formerly duplicated singular small-pouch records are one canonical `Pouch, Small`. Ammunition-use distinctions are instance text: `customAppend: "Rounds"` or `customAppend: "Bullets"`, presented as `Pouch, Small (Rounds)` and `Pouch, Small (Bullets)`. The separate `Pouch, Small × 10` purchasing package remains distinct.
