# DXD Character Generator

Web character generator for the Sarna Len roleplaying game and DXD rules system.

## Current state — v135

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

- canonical Stature and Build derivation from Species, Lineage, Age Group, Heritage, Trade/Specialization, FOR DM, and Brawn;
- optional Underweight/Overweight Build adjustment with the pre-Overweight Bodypoints rule;
- exact 0–99 Height/Weight/SIZ lookup table and Profile derivation;
- allometric Carrying and Jump scaling by Species size;
- Walk/Jog/Run and MOV; Lob/Pitch/Hurl Method Indexes; Lift/Shoulder/Carry; Upward/Broad/Downward jumps;
- Hitpoints, Bodypoints, Recovery, Endurance, Resilience, Resistance, Favor, Manapool, Cellburn, Max Advantage, Gasp/Sleep limits, and compact CRS compatibility combat values;
- visible calculation notes and conditional Trait adjustments without storing per-item throwing OR.

Utilities currently supports:

- searchable selection from the 84-entry Spell catalogue, with Spell Level/AP/mana details and explicit review state;
- searchable Weapons and Equipment catalogues plus a structured Personal Armor editor with canonical Armor Set quick-picks, one-each Helm/Shield/Gear slots, sectional component customization, SIZ scaling, and calculated protection/Weight/Cost;
- selection from complete Magic Item records approved for runtime use, with X fixed at 1 for structured selections, canonical physical-form normalization where the item catalog supports it, optional presentation-only instance text, canonical rarity multipliers, and total equivalent value;
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




## v135 — Admin Characters sticky-header UX

- Administration chrome is compacted: the page title is no longer part of the sticky layer, while the four Admin tabs remain available in a 44px sticky navigation bar.
- **Characters Library - Admin** uses a compact action banner without the redundant explanatory paragraph.
- The desktop character header/filter region is a viewport-sticky CSS Grid rather than a sticky `<thead>` inside an overflow container. This preserves header/record alignment and prevents the first character from being covered.
- Desktop character records use the same dynamic grid tracks as their headers, including optional Columns-editor fields.
- Mobile Library controls are driven by the checked Columns set. The active mobile column defaults to the first checked column (normally **Portrait**) and falls back to the next checked column if that column is hidden.
- **Search character names** appears only when **Character Name** is the active mobile column; **Timestamp** is no longer a hard-coded mobile default.
- Default Library ordering is Character Name ascending. The Library sort-storage key is advanced so stale Timestamp defaults from v134 do not survive the UX correction.


## v134 — Route-based UI, Admin character operations, Library columns

- Forge, Sheet, and Library are separate Next/React routes under a shared workspace layout. Admin Global, Characters, Tests, and Info are separate routes as well. Route loading boundaries display a spinner while tab content and its client bundle become available.
- Admin opens on **Global**. The Seed number defaults to `0`, remains disabled until **Change Seed Number** is checked, requires confirmation before Save, and locks again after a successful update. **Revery** discards an unsaved seed edit.
- Global Library tags use the same protected edit model. Read-only tags render as alphanumerically sorted spans with filesystem-character counts; edit mode uses a token field and confirmation before the vocabulary is saved.
- Library defaults to the **Portrait**, **Character Name**, and **Tags** columns. **Columns** can also expose **Ancestry**, **Profession**, **Timestamp**, and **Filename**. Tags have their own column, sorting, and filtering.
- **Characters Library - Admin** adds per-record selection, protected token-field tag editing, batch tag persistence, and selected-character PDF export. The batch PDF contains each selected character's front and back CRS pages ordered alphanumerically by character name.
- Sheet Back Movement and Carrying chart values are aligned 10px to the right within the existing fixed CSS Grid.


## v133 — Administration, Library metadata, Sheet editing

- Main navigation is reduced to **Forge / Sheet / Library**. Developer **Tests** and reference **Info** now live under accordion sections on `/admin`.
- `/admin` centralizes cross-character configuration. The first implemented controls are a deterministic Forge randomization seed/sequence and the vocabulary of tags exposed by the Character Library; future supported global constraints have a dedicated accordion category rather than being scattered through Forge.
- Administrator-defined Library tags can be assigned to the active character in Forge, persist in `CharacterDraft.utilities.libraryTags`, display as Library badges, and filter the Library.
- Library Trade/Profession rendering now falls back to the persisted specialization identifier when the normalized Trade package lacks an exact specialization record. This preserves imported `Wizard / Witch` and `Cleric / Cloister` labels without inventing missing package mechanics.
- **Save** now requires an explicit modal **Approve / Cancel** decision.
- Sheet Back Notes remain mechanically inert, but Notes lines that correspond to a Weapon, Armor, or Equipment catalogue record gain a smaller, lighter catalogue-property subline for reference. Backstory text is not treated as inventory.
- The bottom universal chart uses fixed CSS Grid tracks instead of accumulated `margin-right` spacing, so editing one cell/track does not shift adjacent columns.
- Forge Generate/Roll paths, including Tragedy Seed resolution, consume the administrator seed sequence. Developer Tests retain their independent random behavior.


## v132 — Runtime Character Normalization

- Completed imported characters preserve their established Trade gear instead of receiving the canonical starting package again when a legacy `startingGearTrade` marker is absent.
- Worn Armor legality is enforced during browser/local-library synchronization as well as server-side storage normalization.
- Character-sheet history, rendered equipment rows, and Burden calculations defensively use only the legal worn Armor configuration.
- Armor Sets remain alternate abstractions of the Suit slot and cannot coexist with Sectional Armor. One Helm, Shield, and Gear layer remain the maximum; sectional/helm overlap is limited to the explicit Elbow/Knee exception.
- Persisted imported characters carry their established Trade marker and `gearReviewed=true`, so loading them does not reconstruct a second baseline gear package.


## v123 — Structured Personal Armor Editor

v123 separates Personal Armor into Suit (Armor Set), Helm, Shield, Gear, and Sectional Armor instead of presenting all armor as one flat catalogue. The seven canonical Armor Sets remain quick-picks. Helm, Shield, and one Gear layer are selected independently. A selected set can be converted to component mode, after which sectional components become authoritative and the Forge recalculates Suit coverage, Deflect, Armor Rating, Weight, Cost, and Traits. All Personal Armor uses the established SIZ-fitted Armor scaling. Mail and Flex remain presentations of the existing `[Mail X]` and `[Flex X]` traits; high-technology/proofing keywords are deferred. Character-archive normalization is intentionally deferred until this editor has been iterated further.

## v122 — Stature/Build Reconciliation

v122 removes STR DM from Stature and REF DM from Build. Build retains FOR DM and Brawn X. Genetically Female Stature/Build adjustments now apply only at Adult Age Group or older, matching the printed creation procedure. Legacy `Eary Teen` imports normalize to `Early Teen`; source provenance remains unchanged. Giovanna Manroad now reconciles to Stature 21 / Build 29 with Tall +1, Gracile -2, and no Underweight/Overweight adjustment.

## v121 — Physical Equipment Scaling Refinement

v121 refines the page-192 fitted-equipment model. Weapons use Weight Index `-4/-2/0/+2/+4` at SIZ 6/9/12/15/18 with symmetric OR `+2/+1/0/-1/-2`, Damage `-2/-1/0/+1/+2`, and minSTR `-4/-2/0/+2/+4`. Armor and fitted/worn Equipment use surface-area-like Weight scaling `-4/-2/0/+2/+4`; Armor retains its canonical AR and Deflect because protective material thickness is unchanged. Armor TCA follows the Weight Index adjustment one-for-one. Sheet Back values are regenerated from these fitted values. Character Record Sheet numeric fields are rendered without native browser spinner controls.

## v119 — Carried Weight and Shoulder Burden

v119 fills the printed reverse-sheet **Total** and **Burden** boxes using the canonical carrying rules. Total is the floor-integer pound sum of structured carried Weapons, Equipment, non-helmet Armor, the lightest owned Armor Set, and non-Jewelry/non-Gemstone Magic Item physical forms. Notes, ordinary ammunition, Jewelry, Gemstones, and Helmets do not contribute. Burden converts Total pounds to the floor R10 Weight Index, compares that Index against Basic Shoulder after Allometric Scaling and Brawn X, and prints `0` when within Shoulder or the negative excess Index when burdened.


## v116 — Jewelry, gemstones, physical forms, and historical Gold

v116 adds the economical Jewelry form catalog, ordinary gemstone grades, Ornate X/TCA handling, Magic Item form-weight completion with a 0.01 lb fallback for otherwise unsupported tiny forms, the generic `Armor X` Magic Item family, ammunition purchase-to-Notes behavior using current available Gold, and normalized Magazine/Pouch identities. Jewelry and Gemstones support presentation-only `customAppend`. Imported recorded Gold is retained as authoritative available gp rather than reconstructed from inventory or Wealth Rank.

## v115 — Instance text for Magic Items and written works

v115 adds an optional `customAppend` to assigned Magic Items and to Tome, Codex, and Scroll equipment. The append is presentation-only: `Skill Tome` with append `Cook` displays as `Skill Tome (Cook)` without changing catalog identity, weight, price, X, or mechanics. Append-capable books/scrolls may be assigned as separate instances so different subjects can coexist. Legacy `Cookbook` now imports as canonical `Skill Tome` with `customAppend: "Cook"`. Mechanically customized items, including structured Magic Items above X=1, remain Notes-only.

## v114 — Catalog cleanup and Magic Item physical forms

v114 removes source Wingding prefixes from canonical item names, generalizes quantity-first catalog presentation, keeps ordinary ammunition as unstructured Notes, and normalizes supported Magic Item physical forms to actual item-catalog records for weight. `Banweapon X` remains the canonical page-561 catalog name and, like `Vorpal Weapon X`, can select any eligible catalog weapon form except natural/improvised feet, claws, talons, boots, gauntlets, and comparable non-object attack forms. Structured Magic Items are X=1 only; GM-granted X=2+ instances are Notes.

Historical character cleanup keeps Illian's upgraded Magewand, John's Vorpal Sword, Khao's Bansword-2, Sir Mandolore's Banhammer-2, and Periwinkle's future Bracelet Armor as Notes-only custom possessions.

## v110 — Starting Region, Settlement, and Heritage context

v110 makes **Assign Starting Region & Settlement** a rules-bearing origin choice rather than a stand-alone label.

- Added the detailed **Corom Region / Eastlands** locale from `data/maps/locale.citystate-crolm.pdf`: Citystate Corom plus 25 nearby settlements, totaling **536,300** population.
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
- `src/app/(workspace)/` — route-backed Forge, Sheet, and Library pages sharing persistent client workspace state through a common layout/provider.
- `src/app/character-library-panel.tsx` — shared filesystem Character Library/Admin Library with column selection, sorting/filtering, tag editing, selection, and batch PDF export.
- `src/app/admin/` — route-backed Global, Characters, Tests, and Info administration pages.
- `src/lib/admin-settings.ts` — browser-persistent cross-character seed/sequence and Library-tag configuration.
- `src/app/forge/background-step.tsx` — functional Background controls.
- `src/app/forge/intrinsics-step.tsx` — functional Intrinsics controls.
- `src/app/forge/proficiencies-step.tsx` — functional Proficiencies controls.
- `src/app/forge/properties-step.tsx` — functional Properties controls and calculation breakdowns.
- `src/app/forge/utilities-step.tsx` — Spells, Starting Gear, Magic Items, Name, and deferred Relationships controls.
- `src/app/worksheet.tsx` — Character Forge workflow shell and live summary.
- `src/app/character-sheet.tsx` — presentation-oriented sheet view.
- `META/guidance/` — canon-sync history plus LLM/development architecture and implementation instructions.
- `META/releases/` — release notes, data-integrity records, and validation reports.
- `data/` — filesystem character records and shared provenance/runtime assets.
- `scripts/` — local launchers and validation/maintenance scripts.
- `META/guidance/FINAL_PRODUCT_PLAN.md` — implementation roadmap and release definition.

Character creation state is not flattened into the presentation-only character sheet while the user is building a character.
