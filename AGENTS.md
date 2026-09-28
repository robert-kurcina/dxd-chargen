<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository responsibilities

`dxd-chargen` owns the Web client and its backend service, including API routes, authentication, authorization, persistence, migrations, tests, deployment, and application-specific plans under `META/guidance/`.

`meta-dxd` owns shared DXD/Sarna Len guidance and cross-repository coordination. Read its [shared guidance](../meta-dxd/guidance/DXD_SARNA_LEN.md) and [coordination policy](../meta-dxd/coordination/REPOSITORIES.md) when work affects shared rules, terminology, source interpretation, or multiple repositories. Sibling links assume both repositories are checked out beside each other; if unavailable, identify the missing guidance before making shared-rule decisions.

Keep application implementation and execution status here. Record shared decisions in `meta-dxd` and link to them instead of maintaining competing copies. Application canon-sync records and release evidence remain here as provenance; they do not independently establish new game canon.
