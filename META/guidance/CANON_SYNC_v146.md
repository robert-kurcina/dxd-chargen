# Canon Sync v146 — Interdisciplinary Skill groups

Source of truth: `vault-sarnalen/book-rewrite`, decision dated 2026-08-23.

## Canonical groups

| Group | Principal access | Elective roster |
| --- | --- | --- |
| §Academics | Academic, Wizard; Cleric > Physician | Alchemy, Design, Engineer, Medic, Science |
| §Letters | Townsfolk, Cityfolk, Landed; Services culture; Academic | Artist, History, Investigate, Language, Lore, Maths, Peerage, Politics, Read, Reasoning |
| §Doctrine | Cleric; Knight > Templar | Deity, Teach, Discipline, Reasoning, Leadership, Persuade |
| §Warfare | Warrior, Knight; Ranger > Scout; Mariner > Privateer; Cleric > Guardian | Drill, Engineer, Infiltrate, Leadership, Navigation, Office, Siege, Tactics, Warfare |
| §Waycraft | Ranger; Cleric > Hermit | Animal Trainer, Forage, Hunter, Mountaineering, Navigation, Pathfinder, Survival, Tracking, Trapmaster |
| §Commerce | Merchant Trade or Merchant culture | Barter, Connections, Mercantile, Navigation, Office, Politics, Suss, Wares |
| §Courtcraft | Aristocrats, Nobles, Royalty, Imperial; Knight > Royal | Connections, Fawn, History, Language, Leadership, Peerage, Politics, Read, Suss |
| §Artistry | Entertainer; Performer culture; Ranger > Bardic | Artist, Banter, Disguise, Gossip, Language, Perform, Persuade, Prestidigitation, Suss |

## Rules contract

- A § Skill is Restricted; an ordinary elective Skill is not restricted merely because it appears in a § roster.
- One elective selection is granted per § level.
- The same elective may be selected at most twice. Its second selection is Talented and is written `+Elective`.
- A purchased elective used directly for a Test within the § group's intent receives `DM +X/3`, dropping fractions.
- A Talented elective can provide `DM +1` to a Test directly involving another elective in the same group when it can support that Test within the group's intent. It does not provide the +1 to itself.
- Multiple applicable Talented electives may each provide `DM +1`.
- At most one § group contributes group/Talented bonuses to a Test.
- § support does not occupy the secondary or third Skill positions under Gathering DMs, is not divided again, and does not increase the elective's Skill level for rules keyed to Skill X.

## Implementation rule

`src/data/interdisciplinarySkills.json` is the centralized chargen projection of this contract. Do not duplicate elective rosters or access matrices in UI code. Package data may grant a § Skill directly; otherwise the access matrix controls whether it is offered as an Additional Skill.

Legacy `§Military`, `§Studies`, and `§Teachings` save names are compatibility aliases only. New data and UI output use `§Warfare`, `§Letters`, and `§Doctrine`.
