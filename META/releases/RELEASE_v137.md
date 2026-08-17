# dxd-chargen v137

## Visual Armor Coverage

- Adds **Display Coverage** immediately after **Generate** on the **Customize Armor** step. It is off by default.
- Displays `hit-locations_male.svg` by default. It displays `hit-locations_female.svg` when Sex is Female, or when Sex is Intersex and Gender is Female.
- Keeps author/source SVGs under `images/` and byte-identical browser-served mirrors under `public/armor/`.
- Both silhouettes expose exactly the 27 canonical granular body atoms used by detailed Armor occupancy.
- Preserves each SVG object's authored/default fill whenever its effective AR is 0.
- Colors covered objects from effective SIZ-adjusted AR: 1–2 red, 3–11 orange, 12–17 yellow, 18–23 green, 24+ blue.
- Sectional Armor and Helms contribute to the fixed-location visualization. Shields and under-armor Gear do not.
- Where existing occupancy rules permit Elbow/Knee overlap, the diagram displays the highest effective AR rather than summing protection.
- Legacy one-side armor without a resolved Left/Right side remains uncolored until that side is resolved.

## SVG correction

- The standalone female asset uses the second-page viewport from the source drawing so it renders as a visible 150×150 silhouette rather than retaining the old combined SVG's first-page viewport.
- The previous combined runtime `public/armor/hit-locations.svg` is superseded by the two standalone silhouettes.

## Rules/data scope

No normalized runtime catalogue, Armor value, SIZ rule, occupancy rule, CharacterDraft schema, character file, Library/Admin behavior, or CRS projection is changed in v137.
