# Canon Sync v110 — Starting Region & Settlement / Heritage Integration

v110 changes runtime character-creation behavior so the character's origin is a rules-bearing input to later Background choices.

## Source incorporated

`data/maps/locale.citystate-crolm.pdf` is retained as the provenance copy of the supplied Corom-area working map.

Author clarifications applied:

- Corom Region population is **536,300**: Citystate Corom (400,000) plus the 25 named surrounding settlements (136,300).
- **Crolm** was the native deity of Citystate Corom during its early years and is now Ended.
- The present local divine coverage is **Marli** and **Heiron**.
- English settlement names such as *Slowriver*, *North Hold*, and *Jorway* are playability glosses rather than mandatory native-language forms.
- Belief & Worship remains unrestricted; deity geography supplies setting context, not a character-creation prohibition.

## Location model

`src/data/settlementProfiles.json` provides 26 detailed Corom Region origins. Each profile records:

- political region and geographic region;
- native/current working display name and English gloss;
- population and settlement class;
- current local deity sphere;
- valid local Environs Heritage;
- advisory Culture and Society recommendations;
- default language, historically plausible Heritage-language suggestions, and toponym/language layers;
- origin weight and naming-status provenance.

`src/data/localeProfiles.json` records the locale-level 536.3K population and historical/current deity context.

`src/lib/settlement-context.ts` is the shared resolver used by Background, Proficiencies, Intrinsics, output projection, random generation, and tests.

## Heritage dependency

**Assign Starting Region & Settlement must be completed before Assign Heritage.**

- Environs Heritage is location-bound: only Environs listed for the selected settlement are selectable.
- Culture and Society remain player choices. Locally plausible packages are highlighted as recommendations but are not restrictions.
- Changing region/settlement clears an incompatible Environs selection and the stale default regional language, then normal draft synchronization applies the new location context.
- Random Heritage generation respects the selected settlement's Environs and prefers its Culture/Society recommendations.

## Other downstream consumers

- Default Language uses the detailed settlement profile before the legacy six-Citystate mapping.
- Heritage Language remains unrestricted but displays local historical-language suggestions.
- Broad Trait/Skill placeholder `Region` now resolves the geographic region (for example **Eastlands**) rather than the political empire name; `Settlement` resolves the selected native settlement form.
- Finished/live character identity includes geographic region, political region, and settlement.
- Detailed-locale random starting settlement selection uses population-derived origin weights. Regions without detailed profiles retain legacy weighted settlement behavior.
- Existing citystate economy adjustments for Wealth and physical Heritage calculations remain source-driven; no unsupported economic status was invented for minor settlements.
- Belief & Worship displays current and historical deity context for the selected origin while preserving unrestricted deity choice.

## Compatibility

No `CharacterDraft` field was added or removed. Existing `settlement-djorkan-corom` records remain valid, so v109 browser-local characters require no schema migration.
