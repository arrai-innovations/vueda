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
`oklch(0.59 0.211 257.2)` in the theme tokens (`--primary` in
`client/lib/theme/vueda-tailwind/base.css`).

## Mark and wordmark

Source materials for the VUEDA mark, the wordmark, and the Arrai
parent-brand logos live alongside this README:

- `logo-cube-solid.svg` and `logo-cube-solid.svgminify.svg`: the VUEDA
  mark (rotated V cube).
- `logo-text-solid.svg` and `logo-text-solid.svgminify.svg`: the VUEDA
  wordmark (pre-rendered Galano Grotesque SemiBold paths).
- `logo-text-solid.raw.svg`: the editable Inkscape wordmark, with live
  text that requires Galano Grotesque to be installed locally.
- `arrai-logo-*.svg`: Arrai parent-brand logos in three lock-ups.
- `Arrai-Brand-Standards.pdf`: Arrai's full brand standards reference.

The wordmark is set in Galano Grotesque SemiBold; the licence forbids
web embedding, so live brand type ships as pre-rendered SVG paths
rather than a webfont.

The `.svgminify.svg` files are retained copies of their corresponding
`.svg` files. Keep the seven cube paths synchronized across the brand
and docs SVGs when changing the mark. The docs cube has its own
100-unit canvas and group transform to align with the Arrai mark;
preserve that wrapper. The wordmarks retain their original canvases.

The docs cube SVG serves the navbar and SVG favicon. Its PNG serves the
PNG favicon and Apple touch icon. The wordmark PNG appears in the root,
client, and server READMEs. The docs wordmark SVG is the raster source.

## Rendering PNG assets

From the repository root, after `pnpm install`:

```bash
uv run brand/render_assets.py
```

[render_assets.py](render_assets.py) reads the two SVGs in
`docs/public/assets/` and writes these files alongside them:

- `logo-cube-solid.png`: 500x500, with transparent background.
- `logo-text-solid.png`: 1325x500, with transparent background.
- `social-card.png`: 1200x630, with opaque background.

The script declares pinned Python dependencies for uv to install in an
isolated environment. CairoSVG also requires the system Cairo library:
`libcairo2` on Debian/Ubuntu or `cairo` on Homebrew. Use Pillow's prebuilt
wheel, which includes RAQM text shaping, to preserve caption spacing.

IBM Plex Sans comes from the installed docs theme's
`@fontsource-variable/ibm-plex-sans` package. The script converts its
Latin WOFF2 to in-memory static fonts at weights 400 and 600. It uses
the existing Galano outlines, so rendering does not require Galano or
an image editor.

To preview without replacing the published PNGs:

```bash
uv run brand/render_assets.py --out-dir /tmp/vueda-brand-preview
```

Use `--assets-dir` to render alternative SVG inputs and `--font` to
provide an IBM Plex Sans Latin variable WOFF2 from another installation.

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

The renderer above is the source for the card's composition. It changes
the two wordmark paths identified by `aria-label` to white, renders the
lockup at 820x309, and centres it 50 pixels above the canvas centre.
It recreates the original radial gradient from `#04355a` to `#001c30`
and draws the captions with IBM Plex Sans. SVG edges and caption
antialiasing can differ slightly from the original ImageMagick render.

## Typography

Identity-level font choices, stable across themes:

- **Sans (UI):** IBM Plex Sans.
- **Mono (data):** JetBrains Mono.
- **Brand (marketing only):** Galano Grotesque SemiBold (pre-rendered SVG;
  no web embedding). Montserrat would be the free alternative, if really required.

Usage rules for these families (weight discipline, mono policy, italic
policy, the seven-step scale) belong to the theme. See
`client/lib/theme/vueda-tailwind/README.md`.
