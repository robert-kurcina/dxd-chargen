# dxd-chargen v136

## Admin Characters bulk tag editing

- Expands the Edit Tags status component with a **Common tags** token field.
- Common tags are the alphanumerically sorted intersection of the pending tag sets for every currently checked character.
- Adding a Common tag adds that tag to every checked character.
- Removing a Common tag removes that tag from every checked character.
- The bulk editor updates the same pending tag state used by per-character token fields, so Save/Cancel and the existing confirmation flow remain authoritative.
- Changing the checked-character set immediately recomputes the Common tags intersection.

## PDF export

- The **Export selected characters** confirmation affirmative action is labeled **Proceed**.
- Successful PDF completion clears all selected-character checkboxes.
- A failed export leaves the selection intact so the same set can be retried.

## Rules/data scope

No DXD rules, normalized runtime catalogues, CharacterDraft schema, character files, CRS projection, tag persistence endpoint, or PDF page-generation semantics changed in v136.
