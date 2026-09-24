# Brand colour audit

Audited `Arrai-Brand-Standards.pdf` on 2026-09-20, including the palette
table on page 6 and the vector fill/stroke colours on all 11 pages.

## Canonical digital colours

Use the existing brand hex values as the source of truth in sRGB.
The RGB labels printed on page 6 already agree with these values.

| Colour    | sRGB hex  | RGB (0 to 255)    | CSS OKLCH                                   |
| --------- | --------- | ----------------- | ------------------------------------------- |
| Blue      | `#0077f7` | `0 / 119 / 247`   | `oklch(0.59053715 0.21130455 257.19718572)` |
| Dark blue | `#001c30` | `0 / 28 / 48`     | `oklch(0.21742541 0.05238341 242.80769382)` |
| Grey      | `#e5e5e5` | `229 / 229 / 229` | `oklch(0.92190602 0 0)`                     |

OKLCH expresses colour using lightness, chroma, and hue. These rounded
OKLCH values were converted from the canonical sRGB values with ColorAide
and checked to round-trip to the same 8-bit hex values. They are alternate
representations of the existing colours, not a redesigned palette.

## PDF artwork corrections

The PDF embeds the `sRGB IEC61966-2.1` profile. Its palette text is drawn
as vector outlines, and it contains no embedded fonts. Colour operands
can be edited independently of those outlines.

The audit found these sRGB operands in the page content streams. The hex
column rounds each channel to the nearest 8-bit value; it is not sampled
from a screenshot.

| Original RGB operands (0 to 1) | Rounded hex | Correction                                                | Colour-setting operations |
| ------------------------------ | ----------- | --------------------------------------------------------- | ------------------------- |
| `0 0.466553 0.96875`           | `#0077f7`   | Normalize to canonical blue                               | 31                        |
| `0 0.469971 0.970703`          | `#0078f8`   | Replace residual footer blue with canonical blue          | 10                        |
| `0 0.110107 0.189941`          | `#001c30`   | Normalize to canonical dark blue                          | 31                        |
| `0.900391 0.900391 0.900391`   | `#e6e6e6`   | Correct the grey swatch and matching artwork to `#e5e5e5` | 16                        |

The residual blue appeared in footer lettering on pages 2 to 11. The
grey operand was approximately `229.599705` per 8-bit channel, which
rounds to 230 rather than the printed 229.

Each replacement uses the canonical 8-bit channel divided by 255,
written to nine decimal places. Only matching `scn`/`SCN` colour-setting
operands were changed. The page count, paths, outlined lettering, and
embedded sRGB profile were preserved. No fonts were added.

A separate slightly cool grey (`0.900391 0.910156 0.910156`, approximately
`#e6e8e8`) appears in the decorative patterns on pages 7 to 9. It is not
labelled as a palette swatch, so it was left unchanged. The grey heading
colour and the deliberately incorrect logo colours on page 11 were
also left unchanged.

## Print references require separate validation

The existing printed values remain:

| Colour    | Pantone       | CMYK (%)             |
| --------- | ------------- | -------------------- |
| Blue      | 285 C         | `90 / 48 / 0 / 0`    |
| Dark blue | 296 C         | `100 / 73 / 30 / 83` |
| Grey      | Cool Grey 1 C | `3 / 2 / 4 / 5`      |

These are existing print references, not verified exact translations of
the canonical sRGB colours. Pantone identifies a spot ink colour, while
CMYK specifies process ink amounts. Pantone describes its Color Bridge
CMYK values as the closest print simulations of its spot colours;
[the guide explains the distinction](https://www.pantone.com/articles/color-fundamentals/what-are-your-color-spaces/).

A reproducible CMYK conversion needs a destination ICC profile, which
describes a printing condition, and a rendering intent, which controls
how colours are mapped between colour spaces. The PDF provides no CMYK
profile or output intent. Its embedded RGB profile does not establish
how these CMYK numbers should print. The
[ICC registry](https://registry.color.org/cmyk-registry/) lists different
characterization data for different printing conditions.

Before revising the print numbers, establish the intended print profile
and rendering intent, then proof the resulting colours.

The original PDF remains in Git at commit `cf9f0e22`, before `1dbafa86`
outlined its fonts and removed the contact page. It has 12 pages,
selectable text, and embedded fonts. Recover a working copy with:

```bash
git show cf9f0e22:brand/Arrai-Brand-Standards.pdf > /tmp/Arrai-Brand-Standards-original.pdf
```

This recovers an editable PDF, not the original InDesign source. Update
the colour table there if needed, then outline the fonts again for the
public PDF. Preserve the current 11-page public scope and verify that no
embedded fonts are reintroduced.
