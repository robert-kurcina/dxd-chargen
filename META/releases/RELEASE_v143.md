# v143 — Admin Tests / Info second compatibility pass

v143 completes the compatibility restoration begun in v142. The v141 deterministic diagnostics and current-runtime Info model remain authoritative; this release restores additional pre-v141 developer/reference behavior that was still present only as unreachable source or omitted during the first restoration.

## Tests / Developer Tools

- The Developer Tools suite now mounts 25 sections rather than the 9 sections exposed by v142.
- Restored/re-exposed sections include Candidacy Simulation, Salary Calculation, Number Suffix Formatting, ND6, Attribute Array Generation, Simple Data Tables, Dice Roller, `isDisability`, Talent Parser, Age Rank/Group converters, Maturity parser/difference/adjustment tools, and Skillpoint cost calculations.
- Existing Military Unit Generator, Salary/Contractor planner, Heritage generator, Profession & Title generator, Settlement generator, Age generator, D66 tools, Scalar/Index calculator, and Tragedy Seed generator remain available.
- Adds searchable contextual navigation across all Developer Tools.
- Candidacy Expression and Simulation utilities now use a deterministic 50,000-character sample with the current Forge 3D-high-two Attribute method and current selectable `tradePackages`; Merchant remains deferred/excluded.
- Attribute Array Generation now uses current 3D-high-two rolls rather than legacy 2D6.
- The Academic Rank 1 salary snapshot is corrected to the current salary data: WR -10, 1 sp/day, 30 sp/month.

## Info / Legacy Reference Explorer

- Adds searchable contextual navigation across all 30 restored legacy/reference sections.
- The current seven-phase runtime Info, diagnostics, and Active/Bridge/Reference registry remain above the explorer and remain authoritative.
- Legacy Heritage Wealth Clamp values are retained only as explicitly labeled legacy annotations and are identified as not used by current Forge.
- The Empires reference-table first column is corrected from the misleading `D6` label to `ID`.

## Data policy

No `src/data` records are changed by v143. Existing runtime semantic diagnostics such as Baminati/Baminat remain visible rather than being silently corrected by a compatibility/UI release.
