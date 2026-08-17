# Armor Hit Location Model v127

Author-defined granular occupancy used only by detailed Armor customization.

## Atomic regions

- Head: Skull; Face.
- Neck: Front; Back.
- Torso: Upper Chest; Chest; Abdomen; Upper Back; Lower Back.
- Each Arm: Shoulder; Upper Arm; Elbow; Forearm; Hand.
- Each Leg: Thigh; Knee; Shin; Foot.

This yields 27 sided/unsided atomic regions. Outer Sectional Armor and Helms may not share an atom, except that Elbow and Knee atoms explicitly permit overlap.

## Existing catalog Helm coverage

- Helmet, Mail Coif: Skull; Neck Front; Neck Back; Left/Right Shoulder.
- Helmet, Boiled: Skull; Neck Back.
- Helmet, Full: Skull; Face.
- Helmet, Half: Skull.
- Helmet, Half Mantled: Skull; Neck Back.
- Helmet, Full Visored: Skull; Face.
- Helmet, Full Visored Mantled: Skull; Face; Neck Back.

The author attachment also defines **Helmet, Full Mantled** as Skull + Face + Neck Back. It is not added to the selectable catalog in v127 because the current DXD armor table supplies no Price/Weight/D/AR record for that distinct item. Its coverage definition is retained here for later catalog/table parity rather than inventing mechanics.

## Layer behavior

- Suit/Sectional Armor: outer occupancy rules apply.
- Helm: outer occupancy rules apply against the Suit and other sectional pieces.
- Gear: separate under-armor layer; no outer occupancy collision.
- Shield: mobile protection; no body occupancy.

The granular model does not make Hit Location combat mandatory. It is a coherence constraint for users who choose to customize the abstract Armor Set.
