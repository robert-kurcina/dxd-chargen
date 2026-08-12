# DXD Character Forge v105 — Utilities functional tranche

## Included

v105 completes the current in-scope **Assign Utilities** tranche on top of the full v104 project.

### Assign Spells

- searchable 84-entry Spell catalogue;
- Spell Level, AP cost, mana cost, and description visible at selection time;
- reversible add/remove selection;
- current `v-Magic` state surfaced;
- explicit review state so the app does not invent a missing starting-Spell allotment rule.

### Assign Starting Gear

- searchable Weapons, Armor, and Equipment catalogues;
- quantity controls and reversible removal;
- live gp cost, recorded Weight, and item count;
- Personal Wealth comparison from the existing Wealth Rank;
- over-budget selections are retained as warnings for an explicit GM grant, Asset, or other source rather than silently discarded;
- throwable items continue to store only ordinary Weight: Lob/Pitch/Hurl OR is calculated at throw time and is not stored per item.

### Assign Magic Items

- runtime catalogue remains restricted to the 96 complete records from the 144-record source catalogue;
- search and grade filters;
- reversible selection with form, grade, and description visible;
- no Magic Item entitlement or pricing rule is invented from incomplete data; the step uses explicit review state.

### Assign Name

- all 17 incorporated conlang name generators now have a structured runtime representation in `src/data/nameGenerators.json`;
- the original Markdown generator source remains in `src/data/name-generators/`;
- default naming-language suggestion follows the character's primary Language, then Heritage Language where available;
- D66 generation supports the standard Begin/Middle/Suffix families and the distinct Borensk Votive Prefix/Initial/Kernel/Ending construction;
- generated names remain editable and do not replace player choice.

### Relationships

Relationships remain deliberately deferred and non-blocking. v105 does not invent a replacement mechanics model.

## Architecture

- `src/lib/rules/utilities.ts` owns deterministic utility state/accounting and structured name generation.
- `src/app/forge/utilities-step.tsx` renders all five canonical Utilities steps, with Relationships explicitly deferred.
- `CharacterDraft` schema v6 adds typed inventory quantities/prices/Weight, review states, and naming-language/style state.
- v1–v5 drafts migrate forward into v6.
- `worksheet.tsx` synchronizes Utilities after Background → Intrinsics → Proficiencies → Properties.

## Scope decisions retained

- Kriket remains unavailable until canonical age brackets exist.
- incomplete Magic Items remain hidden from runtime selection;
- Merchant remains deferred;
- demographic fine detail remains deferred;
- Relationships remain deferred;
- Deity selection remains unrestricted;
- no per-item throwing OR is stored;
- no starting-Spell allotment or Magic Item entitlement is guessed where the current normalized rule data is silent.

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

Passed before packaging:

- all 75 JSON files parse;
- all 17 structured D66 name generators validate against the 17-language catalogue;
- all prior Heritage, Language, Trade, Species, physical-scale, and complete-Magic-Item integrity checks pass;
- strict TypeScript checking passes for the dependency-free data/draft/rules layer;
- all 45 TS/TSX files pass TypeScript syntax/transpilation;
- Utilities rule smoke tests pass for Wealth/gear totals, Spell and Magic Item selection, all 17 name generators, draft migration, deferred Relationships, and the no-per-item-throw-OR invariant.

The registry-backed install/build result is recorded in `docs/RELEASE_v105_VALIDATION.json` after the final release gate.

Unavailable in this sandbox:

- a clean registry-backed `npm ci`, because package tarball requests to `registry.npmjs.org` fail with `EAI_AGAIN`;
- therefore full dependency-backed `npm run typecheck` and `npm run build` cannot be executed here.

The partial `node_modules` tree created by the failed install is removed before release packaging. The archive retains the synchronized `package.json`, `package-lock.json`, and launch scripts for a normal networked machine.

Fresh-extraction release validation also passed data validation, local-import resolution, TypeScript syntax/transpilation, strict core rules typechecking, Utilities runtime smoke tests, `git diff --check`, launch-script executable mode, and ZIP integrity.
