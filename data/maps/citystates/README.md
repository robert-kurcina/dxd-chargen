# Citystate map assets

Place the Sondgara Overland and settlement image assets in this directory.

Expected Overland files include `sondgara-overview.overlay.svg` and `sondgara-overview.png`. Settlement images use the SVG layer label as their filename (for example, `citystate-corom.png` or `castel-darken.png`).

The `/api/data-assets/citystates/...` route serves local files from this directory first. If an asset is absent, the development archive may fall back to the same path on the public `robert-kurcina/dxd-chargen` GitHub `main` branch.
