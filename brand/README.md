# VUEDA Brand

VUEDA (Vue.js User Experience for Django Administration) is Arrai
Innovations' open-source admin framework on Vue 3 + Django REST Framework.

The default theme in `client/lib/theme/vueda-tailwind/` is the visual
expression of this brand. Brand details that should stay stable across
any future theme work live here; theme rules that may evolve live in
that folder's README.

## Lineage

The VUEDA mark is a rotated V derived from Arrai's isometric
"A-shielding-I" cube. The accent blue (`#0077f7`) is inherited verbatim
from Arrai's primary brand colour and is anchored at
`oklch(0.58 0.19 254)` in the theme tokens (`--primary` in
`client/lib/theme/vueda-tailwind/base.css`).

## Mark and wordmark

Source materials for the VUEDA mark, the wordmark, and the Arrai
parent-brand logos live alongside this README:

- `logo-cube-solid.svg` and `logo-cube-solid.svgminify.svg`: the VUEDA
  mark (rotated V cube).
- `logo-text-solid.svg`, `logo-text-solid.svgminify.svg`, and
  `logo-text-solid.raw.svg`: the VUEDA wordmark (pre-rendered Galano
  Grotesque SemiBold paths).
- `arrai-logo-*.svg`: Arrai parent-brand logos in three lock-ups.
- `Arrai-Brand-Standards.pdf`: Arrai's full brand standards reference.

The wordmark is set in Galano Grotesque SemiBold; the licence forbids
web embedding, so live brand type ships as pre-rendered SVG paths
rather than a webfont.

## Typography

Identity-level font choices, stable across themes:

- **Sans (UI):** IBM Plex Sans.
- **Mono (data):** JetBrains Mono.
- **Brand (marketing only):** Galano Grotesque SemiBold (pre-rendered SVG;
  no web embedding). Montserrat would be the free alternative, if really required.

Usage rules for these families (weight discipline, mono policy, italic
policy, the seven-step scale) belong to the theme. See
`client/lib/theme/vueda-tailwind/README.md`.
