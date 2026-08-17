# dxd-chargen v132

Runtime normalization for completed/imported character gear and worn Armor.

- Completed imported characters no longer receive their Trade starting package a second time when loading legacy browser or file data with a missing `startingGearTrade` marker.
- Worn Armor legality now runs in the client synchronization path as well as server-side character normalization.
- Armor legality uses the same Suit/Helm/Shield/Gear slot rules and sectional atomic occupancy rules used by the detailed Armor editor.
- Armor Set + Sectional Suit coexistence is illegal; detailed Sectional Armor supersedes the redundant abstract Set.
- One Helm, one Shield, and one Gear layer may be worn; sectional/helm overlap is allowed only at Elbows and Knees.
- The Character Sheet defensively projects only the resolved legal worn Armor list, and Burden uses that same legal list even if malformed legacy state reaches projection.
- Single-sided sectional occupancy is now side-aware in runtime normalization.
- The single-character file GET path applies the same server storage normalizer before returning a draft.
- Companion character archive v132 records the established Trade marker and `gearReviewed=true` for all 23 completed characters.
