# DXD Character Forge v116 — Jewelry, Gemstones, and Gold State

- Added six economical Jewelry physical forms and Ornate X, default 1, at +2 TCA per level.
- Added four ordinary gemstone grades: Valuable 100 gp, Precious 10 gp, Semi-precious 1 gp, Common 0.1 gp.
- Extended `customAppend` to Jewelry, Gemstones, and designated `Pouch, Small` instances.
- Normalized Magic Item physical-form weight; unsupported tiny forms fall back to 0.01 lb while Jewelry/Gemstones remain negligible.
- Added generic Lesser `Armor X`: chosen wearable form, +X Deflect, +3X Armor.
- Added historical Gold state separate from Wealth Rank baseline; imported recorded Gold becomes authoritative available gp.
- Ammunition purchases deduct available gp in the active session and immediately become Notes; historical Notes are never re-priced.
- Renamed magazines to `Magazine, Crossbow` and `Magazine, Hvy Crossbow`.
- Consolidated singular `Pouch, Small`; Rounds/Bullets are presentation-only custom appends.
- Preserved structured Magic Items at X=1 and Notes-only handling for mechanically customized/higher-X legacy items.
