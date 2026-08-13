# DXD Character Generator

Web character generator for the Sarna Len roleplaying game and DXD rules system.

## Current state — v110

The application opens on **Forge** and follows the canonical five-phase DXD character-creation sequence. **Assign Background**, **Assign Intrinsics**, **Assign Proficiencies**, **Assign Properties**, and the in-scope **Assign Utilities** steps are now interactive against the approved static data and deterministic rules. Relationships remain deliberately deferred and non-blocking rather than being implemented from an invented rules model.

Background currently supports:

- **Starting Region & Settlement as an origin prerequisite**: detailed locales provide settlement population, type, local Environs, current divine sphere, historical setting context, and language/toponym layers; the Corom Region currently has 26 detailed settlement profiles totaling 536.3K;
- Region and Settlement fallback data for regions without a detailed locale;
- full Demographics: Sex, Gender, Genetically Female applicability, Handedness, Age Group/Rank, exact Age, and Birth Month;
- Culture, Environs, and Society Heritage;
- automatic XLSX-derived Heritage grants with provenance;
- Social Rank;
- Personality descriptors;
- generated/resolved Tragedy Seeds;
- Disabilities or explicit None;
- Belief and unrestricted known-Deity selection for Theists.

Intrinsics currently supports:

- canonical Species → Ancestral Group → Lineage selection with sourced biological adjustments and grants; Humaniki is the playable Species family; Cherigili is visible but disabled within Humaniki, while Kriket and Stonefolk remain visible but disabled;
- exact-age generation once Species and Age Group are known;
- all three canonical Attribute methods: 3D high-two, pre-rolled A/B/C arrays, and 75-point Point Buy;
- recorded Attribute Rolls kept separate from later sourced and purchased changes;
- creation-only purchased Attribute increases with Skillpoint/Months accounting and novice caps;
- XLSX-normalized Trade and Specialization packages with candidacy testing and package provenance;
- age-capped starting Trade Rank and its starting Skillpoint benefit;
- Affinity selection from the highest recorded Critical Attribute Rolls and automatic ZED calculation;
- calculated Wealth Rank from Heritage, KNO DM, and applicable starting-economy adjustments.

Proficiencies currently supports:

- standard PML 1 plus advanced starting PML with Age-floor validation and cumulative creation-effect summaries;
- PML Virtuosity milestone choices;
- combined package-grant review with preserved provenance and inline per-capability specialization controls;
- Additional Skill purchases from the 296-entry Trait catalogue with source limits, IM pricing, surcharges, and live Skillpoint accounting;
- Age/PML/Trade Rank/Disability Skillpoint sources with Attribute/ZED creation purchases deducted from the same pool;
- free regional and Heritage Languages plus separate INT-DM Language proficiency spending across the 17-language conlang catalogue.

Properties currently supports:

- canonical Stature and Build derivation from Species, Lineage, Age Group, Heritage, Trade/Specialization, Attribute DMs, and Brawn;
- optional Underweight/Overweight Build adjustment with the pre-Overweight Bodypoints rule;
- exact 0–99 Height/Weight/SIZ lookup table and Profile derivation;
- allometric Carrying and Jump scaling by Species size;
- Walk/Jog/Run and MOV; Lob/Pitch/Hurl Method Indexes; Lift/Shoulder/Carry; Upward/Broad/Downward jumps;
- Hitpoints, Bodypoints, Recovery, Endurance, Resilience, Resistance, Favor, Manapool, Cellburn, Max Advantage, Gasp/Sleep limits, and compact CRS compatibility combat values;
- visible calculation notes and conditional Trait adjustments without storing per-item throwing OR.

Utilities currently supports:

- searchable selection from the 84-entry Spell catalogue, with Spell Level/AP/mana details and explicit review state;
- searchable Weapons, Armor, and Equipment catalogues with quantities, prices, recorded Weight, Personal Wealth comparison, and retained over-budget warnings;
- selection from only the 96 complete Magic Item records approved for runtime use, with label-only search, interchangeable form-factor families, canonical rarity multipliers, and total equivalent value;
- editable common/proper names generated from the 17 incorporated conlang D66 name-generator datasets;
- Relationships shown as deliberately deferred and non-blocking.

The Forge does not invent a starting-Spell allotment or Magic Item entitlement where the current normalized data does not establish one. Those selections remain explicit review/GM decisions until a canonical machine-readable rule is available.


Finalization and library now supports:

- whole-character validation across every canonical creation step, with warnings separated from blocking errors;
- deterministic projection of the active structured draft into the finished Character Record Sheet;
- a browser-local multi-character library with autosave and active-character switching;
- automatic promotion of the legacy single-draft v105 local-storage record into the v106 library;
- New, Duplicate, Delete, reopen/edit, and live Sheet workflows;
- portable JSON import/export of full structured character drafts;
- print / Save PDF from the live finished sheet;
- catalogue-integrity checks for imported Spells, Languages, inventory, and complete-data Magic Items.

Humaniki is currently the only selectable Species family. Its Human, Drauf, Alef, Klenari, Babbita, and Gnoan Groups are selectable. Cherigili remains visible under Humaniki but disabled; Kriket and Stonefolk also remain visible but disabled. Incomplete magic-item records remain in source data but are not offered by the runtime catalogue.

## v110 — Starting Region, Settlement, and Heritage context

v110 makes **Assign Starting Region & Settlement** a rules-bearing origin choice rather than a stand-alone label.

- Added the detailed **Corom Region / Eastlands** locale from `META/locale.citystate-crolm.pdf`: Citystate Corom plus 25 nearby settlements, totaling **536,300** population.
- Preserved the English settlement labels as table-play glosses while exposing working native forms such as Fanur (Slowriver), Gromor (North Hold), Joro (Jorway), and Joromor (Jorfort).
- Records the current Marli/Heiron divine spheres and historical Crolm (Ended) context without restricting Belief & Worship.
- **Heritage now requires a selected Starting Region & Settlement.** Environs Heritage is restricted to terrain present at the selected settlement. Culture and Society remain choices, with local recommendations highlighted rather than forced.
- Location now also informs default/Heritage language suggestions, contextual Broad Trait Region/Settlement specialization, character-sheet identity, random starting-settlement generation, and existing citystate economy-dependent Wealth/physical adjustments where source data supports them.
- Detailed Corom settlement randomization is population-weighted. Legacy regions preserve their earlier catalogue weighting.
- No `CharacterDraft` schema change is required; existing saved Corom IDs remain compatible.

## v107–v109 QA and repository-structure corrections

v107 incorporates the post-v106 Forge QA correction specification: sticky Forge header, persistent accordions, section-level Generate controls, restored canonical Demographics, canonical Species/Group/Lineage taxonomy, age-adjusted Heritage grants using canon maturity asterisks, required-Disability tracking/generation, live grant-overlap displays, inline Broad Skill specialization controls, Assets/Personal Wealth display, v-Magic Spell gating, remaining/original gear wealth, Magic Item form/rarity/value handling, and the expanded live Character panel.

Workbook `authorCalibration.stars` remain author package-balance metadata. Character maturity uses separate `maturityStars` transcribed from the canonical Heritage tables and never reuses author-calibration Stars.

v108 makes Cherigili visible but non-selectable for player-character creation. v109 is a repository-structure release: canon-sync and LLM/development meta documents live under `META/`, all executable/validation scripts live under `scripts/`, and `npm run local` is the cross-platform launcher. No DXD rules behavior changes in v109.

## Run the app

Requirements: a current Node.js LTS release and npm.

Cross-platform:

```bash
npm run local
```

Platform-specific launchers are retained under `scripts/`:

```bash
bash scripts/run-local.sh
```

```bat
scripts\run-local.cmd
```

Or manually:

```bash
npm ci
npm run dev
```

Then open the localhost URL printed by Next.js.

## Verify a release

```bash
npm run validate:data
npm run typecheck
npm run build
```

Or run all three:

```bash
npm run check
```

## Architecture

- `src/data/` — static DXD catalogues and creation-flow metadata.
- `src/data/heritagePackages.json` — normalized XLSX Heritage packages and explicit Trait grants.
- `src/data/languages.json` and `src/data/name-generators/` — retained conlang source/name-generator material.
- `src/data/nameGenerators.json` — structured runtime form of all 17 incorporated D66 name generators.
- `src/lib/character-draft.ts` — structured builder state with provenance and schema migration.
- `src/lib/rules/background.ts` — pure Background validation and Heritage projection logic.
- `src/lib/rules/intrinsics.ts` — Species/Lineage, Attributes, Trade, ZED, Wealth, and Intrinsics validation.
- `src/lib/rules/proficiencies.ts` — PML, granted Trait consolidation, Skillpoint economy, purchased Skills, and Languages.
- `src/lib/rules/properties.ts` — physical derivation and calculated performance/capability rules.
- `src/lib/rules/utilities.ts` — Personal Wealth/gear accounting, utility selections, name generation, and Utilities validation.
- `src/lib/character-library.ts` — versioned browser-local multi-character library, legacy promotion, duplication, delete, and JSON import/export.
- `src/lib/character-sheet-projection.ts` — deterministic `CharacterDraft` → CRS presentation projection.
- `src/lib/rules/finalization.ts` — whole-character validation and imported-catalogue integrity checks.
- `src/app/character-app.tsx` — client application shell coordinating Forge, live Sheet, Library, Sample, Tests, and Info.
- `src/app/character-library-panel.tsx` — local character management and finalization status UI.
- `src/app/forge/background-step.tsx` — functional Background controls.
- `src/app/forge/intrinsics-step.tsx` — functional Intrinsics controls.
- `src/app/forge/proficiencies-step.tsx` — functional Proficiencies controls.
- `src/app/forge/properties-step.tsx` — functional Properties controls and calculation breakdowns.
- `src/app/forge/utilities-step.tsx` — Spells, Starting Gear, Magic Items, Name, and deferred Relationships controls.
- `src/app/worksheet.tsx` — Character Forge workflow shell and live summary.
- `src/app/character-sheet.tsx` — presentation-oriented sheet view.
- `META/` — canon-sync history plus LLM/development architecture and implementation instructions.
- `scripts/` — local launchers and validation/maintenance scripts.
- `META/FINAL_PRODUCT_PLAN.md` — implementation roadmap and release definition.

Character creation state is not flattened into the presentation-only character sheet while the user is building a character.
