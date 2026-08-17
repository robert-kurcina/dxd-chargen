# Character Armor Normalization v131

- Synchronized active character Armor unit Weight and Price values to `dxd-chargen` v130.
- Stored unit values remain the SIZ 12 catalog baseline; existing `sizedForSiz` fields remain authoritative for runtime R10 scaling.
- Enforced one legal worn Suit configuration, one Helmet, one Shield, and one Gear layer.
- Preserved the Elbow/Knee exception for detailed sectional occupancy.
- Detailed Sectional Armor supersedes a conflicting abstract Armor Set; the redundant Set is removed as an abstraction rather than treated as a second possession.
- Conflicting physical armor remains owned in Notes and is mechanically inert until selected/worn.

## Conflict corrections

- Sir Bret Giles Franduik: Cuirass remains worn; the redundant Heavy Armor Set abstraction is removed. Per current user correction, `Breastplate, Metal` is retained in Notes as owned but not worn.
- Sir Mandolore The Desert Templar: Cuirass remains worn; the legacy History `Breastplate` is corrected to `Breastplate, Metal` and moved to Notes.
- Iskender: Full Helm remains worn; Half Helm & Mantle is moved to Notes.
- Camilla: customized/player Light (Boiled) remains worn; canonical-starting Light (Soft) is moved to Notes.

Source/provenance JSON and portrait/source images are unchanged.
