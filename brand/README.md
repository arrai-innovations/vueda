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

## Social card

`docs/public/assets/social-card.png` is the link-preview card for the
documentation site. The Open Graph and Twitter card tags built in
`docs/.vitepress/config.mjs` point at it. It is 1200x630 because that is
what the crawlers expect, and PNG because they ignore SVG.

It composes existing brand material rather than new artwork, and it
follows the dark-background treatment in `Arrai-Brand-Standards.pdf`: the
mark keeps the brand blue (`#0077f7`) and the wordmark is knocked out in
white, over the brand dark blue (`#001c30`) with a faint radial. The two
lines of live type are IBM Plex Sans. No Galano glyph is set as type, so
the licence position above is unchanged.

To regenerate it, knock the two wordmark paths out in white, render the
lockup, and compose the card with ImageMagick. Those two paths are the
ones carrying `aria-label` in `logo-text-solid.svg`; every other path
belongs to the mark. IBM Plex Sans ships as woff2 in
`@fontsource-variable`, so instance a static TTF first with
`fonttools varLib.instancer`.

```bash
magick -background none lockup-white-wordmark.svg -resize 820x lockup.png
magick -size 1200x630 xc:'#001c30' \
  \( -size 1200x630 radial-gradient:'#04355a'-'#001c30' \) -composite \
  lockup.png -gravity center -geometry +0-50 -composite \
  -font Plex-400.ttf -pointsize 32 -fill '#b9c7d6' -gravity center \
  -annotate +0+110 'Integrator guide, changelog, and reference' \
  -font Plex-600.ttf -pointsize 26 -fill '#ffffff' -gravity south \
  -annotate +0+48 'vueda.dev' \
  -depth 8 -strip docs/public/assets/social-card.png
```

## Typography

Identity-level font choices, stable across themes:

- **Sans (UI):** IBM Plex Sans.
- **Mono (data):** JetBrains Mono.
- **Brand (marketing only):** Galano Grotesque SemiBold (pre-rendered SVG;
  no web embedding). Montserrat would be the free alternative, if really required.

Usage rules for these families (weight discipline, mono policy, italic
policy, the seven-step scale) belong to the theme. See
`client/lib/theme/vueda-tailwind/README.md`.
