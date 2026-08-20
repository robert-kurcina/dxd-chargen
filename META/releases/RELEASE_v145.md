# v145 — Sheet filename placement and Library tag refinement

Implements the requested Sheet and Library tag presentation refinements.

## Runtime changes

- Sheet removes the active filename from the outer workspace header and displays it on its own line immediately below the Front/Back/zoom/export control row. Forge retains its existing filename placement.
- Library and Admin character entries display all tags actually associated with the character, including retained historical assignments that are no longer in the current global tag vocabulary.
- Expanded saved-version rows display each version's own stored tag assignments alongside its filename, timestamp, and explicit Load button.
- The Tags filter is now a tokenfield on desktop and mobile in both Library and Admin. The selectable vocabulary includes global tags plus tags already associated with filesystem characters.
- Multiple tag-filter tokens use intersection semantics: an entry must possess every selected token to remain visible.

## Data behavior

- The character-version metadata endpoint now returns `libraryTags` from each current or archived character draft, preserving version-specific tag history.
