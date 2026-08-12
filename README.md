# DXD Character Generator

Web character generator for the Sarna Len roleplaying game and DXD rules system.

## Current state — v99 UX foundation

The application now opens on **Forge**, which follows the canonical five-phase DXD character-creation sequence. The Forge provides reversible navigation, persistent browser-local draft state, progress-state prototyping, and a live draft summary.

The individual creation-rule forms are not all implemented yet. They are intentionally marked as pending rather than represented as functional controls.

The existing Sheet, Sample, Tests, and Info views remain available.

## Architecture

- `src/data/` — static DXD catalogues and creation-flow metadata.
- `src/lib/character-draft.ts` — structured builder state with provenance.
- `src/lib/character-logic.ts` — existing rule/calculation utilities; future rule modules should move toward focused pure functions.
- `src/app/worksheet.tsx` — Character Forge workflow shell.
- `src/app/character-sheet.tsx` — presentation-oriented sheet view.
- `docs/FINAL_PRODUCT_PLAN.md` — implementation roadmap and release definition.

Character creation state must not be flattened into the presentation-only character sheet while the user is building a character.

## Development

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

The project is based on Next.js and originated as a Firebase Studio starter.
