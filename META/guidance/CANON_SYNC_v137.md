# Canon / Product Sync v137

v137 adds a presentation-only Visual Armor Coverage feature to Customize Armor. It does not revise DXD Armor rules, normalized Armor catalogue values, CharacterDraft schema, occupancy legality, SIZ scaling, character data, or Character Record Sheet projection.

The visualization consumes existing canonical data rather than introducing a parallel protection model:

- body regions come from the existing granular `coverageAtoms` used by Sectional Armor and Helms;
- Left/Right occupancy follows the existing sectional side-assignment rules;
- effective AR comes from the existing `adjustedGearValues('armor', ...)` SIZ-adjusted equipment calculation;
- permitted Elbow/Knee overlap displays the highest effective AR and does not stack protection;
- Shields and under-armor Gear remain outside fixed bodily occupancy and therefore do not color body regions.

The AR-to-color bands are presentation semantics for the requested diagram only: effective AR 0 preserves the authored SVG color, 1–2 is red, 3–11 orange, 12–17 yellow, 18–23 green, and 24+ blue.

Silhouette selection is likewise presentational: Female is used for Sex = Female, or Sex = Intersex with Gender = Female; otherwise Male is used. This does not alter the existing Female Differentiation/genetic rules.
