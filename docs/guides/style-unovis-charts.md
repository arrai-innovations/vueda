---
title: Style Unovis Charts
audience: integrator
status: draft
type: how-to
---

<script setup>
import { defineAsyncComponent } from "vue";
const UnovisThemeExample = defineAsyncComponent(() => import("../.vitepress/theme/components/UnovisThemeExample.vue"));
</script>

# Style Unovis Charts

VUEDA supplies an optional CSS mapping for native Unovis components. It covers the bar and line charts, axes, legends, crosshairs, and tooltips shown here. Continue using the [Unovis Vue API](https://unovis.dev/docs/quick-start/) directly; this integration adds no chart wrapper or data-fetching API.

## Install and activate

This integration is tested with `@unovis/ts` and `@unovis/vue` **1.7.0**. Install both in the application that draws charts:

```sh
pnpm add @unovis/ts@1.7.0 @unovis/vue@1.7.0
```

Use the normal [VUEDA client setup](client-plugin-prerequisites.md), including the `vueda-tailwind/base.css` stylesheet. Import the optional mapping from a chart component or a chart route:

```js
import "@vueda/theme/vueda-tailwind/unovis.css";
```

Place `class="unovis-vueda"` on a wrapper containing the chart, legend, and tooltip. VUEDA's common startup imports do not load this file or Unovis. Lazy-load the chart component to keep chart JavaScript out of unrelated routes.

## Working example

Use the documentation site's appearance control to switch modes while the charts are mounted. Hover a bar or line to inspect its tooltip. The second chart changes only its own first palette slot; the first chart retains its default blue. The table provides the same observations without requiring a pointer or color discrimination.

<ClientOnly>
<UnovisThemeExample />
</ClientOnly>

Complete Vue source:

<<< ../.vitepress/theme/components/UnovisThemeExample.vue

## Palette and customization

The five `--vueda-chart-1` through `--vueda-chart-5` tokens are an **Okabe-Ito derivative**, not the original named palette. They start from blue `#0072B2`, orange `#E69F00`, bluish green `#009E73`, vermillion `#D55E00`, and reddish purple `#CC79A7`. Credit: [Masataka Okabe and Kei Ito, Color Universal Design](https://jfly.uni-koeln.de/color/).

The colors are expressed in OKLCH. Light-mode lightness is capped at 0.66; dark-mode lightness is raised to at least 0.72. Hue is preserved and chroma reduced where needed to stay in sRGB. The light palette has at least 3.18:1 contrast against the default white card; the dark palette has at least 6.05:1 against the default dark card. Surface contrast is not a guarantee of distinguishability between series. Pair colors with labels, line styles, and a data table, and recheck custom surfaces and palettes.

These tokens encode category identity. They are independent of `--primary`, `--success`, `--warning`, and `--destructive`. If a chart encodes status, explicitly assign the relevant semantic colors and label their meanings.

Define application-wide overrides after the integration import. Provide both modes where needed:

```css
:root {
    --vueda-chart-1: oklch(0.55 0.13 250);
}
.dark {
    --vueda-chart-1: oklch(0.75 0.13 250);
}
```

A local override belongs on the activation wrapper, as in the example. The optional `--vueda-chart-default` token changes single-series defaults independently; without it, `--vis-color-main` falls back to `--vueda-chart-1`.

For multiple series, pass explicit CSS token strings through Unovis's color accessor, legend items, and crosshair colors. Assign tokens and dash arrays by stable domain keys. Do not assign them from the index of the currently filtered series. The demo uses two fixed series; an application with filters must look up each remaining series' original assignment. Five palette slots do not provide unlimited distinct categories.

## Mapping reference

| Unovis variables                                                                                | VUEDA source or integration default                        |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `--vis-color-main`                                                                              | `--vueda-chart-default`, falling back to `--vueda-chart-1` |
| `--vis-color0` through `--vis-color4`                                                           | `--vueda-chart-1` through `--vueda-chart-5`                |
| `--vis-font-family`, `--vis-axis-font-family`, `--vis-legend-font-family`                       | `--vueda-font-sans`                                        |
| `--vis-axis-tick-label-font-size`, `--vis-axis-label-font-size`, `--vis-legend-label-font-size` | `--vueda-text-supporting`                                  |
| `--vis-axis-tick-label-color`, `--vis-axis-label-color`, `--vis-crosshair-line-stroke-color`    | `--muted-foreground`                                       |
| `--vis-axis-tick-color`, `--vis-axis-domain-color`, `--vis-axis-grid-color`                     | `--border`                                                 |
| `--vis-axis-grid-line-width`, `--vis-axis-domain-line-width`, `--vis-axis-tick-line-width`      | `1px`                                                      |
| `--vis-axis-grid-line-dasharray`, `--vis-axis-domain-line-dasharray`                            | `none`                                                     |
| `--vis-legend-label-color`                                                                      | `--foreground`                                             |
| `--vis-legend-item-spacing`, `--vis-legend-vertical-item-spacing`                               | `16px`, `8px`                                              |
| `--vis-tooltip-background-color`, `--vis-tooltip-text-color`                                    | `--popover`, `--popover-foreground`                        |
| `--vis-tooltip-border-color`, `--vis-tooltip-border-radius`                                     | `--border`, `--vueda-card-radius`                          |
| `--vis-tooltip-box-shadow`, `--vis-tooltip-transition-duration`                                 | `--vueda-shadow-popover`, `--vueda-duration-interaction`   |
| `--vis-tooltip-padding`, `--vis-tooltip-backdrop-filter`                                        | `0.375rem 0.5rem`, `none`                                  |

Tooltip content has no font-size token in this Unovis version. The example sets its DOM content's font size to `--vueda-text-supporting`. Data-driven tooltip text is inserted with `textContent`, not interpolated HTML.

## Dark mode and scope

The mapping references VUEDA tokens that change under `.dark`. Mounted charts and tooltip surfaces update through CSS without maintaining Unovis's separate theme state. Do not additionally enable Unovis's `theme-dark` class for these charts.

The default tooltip placement is inside the chart container and inherits the mapping. A tooltip moved to `document.body` leaves that scope. Prefer the default placement, or supply a dedicated portal host with `unovis-vueda`, under the same dark-mode ancestor, and repeat any chart-local token overrides on that host. An override on the original chart cannot inherit across unrelated DOM subtrees.

## Coverage and limits

The example exercises `VisStackedBar`, `VisLine`, `VisAxis`, `VisBulletLegend`, `VisCrosshair`, and `VisTooltip`. The five-color palette, typography, axis rules, legend text/spacing, crosshair line color, and tooltip surface are covered. Other Unovis components and their specialized tokens retain their own defaults. Component geometry, line patterns, data accessors, and behavior remain Unovis props. See [Unovis theming](https://unovis.dev/docs/guides/theming/) for its full styling surface.

Interactive API-loading examples are tracked separately in [issue 321](https://github.com/arrai-innovations/vueda/issues/321). This example establishes rendering and styling only.

## Verification record

Checked with Unovis TS/Vue 1.7.0 in Chrome for Testing 151.0.7922.34: bar and line
rendering, axis labels, legends, bar tooltips, switching `.dark` while mounted,
changing a mapped VUEDA text token, and overriding a palette slot on one chart while
its neighbor retains the default. The docs site builds with this example. The
consuming Widget Warehouse dashboard also checks responsive resizing, stable series
colors and dashes after filtering, and accessible data links.

Coverage is SVG charts in this browser. Canvas rendering, exported raster images,
other Unovis components, arbitrary portal placement, and full color-vision simulation
are not covered by these checks. The explicit labels, line styles, and data alternative
remain part of the example.
