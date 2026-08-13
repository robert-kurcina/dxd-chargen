# DXD Character Forge v110 — Origin-Aware Heritage

v110 promotes **Assign Starting Region & Settlement** into a required origin context for Heritage and other later character-creation systems.

## Corom Region

The first detailed locale is the **Corom Region / Eastlands**:

- 26 selectable starting settlements;
- 536,300 combined population;
- Citystate Corom plus the surrounding towns, holds, forts, castels, and cities from the supplied locale map;
- working native-language settlement forms with the English map labels retained as playability glosses;
- Marli/Heiron current divine-sphere context and Crolm (Ended) historical context;
- settlement-local Environs and language/toponym layers.

## Character-creation behavior

- Heritage cannot complete or auto-generate until Starting Region & Settlement is assigned.
- Environs Heritage is restricted to the selected settlement's supported Environs.
- Culture and Society remain unrestricted choices but show local recommendations.
- Location changes clear stale incompatible Environs and stale default-language selections.
- Default-language suggestion, Heritage-language context, contextual Region/Settlement specialization, live/finished identity, and starting-settlement generation now consume the location model.
- Belief & Worship shows local deity context without restricting the known-Deity catalogue.

## Random generation

Detailed locales use population-derived origin weighting. Legacy regions keep their previous weighted settlement lists.

## Compatibility

No CharacterDraft schema migration is required from v109.
