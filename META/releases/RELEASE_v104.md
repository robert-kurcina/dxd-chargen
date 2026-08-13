# DXD Character Forge v104 — Properties functional tranche

## Included

v104 completes the current **Assign Properties** tranche on top of the full v103 project.

### Assign Height and Weight

- canonical Species/Lineage/Age/Heritage/Trade/Specialization physical adjustments;
- STR DM contribution to Stature;
- FOR DM − REF DM and Brawn contribution to Build;
- optional Underweight/Overweight adjustment from −9 through +9;
- exact 100-row Height/Weight/SIZ lookup catalogue;
- pre-Overweight Bodypoints handling;
- Profile derivation;
- visible physical-source breakdown.

### Assign Calculations

- Hitpoints, Bodypoints, Recovery, Physicality;
- Endurance, Resilience, Resistance;
- Gasp and Sleep limits;
- Favor, Manapool, Cellburn, Max Advantage;
- Walk, Jog, Run/MOV and Agility reference;
- Lob, Pitch, Hurl Method Indexes;
- Lift, Shoulder, Carry and maximum-effort values;
- Upward, Broad, Downward and running-jump reference values;
- compact established CRS compatibility combat fields.

The UI deliberately exposes formula/source notes instead of hiding the calculations.

## Data additions

- `src/data/physicalScale.json` — 100 canonical rows, values 0–99.
- `src/data/heritageCharacteristicAdjustments.json` — the current Heritage/Economy Stature and Build rules.

## Architecture

- `src/lib/rules/properties.ts` owns deterministic physical/calculation rules.
- `src/app/forge/properties-step.tsx` renders the two Properties steps.
- `CharacterDraft` schema v5 retains typed physical state and migrates v4 drafts.
- `worksheet.tsx` synchronizes Properties after Background → Intrinsics → Proficiencies, so upstream changes recalculate immediately.

## Correctness fixes carried into this release

- ZED now actually uses the recorded Affinity Attribute Roll as the current Book III rule requires; Species/Lineage/Trade adjustments to that Attribute no longer silently change natural Affinity.
- Derived Run/MOV now retains direct Species, Lineage, Age, Trade, and Specialization MOV offsets from the existing Sophont adjustment tables.
- Tall/Sturdy physical effects are not guessed: if such a Trait is present without a structured numeric Stature/Build rule, the Height & Weight step reports a review warning.

## Scope decisions retained

- Kriket remains unavailable until canonical age brackets exist.
- Incomplete magic items remain hidden from runtime selection.
- Merchant remains deferred.
- Demographic fine detail including sex-specific physical adjustment remains deferred.
- Relationships remain deferred.
- Deity selection remains unrestricted.

## Running locally

macOS/Linux:

```bash
./run-local.sh
```

Windows:

```bat
run-local.cmd
```

The scripts run `npm ci` automatically if dependencies are not already installed, then start `npm run dev`.

## Validation in the generation environment

Passed:

- all 74 JSON files parse;
- 100 physical-scale rows validate in order;
- 10 Heritage characteristic rules validate;
- all prior Heritage, Language, Trade, Species, and complete-magic-item integrity checks pass;
- strict TypeScript checking passes for the dependency-free data/draft/rules layer;
- all 43 TS/TSX files pass TypeScript syntax/transpilation;
- local source imports resolve;
- v4 → v5 draft migration smoke test passes;
- Properties smoke test passes for physical derivation, Overweight Bodypoints behavior, runtime throwing invariant, and stale-state clearing;
- `git diff --check` passes.

Unavailable in this sandbox:

- a clean registry-backed `npm ci`, because requests to `registry.npmjs.org` fail with `EAI_AGAIN`;
- therefore full Next.js `npm run typecheck`/`npm run build` cannot be executed here against an installed dependency tree.

The failed install created only partial empty package directories; those are removed before release packaging. The archive retains `package.json`, synchronized `package-lock.json`, and launch scripts for a normal networked machine.
