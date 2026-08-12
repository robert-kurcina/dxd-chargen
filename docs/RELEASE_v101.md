# Release v101

## Runnable archive contract

Every archive from this release forward is a complete project tree, not an overlay patch.

Run with:

- macOS/Linux: `./run-local.sh`
- Windows: `run-local.cmd`
- manual: `npm ci && npm run dev`

The launch helpers install the exact `package-lock.json` dependency set if `node_modules` is absent.

## Validation performed in the generation environment

- `npm install --package-lock-only --ignore-scripts` — passed; package manifest and lockfile agree.
- `npm run validate:data` — passed across all 70 JSON source files and v100 data-integrity constraints.
- core TypeScript strict check for `src/data/index.ts`, `catalog-policy.ts`, `character-draft.ts`, and `rules/background.ts` — passed.
- TypeScript transpilation/syntax check across all 37 remaining TS/TSX files — passed with zero syntax diagnostics.
- local-import resolution scan — passed with zero missing project imports.
- `git diff --check` — passed.

A full dependency install and Next production build could not be executed inside the generation sandbox because its container DNS cannot resolve `registry.npmjs.org`. This is an environment network limitation rather than a package-lock mismatch; the archive uses ordinary npm packages and the lockfile has been regenerated after removing the unused Firebase/Genkit starter dependency tree.
