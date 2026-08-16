# DXD Character Forge v121 — Physical Equipment Scaling Refinement

- Refined fitted Weapon scaling at SIZ 6/9/12/15/18 to Weight Index `-4/-2/0/+2/+4`, OR `+2/+1/0/-1/-2`, Damage `-2/-1/0/+1/+2`, minSTR `-4/-2/0/+2/+4`, and TCA `-8/-4/0/+4/+8`.
- Refined Armor and worn/fitted Equipment Weight to the surface-area-like progression `-4/-2/0/+2/+4` Weight Index.
- Armor now retains its canonical Armor Rating and Deflect at every fitted SIZ; protective material thickness is not reduced with wearer body size.
- Armor TCA follows the fitted Weight Index adjustment one-for-one: `-4/-2/0/+2/+4`.
- Worn Equipment such as Clothing/Wardrobes, Backpacks, and Quivers uses the same fitted Weight progression as Armor.
- Sheet Back continues to render the fitted `SIZ N` suffix and recalculates Weapon/Armor properties from canonical catalog data.
- Allometric Carrying and Brawn X remain applied to Lift/Shoulder/Carry before Burden.
- `EquipmentTotalWeight` remains a floor integer and Burden continues to use R10 floor indexing.
- Character Record Sheet numeric edit fields now use text-backed numeric parsing, preventing Firefox/Chromium native spinner controls from overlaying Attribute values.
