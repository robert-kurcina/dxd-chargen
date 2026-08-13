# Release v103 — Assign Proficiencies

## Runnable archive contract

This release is a complete project tree, not an overlay patch.

Run with:

- macOS/Linux: `./run-local.sh`
- Windows: `run-local.cmd`
- manual: `npm ci && npm run dev`

The launch helpers install the exact `package-lock.json` dependency set when `node_modules` is absent.

## Functional tranche

The complete **Assign Proficiencies** phase now uses real CharacterDraft state and deterministic rules:

- **PML** — defaults ordinary PCs to PML 1, enforces/display Age floors, shows cumulative PML creation effects, and records advanced-PML warnings rather than inventing mutation choices.
- **Skills, Abilities, and Talents** — reviews package-granted Traits, combines duplicates for display while retaining all sources, resolves contextual Broad Skill placeholders, and records PML Virtuosity milestone choices.
- **Additional Skills** — searchable Skill catalogue, starting levels 1–5, Broad Skill specialization entry, live source-based starting limits, IM pricing, current level-4/5 surcharge rules, and a live creation Skillpoint budget.
- **Skillpoint budget** — Age Skillpoints plus PML, Trade Rank, and Disability sources; previously purchased Attribute and ZED increases are charged against the same pool.
- **Languages** — free regional default and Heritage languages, automatic suggestions for the six explicitly mapped Citystates, separate Language proficiency spending, accent removal, additional Language acquisition, and live formatted language records.

`CharacterDraft` schema is now version 4. Migrations preserve prior v101/v102 drafts, and PML milestone choices above a temporarily lowered PML are retained dormant so raising PML again restores the player's prior choice rather than silently discarding it.

## Intentional current-scope exclusions

- Advanced Secondary Mutation and PML-linked psychological Disability selection remains deferred; PML values requiring them are warned rather than blocked.
- Kriket remains source data only until canonical age brackets exist.
- Merchant remains deferred as a playable Trade.
- Relationships and fine Demographics remain deferred by scope decision.
- Incomplete magic-item records remain source data only.

## Validation performed in the generation environment

- all static JSON parses and the v103 data validator passes;
- Heritage, Trade, language/name-generator, default-language, playable-species, and complete-magic-item policies validate;
- TypeScript transpilation/syntax validation passes across the source tree;
- the dependency-free rules subset typechecks under strict TypeScript;
- Proficiencies smoke tests cover PML defaults/Age floors, Skillpoint economy, preservation of dormant PML choices, and Language proficiency accounting;
- local TypeScript imports resolve;
- `git diff --check` and ZIP integrity are release gates.

A full network-dependent `npm ci` was attempted during packaging but registry-backed dependency installation could not complete in the generation sandbox. The partial `node_modules` tree was removed before packaging. `package-lock.json` and the launch scripts remain the installation authority; on a normal networked machine the launch script performs `npm ci` before starting Next.js.
