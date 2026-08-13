# Release v102 — Assign Intrinsics

## Runnable archive contract

This release is a complete project tree, not an overlay patch.

Run with:

- macOS/Linux: `./run-local.sh`
- Windows: `run-local.cmd`
- manual: `npm ci && npm run dev`

The launch helpers install the exact `package-lock.json` dependency set when `node_modules` is absent.

## Functional tranche

The complete **Assign Intrinsics** phase now uses real CharacterDraft state and deterministic rules:

- **Sophont Species** — playable Species and Lineage selection, biological Attribute adjustments, biological Trait grants, and exact-age generation against species age brackets.
- **Attributes** — 3D high-two, pre-rolled Arrays A/B/C, and 75-point Point Buy for the nine recorded Attribute Rolls (CCA, RCA, REF, INT, KNO, PRE, POW, STR, FOR). MOV, SIZ, and ZED are not treated as rolled Attributes.
- **Post-array adjustment** — up to +2 purchased raw increases per Attribute and +4 total under the standard novice limit, with creation-only Skillpoint cost and prior-Month accounting. Recorded Attribute Rolls remain unchanged.
- **Trade and Specialization** — 11 complete playable Trade packages normalized from `sarna-len.characters(2).xlsx`, candidacy against pre-Trade Species/Lineage-adjusted Attributes, age requirements, Specialization package effects, and age-capped starting Trade Rank.
- **ZED** — Affinity determined from the highest recorded Attribute Roll among the Trade's Critical Attributes; ties are player-selectable. Later changes to the Affinity Attribute propagate to ZED. Direct package ZED adjustments and optional creation purchase are shown separately.
- **Wealth** — calculated from Culture + Environs + Society Heritage Wealth, final KNO DM, and applicable starting Citystate economy adjustments.

All Species, Lineage, Heritage, and Trade grants preserve provenance in `CharacterDraft.proficiencies.granted`.

## Intentional current-scope exclusions

- Kriket remains source data only until canonical age brackets exist.
- Merchant remains in `professions.json` but is not a selectable Trade until its current chargen candidacy/Affinity data is complete.
- Fine-grained Demographics and Relationships remain deferred by scope decision.
- Incomplete magic-item records remain source data but are excluded from the runtime selectable catalogue.
- MOV and SIZ are resolved in Assign Properties, not generated in Assign Attributes.

## Validation performed in the generation environment

- all JSON source files parse successfully;
- 36 Heritage packages validate;
- 17 language/name-generator sets validate;
- 11 complete Trade packages validate with unique Trade/Specialization names and legal Critical Attributes;
- every workbook-derived Trade grant resolves to an existing Trait family;
- runtime Intrinsics smoke test passes for Species/Lineage projection, Trade grants, automatic Affinity, ZED propagation, Wealth, and candidacy evaluation;
- TypeScript transpilation/syntax validation passes across all TS/TSX source/config files;
- no intrinsic-rules TypeScript diagnostics appear before external dependency resolution failures in the sandbox check;
- `git diff --check` and ZIP integrity are release gates.

A full `npm ci`, Next.js typecheck, and production build cannot run inside the generation sandbox because the npm registry package `util-deprecate` is not cached and registry DNS/network access is unavailable. The lockfile is internally version-synchronized and the included launch scripts perform the normal locked install on a networked machine.
