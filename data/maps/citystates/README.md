# Citystate map assets

Place the Sondgara Overland and settlement image assets in this directory.

Expected Overland files include `sondgara-overview.overlay.svg` and `sondgara-overview.png`. Settlement images use the SVG layer label as their filename (for example, `citystate-corom.png` or `castel-darken.png`).

The `/api/data-assets/citystates/...` route serves local files from this directory first. If an asset is absent, the development archive may fall back to the same path on the public `robert-kurcina/dxd-chargen` GitHub `main` branch.

## Marker asset audit

The overlay contains 20 interactive markers; 12 have local region images. The
`free-city-gilgan` marker resolves to the legacy `free-city-gilban.png` filename.

The following marker images are missing from this directory (also absent in the
initial region-image revision checked during the audit):

- `citystate-dar.png`
- `isles-of-waste.png`
- `citystate-indel.png`
- `citystate-paelon.png`
- `citystate-quel.png`
- `citystate-stagin.png`
- `citystate-riaton.png`
- `citystate-khardik.png`

Until supplied, these markers remain selectable and show an explicit region-map
unavailable message if the remote fallback also fails. Do not substitute an
unrelated settlement image. Selected rings are blue; hover/focus rings are white
when not selected, and inactive rings retain their original map colors.
