# DXD Character Forge v120 — Fitted Gear Scaling

- Corrected Armor scaling to apply page-192 Weight **Index** adjustments rather than adding/subtracting raw pounds.
- Added persistent item fitted-size metadata (`sizedForSiz`) for Weapons, Armor, and fitted/worn Equipment.
- Preserved explicit legacy `SIZ N` item sizes during import and migration.
- Added fitted-weight scaling for Clothing, Backpacks, and Quivers.
- Added `SIZ N` presentation to nonstandard fitted items on Forge and Sheet Back.
- Rebuilt Sheet Back Weapon/Armor property lines from normalized catalog data and fitted-size adjustments rather than stale legacy property text.
- Removed stale catalog-backed `sheetProperties` from active normalized character records; preserved source sheets unchanged.
- Applied the named page-114 Allometric species bands where established, including Klenari +2 and Drauf/Babbita +1.
- Removed Firefox/Gecko number-input spinners from the Character Record Sheet.
