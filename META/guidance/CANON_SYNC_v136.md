# Canon / Product Sync v136

v136 is an Admin Characters workflow refinement only. It does not revise DXD rules, formulas, normalized runtime catalogues, CharacterDraft schema, character data, Character Record Sheet projection, or the global Library-tag vocabulary.

The change extends the existing pending-tag edit transaction with a bulk Common-tags control over the currently checked characters. The control computes the intersection of their pending tag sets; additions are unioned into each checked character and removals are deleted from each checked character. Existing Save, Cancel, and confirmation behavior remains unchanged.

PDF export behavior is unchanged except that the confirmation affirmative label is **Proceed** and a successful completed export clears the current checkbox selection.
