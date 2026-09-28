# Project metadata

This directory contains non-runtime information intended for maintainers and LLM-assisted development.

Its scope is the Web client and backend service in `dxd-chargen`. Shared DXD/Sarna Len guidance and cross-repository coordination belong in [meta-dxd](../../meta-dxd/README.md); application-specific plans, canon-sync history, and release evidence remain here.

- `guidance/` contains active architecture, implementation plans, and canon-sync history.
- `releases/` contains release notes, data-integrity records, machine-readable validation results, and audit/parity ledgers.
- `retired_llm_guidance/` preserves obsolete or historical LLM prompts/instructions for provenance only; nothing there is authoritative or runtime input.

Player and world data belongs under `data/`; application catalogues compiled into the client remain under `src/data/`.
