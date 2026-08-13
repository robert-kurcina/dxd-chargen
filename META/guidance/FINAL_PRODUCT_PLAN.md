# DXD Character Forge — Final Product Plan

## Product goal

The final DXD Character Forge is a web application that guides a player through the canonical Sarna Len / DXD character-creation procedure while continuously maintaining a valid, inspectable character draft. It must automate derived values without hiding where they came from, allow safe backtracking, and produce a play-ready character sheet without requiring the player to transcribe calculations or maintain parallel notes.

The Forge is not a digital copy of the printed character sheet. Character creation is the primary workflow; the sheet is a projection of the current character state.

## Canonical creation sequence

The application uses five top-level phases:

1. **Assign Background**
   - Starting Region & Settlement
   - Demographics (Sex, Gender, Handedness, Age Group/Rank, exact Age, Birth Month)
   - Heritage
   - Social Rank
   - Personality
   - Tragedy Seed
   - Disabilities
   - Belief & Worship
2. **Assign Intrinsics**
   - Sophont Species
   - Attributes
   - Trade and Specialization
   - Zed
   - Wealth
3. **Assign Proficiencies**
   - PML
   - Skills, Abilities, and Talents
   - Additional Skills
   - Languages
4. **Assign Properties**
   - Height and Weight
   - Calculations
5. **Assign Utilities**
   - Spells
   - Starting Gear
   - Magic Items
   - Name
   - Relationships

PML is the canonical application term. Do not restore the obsolete player-facing "Character Level" label.

## UX model

### Desktop

Use a three-column layout:

- **Left: creation navigator.** All five phases and their substeps remain visible. Completed, incomplete, warning, and dependency-blocked states are visually distinct.
- **Center: current decision.** This is the only area that asks the player to make the current choice. Explanations, filters, comparisons, rule warnings, and cost effects belong here.
- **Right: live character summary.** Show identity, species, age, Trade, PML, resource budgets, important derived values, and current warnings. It updates immediately as choices change.

### Mobile

Use the same information architecture, not a separate workflow:

- current step occupies the main screen;
- navigator opens as a sheet/drawer;
- live character summary opens as a second sheet/drawer;
- Back and Continue remain fixed near the bottom when practical.

### Navigation rules

Do not use a rigid locked wizard. Players may revisit completed steps and inspect future steps. A step is blocked only when a real rule dependency makes the controls meaningless or invalid.

Changing an earlier choice must:

1. recalculate all derived values;
2. preserve downstream choices that remain legal;
3. identify downstream choices that became illegal;
4. never silently discard a player choice;
5. explain what changed and why.

## Core architecture

### 1. Static catalogues

The JSON files in `src/data/` are canonical choice/reference catalogues. They should remain data-oriented and should not contain transient UI state.

Examples include species, heritages, professions, traits, spells, equipment, weapons, armor, magic items, beliefs, deities, settlements, PML rules, and calculation tables.

### 2. CharacterDraft

`src/lib/character-draft.ts` is the builder-state layer. It preserves identifiers and provenance rather than flattening everything into display strings.

A choice should normally retain:

- catalogue identifier;
- display name;
- source (`player`, `species`, `lineage`, `heritage`, `trade`, `pml`, `rule`, or `gm`);
- source detail;
- level/specialization where relevant.

The draft also owns completion state and validation warnings.

### 3. Rules engine

Create a deterministic rules layer under `src/lib/rules/` rather than adding creation calculations to React components.

Recommended modules:

- `background.ts`
- `species.ts`
- `attributes.ts`
- `trade.ts`
- `pml.ts`
- `proficiencies.ts`
- `languages.ts`
- `properties.ts`
- `equipment.ts`
- `magic.ts`
- `validation.ts`
- `project-character-sheet.ts`

Each calculation should be a pure function where possible: static data + character draft -> result.

### 4. Character-sheet projection

`character-empty.json` and `character-sample.json` are presentation-oriented. The finished sheet shape should not become the canonical builder state.

The final application should use a projector:

`CharacterDraft + StaticData -> CharacterSheetViewModel`

This produces display strings and derived groupings for `CharacterSheet` without destroying source information used by the builder.

### 5. Persistence

The foundation release autosaves the draft in browser local storage. Final persistence should support:

- local autosave on every committed selection;
- schema versioning and migration;
- explicit new/duplicate/delete character actions;
- JSON export/import for portable backups;
- optional account/cloud synchronization after the local model is stable.

The application must never require network access for basic rules calculations.

## Choice components

Use controls appropriate to catalogue size.

### Small enumerations

For approximately 2–8 meaningful options, use radio cards or compact segmented choices rather than a select menu when comparison matters.

### Medium catalogues

For roughly 8–30 entries, use searchable/selectable lists with descriptions and eligibility notes.

### Large catalogues

Traits, equipment, weapons, armor, spells, and magic items require a searchable catalogue component with:

- text search;
- category filters;
- eligibility filter;
- selected-only filter;
- compact list/table mode;
- detail panel;
- current cost or budget effect;
- source/provenance display;
- add/remove controls;
- keyboard navigation.

Do not render hundreds of entries in a single native `<select>`.

## Provenance and explainability

DXD frequently grants or adjusts capabilities from packages. The application must distinguish:

- **Granted** — received automatically from species, lineage, heritage, Trade, PML, or another rule source.
- **Purchased** — explicitly selected and paid for by the player.
- **Calculated** — derived automatically and not directly purchased.
- **GM** — explicitly overridden or granted by the GM.

Derived values should expose a breakdown. Example:

**Hitpoints 22**

- base: X
- FOR contribution: Y
- PML contribution: Z
- trait adjustments: ...

The exact formula must come from the validated DXD rules engine; the UI should not duplicate formulas.

## Validation model

Every creation step returns a status:

- **complete** — all required inputs are present and legal;
- **incomplete** — required player decisions remain;
- **warning** — legal but unusual, optional information missing, or a downstream choice needs review;
- **blocked** — a genuine prerequisite has not been established;
- **invalid** — a current selection violates a hard rule.

Warnings and invalid states need stable codes so UI text can change without changing logic.

Validation must run both per-step and for the whole character before finalization.

## Budgets and costs

Whenever a choice consumes a creation resource, display:

- total available;
- amount spent;
- amount remaining;
- current choice cost;
- a breakdown of where the budget came from.

Changing an upstream choice may alter a budget. The system must recompute legality rather than assuming the previous budget still applies.

## Search and comparison

High-impact mutually exclusive choices should support comparison before commitment, particularly:

- species/lineage;
- heritage packages;
- Trade/specialization;
- attribute arrays or point-buy alternatives;
- expensive traits;
- equipment and weapons;
- spells and magic items.

A player should not have to open several browser tabs or remember values from previous modal windows.

## Accessibility and responsive requirements

Release criteria include:

- full keyboard operation for creation controls;
- visible focus states;
- semantic labels for all controls;
- no status communicated by color alone;
- responsive operation at phone, tablet, and desktop widths;
- usable large-catalogue search at mobile widths;
- no horizontal page scrolling in normal mobile use;
- screen-reader text for calculated/validation state changes where practical.

## Implementation milestones

### Milestone 0 — Workflow foundation — DONE in v99

- canonical five-phase flow in `steps.json`;
- Forge becomes the default application tab;
- reversible phase/substep navigation;
- progress-state prototype;
- browser-local draft persistence;
- three-column desktop shell;
- structured `CharacterDraft` model;
- existing character-sheet view retained;
- final-product plan added.

### Milestone 1 — Background — DONE in v101

Implemented real controls and validation for all Background steps. Resolve region/settlement relationships, demographic state, age generation/selection, three heritage dimensions, Social Rank, personality, tragedy seeds, disabilities, and belief/worship.

Acceptance target: a Background phase can reach `complete` without prototype completion controls, and changing any Background choice correctly invalidates only affected downstream choices.

### Milestone 2 — Intrinsics — DONE in v102 functional tranche

Implemented Sophont species/lineage, attributes, Trade/specialization, ZED, and Wealth. Apply species/lineage and package adjustments with visible provenance.

Acceptance target: all core attributes and starting economic/professional state are deterministic from draft selections and rules data.

### Milestone 3 — Proficiencies — DONE in v103 functional tranche

Implemented PML, package-granted traits, PML Virtuosity choices, additional Skill purchases, source/cost accounting, and Languages. Added live budget accounting and a searchable Skill catalogue.

Acceptance target: no player must manually re-enter a granted proficiency, and all skill spending has an auditable source/cost breakdown.

### Milestone 4 — Properties — DONE in v104 functional tranche

Implemented height/weight and the canonical derived calculations, with visible calculation inputs and physical source breakdowns.

Acceptance target: the projected sheet's derived values match a suite of canon reference characters and hand-calculated fixtures. Additional fixture expansion remains part of hardening.

### Milestone 5 — Utilities — DONE in v105 functional tranche

Implemented Spells, Starting Gear, Weapons, Armor, complete-data Magic Items, and conlang-driven Name generation. Relationships remain deliberately deferred and non-blocking under the current scope decision. Large catalogues use search/filter controls, Starting Gear shows Personal Wealth and cost/Weight totals, and incomplete Magic Item records are not exposed at runtime.

No starting-Spell allotment or Magic Item entitlement is invented where the current normalized canon does not establish a deterministic rule; those selections require explicit review.

Acceptance target achieved for the in-scope Utilities: a user can record and review all currently modeled starting utilities in the Forge without prose parsing or spreadsheet lookup. Whole-character finalization is Milestone 6.

### Milestone 6 — Finalization and character library — DONE in v106 functional tranche

Implemented whole-character validation, deterministic finished-sheet projection, finalization/reopen workflow, browser-local multi-character storage, legacy v105 single-draft promotion, JSON import/export, New/Duplicate/Delete controls, and print/Save-PDF-friendly sheet rendering. Exported character JSON is a portable read-only/shareable representation until a hosted share-link system exists.

Acceptance target achieved: a user can create multiple characters locally, identify blocking completion gaps, reopen any character without reverse-parsing the sheet, export/import the full structured state, and render the active draft as the finished CRS.

### Milestone 7 — Hardening and release

- rule regression fixtures for representative species/Trades/PMLs;
- unit tests for pure rule functions;
- interaction tests for dependency changes;
- accessibility audit;
- responsive/mobile audit;
- corrupted/old draft migration tests;
- performance testing on the largest catalogues;
- production build/deployment checks.

## Testing strategy

### Rule fixtures

Create canonical fixture characters with known intermediate and final values. Tests should compare both final outputs and calculation provenance.

### Dependency tests

For every upstream choice, test at least one case where a downstream selection:

- remains valid;
- becomes warning-only;
- becomes invalid.

The system must preserve the original selection until the player resolves it.

### Catalogue integrity tests

Validate at build/test time that referenced IDs exist and that imported data conform to expected schemas.

### Projection tests

Given a stable `CharacterDraft`, `project-character-sheet.ts` must produce stable sheet output regardless of UI navigation order.

## Definition of final product

The Forge is ready for general play when a new player can create a legal character from an empty draft to a play-ready sheet without consulting a spreadsheet or manually performing routine calculations, while an experienced player can freely revisit choices and inspect the exact rule source of every granted, purchased, and calculated value.

## Implementation progress

### v101 — Background functional tranche

Complete as interactive builder steps: Region/Settlement, scoped Demographics, Age, Heritage, Social Rank, Personality, Tragedy Seed, Disabilities, and Belief/Worship. Heritage is driven by XLSX-normalized structured grants and writes provenance-preserving selections into the draft.

### v102 — Intrinsics functional tranche

Complete as interactive builder steps: playable Species/Lineage, all three Attribute-generation methods, creation-only Attribute purchases, Trade/Specialization and candidacy, Trade Rank, Affinity/ZED, and calculated Wealth. Trade packages are normalized from the character XLSX and Stars remain author-calibration metadata only. Kriket remains excluded until canonical age data exists; Merchant remains deferred by explicit scope decision.

### v103 — Proficiencies functional tranche

Complete as interactive builder steps: PML with Age validation and advanced-PML warnings; package-granted Trait review with duplicate-source consolidation; Broad Skill specialization resolution; PML Virtuosity milestone choices; Additional Skill purchasing with Age/PML/Trade/Disability Skillpoint sources and Attribute/ZED deductions; and the 17-language conlang catalogue with separate Language proficiency spending. Advanced mutation assignment remains a follow-up warning rather than invented automation.

### v104 — Properties functional tranche

Complete as interactive builder steps: canonical Stature/Build derivation; exact Height/Weight/SIZ lookup; Underweight/Overweight handling; Profile; allometric Carry/Jump scaling; Movement/MOV; Lob/Pitch/Hurl Method Indexes; carrying and jumping; managed concerns; Hitpoints/Bodypoints/Recovery; Favor/Manapool/Cellburn; Max Advantage; limits; and compact CRS compatibility values. Per-item throwing OR remains runtime-derived from Method minus item Weight rather than inventory state.

Next implementation tranche: **Assign Utilities** — Spells, Starting Gear, Magic Items, and Name. Relationships remain deliberately deferred by scope decision.


## v107 QA baseline

The Forge now treats Demographics as a canonical creation step rather than a placeholder and uses the Species → Ancestral Group → Lineage taxonomy. Humaniki is the active playable Species family; Cherigili is retained as a visible but disabled Humaniki Group, while Kriket and Stonefolk are retained as disabled catalogue families.

All major vertical Forge areas are persistent accordions, the Forge header is sticky, and each Assign step exposes a top Generate control when generation is meaningful. The right Character panel is a live projection and must update immediately from upstream choices.

Heritage maturity is driven by canonical asterisk counts stored separately as `maturityStars`. XLSX `authorCalibration.stars` remain package-design metadata only.


## v109 repository-structure baseline

- Canon-sync histories and development/LLM architecture instructions live under `META/guidance/`.
- Release notes and validation reports live under `META/releases/`.
- Executable and maintenance scripts live under `scripts/`.
- `npm run local` delegates to `scripts/run-local.mjs`; platform-specific launchers remain under `scripts/`.
- Repository reorganization does not change the CharacterDraft schema or DXD rules behavior.
