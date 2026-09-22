# Preset source inventory and mobile baseline

Status: T01 complete, with explicit limits below. Sources inspected on feature/mobile-campaign-design before any mobile redesign. Historical controls are generation inputs/demonstrations, not a discovered saved-preset catalog.

## Source map

Historical source is `git show 13c5a87^:src/app/tests.tsx`. Component names identify stable lookup locations; line numbers below refer to that historical file, not current source.

| Legacy component / line | Inputs and output | Current mapping | Decision |
| --- | --- | --- | --- |
| AgeGenerationTest / 192 | Species, age group, generated exact age | background-demographics, ageBrackets, startingAgeForDraft | Reuse current age calculation; obey selectable family/group and canonical age bounds |
| TragedySeedTest / 214 | Template, keyword resolution, seed text | background-tragedy-seed and resolveTragedySeed | Reuse current resolver and source provenance |
| CandidacySimulationTest / 321 and CandidacyEvaluatorTest / 384 | Probabilities and expression evaluation | Current trade candidacy validation | Diagnostic evidence, not a user preset |
| SalaryCalculationTest / 429 | Trade/rank/count rows, group pay totals | Current economy rules, tradePackages | Rank/trade are preset inputs; bulk pay is deferred |
| SalaryExpectationsTest / 628 | Contractor trade (Any or selected), optional rank; squad trade, rank, membership/pay | Current trade/profession IDs, starting rank, age and candidacy constraints | Extract mechanical input concept. Do not import arbitrary old 1–10 rank rules or contractor records as complete drafts |
| MilitaryUnitGeneratorTest / 815 | Band/Squad/Group/Company/Detachment/Formation/Division; leader rank; trade; nested units | Existing militaryHierarchy and character-logic generators | Bulk NPC formation output deferred; do not block single-character presets |
| AttributeArrayTest / 1384 | Nine sorted 2D6 rolls | intrinsics-attributes uses 3D high-two; canonical array and point-buy methods elsewhere | Reject legacy attribute algorithm for new presets |
| HeritageGenerationTest / 1409 | Independent random culture/environ/society rows using Math.random | background-heritage; settlement context and normalized heritagePackages | Replace with current eligibility/provenance-aware generator |
| ProfessionAndTitleTest / 1460 | Random trade, rank 0–10, naming practice/title | tradePackages and current rank/title rules | Retain concept; filter candidacy and age rank limits before generation |
| SettlementGenerationTest / 1495 | Random region then weightedSettlementPick | background-region-settlement and settlement-context | Reuse current weighted settlement source; add campaign filters before selection |
| Dice/lookup/scalar tests | Dice and table demonstrations | Current diagnostics / dice | Not player presets |

Current Admin Global (`src/app/admin/global-panel.tsx`) exposes global seed/sequence and Library tags. Current Admin Tests is runtime diagnostics plus dice smoke controls. `src/lib/admin-settings.ts` persists a mutable global random sequence. `src/lib/rules/generate-step.ts` supplies existing step generators, but does not supply atomic whole-character presets, input locks, history, or campaign eligibility.

## Supported concept verification

Current JSON contains 12 trade packages. Wizard contains Spellbinder, Warmage, Alchemist, Illusionist, Summoner, Artificer, and Necromancer. Alef contains Akrunai, Vanyrai, and Huaczwyk. These support the requested Alef/Akrunai Wizard/Necromancer concept as a catalog-backed acceptance example; they do not prove arbitrary rank/attribute combinations are eligible.

Raw species JSON is normalized by src/data/index.ts; generation must use runtime selectable flags, not infer selectability from presence in the raw file. High-rank Spellcaster specialization needs manuscript verification before introduction. No additional rule or entitlement was invented during this inventory.

## Generation integration risks to resolve in T02/T03

1. Existing trade step randomly chooses a package and sets trade rank to 1; whole-character generation must honor chosen trade/rank and satisfy candidacy without silently overriding locked attributes.
2. Existing attribute generation selects roll mode; presets must preserve selected creation method.
3. Existing language/skill/spell/magic-item steps operate incrementally, not replace-all semantics. A whole-character transaction must define which unlocked selections are replaced and which authored notes survive.
4. Randomness currently writes global sequence to localStorage while generating. Failed transactions and redo must not leak partial random-state changes. Pass an explicit transaction random source before wrapping generation in history.
5. Workspace setDraft normalizes all rule phases. Normalization can change downstream fields; compare locked inputs after normalization before accepting a transaction.
6. Current localStorage autosave lacks write-failure handling. Preserve current in-memory draft and show an honest storage-failure state.
7. Existing reset warns it cannot be undone. Update this only when reset is a verified undoable transaction.

## Browser baseline

Automated baseline used installed desktop Chrome in a fresh isolated profile against localhost. Viewports: 480x900 (primary), 360x900, 768x900, 1440x900. This is desktop browser viewport testing, not a physical mobile-device or Safari test. Checked initial Forge, Sheet and Library. No page-level uncaught JavaScript errors were observed across the twelve visits. This is not exhaustive runtime coverage.

| Width | Forge document width / height | Sheet document width / height | Library document width / height |
| --- | --- | --- | --- |
| 480 | 480 / 1521 | 480 / 900 | 480 / 4581 |
| 360 | 360 / 1685 | 360 / 900 | 360 / 4616 |
| 768 | 768 / 1325 | 768 / 900 | 768 / 4587 |
| 1440 | 1440 / 1052 | 1440 / 900 | 1440 / 2230 |

At 480px, global navigation is 56px high and Forge's second pinned header is 106px high (162px combined). Save/Revert is in another row. Creation progress currently starts at 8/27 on the normalized blank draft; this is observed behavior, not a new validity claim. Header displays stale v128 Armor Audit text while package version is v147.

Profile is the mobile Character panel behind the floating navigation menu, not a persistent navigation destination. At the initial 900px-tall viewport the floating menu overlaps the Continue action area. Proposed first UX change is explicit Design/Profile/Sheet navigation and a compact top-anchored action structure; exact sheet content remains unchanged.

The initial sheet fits its own viewport and has embedded print/zoom controls; parent-document button enumeration does not measure iframe controls. Preserve iframe/print behavior deliberately. Library contains 22 visible local records in this baseline, without any implemented campaign/account privacy enforcement.

Temporary artifacts: /private/tmp/dxd-mobile-baseline/ contains screenshots for all twelve route/viewport combinations, metrics.json, navigation/profile screenshots, localStorage fixtures and loaded-sheet print reference when captured. Fixtures are local inspection material, not new repository character files or canonical test fixtures. They may contain existing character information and are not committed. Baseline automation scripts are under /private/tmp/dxd-browser-tools/.

Limits: no source character was saved, no new account or cloud backend configured, and no campaign permissions tested. Print capture is a baseline artifact rather than a full export fidelity certification. Mobile redesign, generation integration and history have not yet been implemented.
