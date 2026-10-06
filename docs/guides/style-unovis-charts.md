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

VUEDA ships an optional stylesheet, `unovis.css`, that gives [Unovis](https://unovis.dev/docs/quick-start/) charts VUEDA's typography, surfaces, and dark mode. You build charts with the Unovis Vue components. The stylesheet changes only how they look.

## Install and activate

The stylesheet targets `@unovis/ts` and `@unovis/vue` 1.7.0. Install both in the application that draws charts:

```sh
pnpm add @unovis/ts@1.7.0 @unovis/vue@1.7.0
```

Set up the client as described in [Client Plugin Prerequisites](client-plugin-prerequisites.md), including the `vueda-tailwind/base.css` import. Then import the chart stylesheet from the chart component or the chart route:

```js
import "@vueda/theme/vueda-tailwind/unovis.css";
```

Put `class="unovis-vueda"` on an element that wraps the chart, its legend, and its tooltip. VUEDA's startup imports load neither this stylesheet nor Unovis, so lazy-load the chart component to keep chart code out of other routes.

## Working example

Hover a bar or a line to see its tooltip. Switch the documentation site's appearance setting while the charts are on screen to see both modes. The wrapper of the second chart points the first palette slot at slot 5. Its North series changes color, and the first chart keeps the default blue. The table below the charts gives the same data without relying on a pointer or on color.

<ClientOnly>
<UnovisThemeExample />
</ClientOnly>

The complete Vue source:

<<< ../.vitepress/theme/components/UnovisThemeExample.vue

## The chart palette

The five tokens `--vueda-chart-1` to `--vueda-chart-5` hold a palette derived from the Okabe-Ito colors ([Masataka Okabe and Kei Ito, Color Universal Design](https://jfly.uni-koeln.de/color/)). The comment at the top of `unovis.css` records how each color was derived. Against the default card background, every light-mode color has a contrast ratio of at least 3.18:1, and every dark-mode color has at least 6.05:1. Contrast against the surface does not make two series easy to tell apart. Label each series, give lines different dash patterns, and offer the data as a table. Check contrast again when you change the palette or the card surface.

The palette marks which category a series belongs to. It is separate from the status tokens [`--primary`]{@api css-token:primary}, [`--success`]{@api css-token:success}, [`--warning`]{@api css-token:warning}, and [`--destructive`]{@api css-token:destructive}. When a chart shows status, assign those tokens to the series yourself and label what each color means.

## Override the palette

The palette tokens are CSS custom properties. [Theming and Customization](../core-concepts/theming-and-customization.md) describes how VUEDA's CSS tokens and their overrides work. This section covers the load order that applies to `unovis.css`.

`unovis.css` declares the palette tokens on `:root` and `.dark`. In a production build, Vite puts a stylesheet that a lazily loaded chart component imports into the CSS file of the component's chunk. The browser adds the chunk's CSS file after the application's own stylesheets when the chunk loads. A `:root` rule in the application's main stylesheet therefore loses to the palette in `unovis.css`. The two rules have the same specificity, so the later one wins.

To change the palette for every chart, use one of these two placements:

- **On the chart wrapper class.** `unovis.css` declares no palette tokens on `.unovis-vueda`, so a rule on that class applies from any stylesheet, whatever the load order:

    ```css
    .unovis-vueda {
        --vueda-chart-1: oklch(0.55 0.13 250);
    }
    .dark .unovis-vueda {
        --vueda-chart-1: oklch(0.75 0.13 250);
    }
    ```

- **In a stylesheet that the chart component imports after `unovis.css`.** Vite keeps the two files in import order inside the chunk's CSS file, so `:root` and `.dark` rules in the second file win:

    ```js
    import "./chart-palette.css";
    import "@vueda/theme/vueda-tailwind/unovis.css";
    ```

To change one chart, set the token on that chart's wrapper element, as the second chart in the example does. Pointing a slot at another palette token, such as `var(--vueda-chart-5)`, keeps the light and dark values of that token.

The optional `--vueda-chart-default` token sets the color of single-series charts. When it is unset, `--vis-color-main` uses `--vueda-chart-1`.

`unovis.css` declares the Unovis variables in the [mapping reference](#mapping-reference) on `.unovis-vueda` itself. To change one of them, set it in a stylesheet that the chart component imports after `unovis.css`, or use a more specific selector, such as `.unovis-vueda.sales-chart`.

## Assign colors to series

For a chart with more than one series, pass palette tokens as CSS strings, such as `"var(--vueda-chart-2)"`, to the Unovis color accessor, the legend items, and the crosshair colors. Assign each series its token and dash pattern by a stable key, such as the series name. When a filter hides some series, look up each remaining series by its key so that it keeps its color. The example uses two fixed series and assigns colors by position, which is safe only because its series never change. The palette has five slots, so a chart with more than five categories needs labels or patterns to tell the extra ones apart.

## Dark mode and tooltip scope

The mapping reads VUEDA tokens that change under the `.dark` class, so charts and tooltips that are already on screen change with the page's mode. Unovis also has its own dark theme, which it applies under classes such as `theme-dark`. Do not enable it for these charts.

Unovis places a tooltip inside the chart container by default. The tooltip is then inside the `.unovis-vueda` wrapper and uses the mapping. A tooltip given `container: document.body` is outside the wrapper and loses the mapping. If a tooltip must render elsewhere, give it a host element with the `unovis-vueda` class, inside the element that carries `.dark`. Repeat any chart-level token overrides on that host, because the host does not inherit them from the chart.

## Mapping reference

`unovis.css` sets these Unovis variables on `.unovis-vueda`:

| Unovis variables                                                                                | VUEDA token or fixed value                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--vis-color-main`                                                                              | `--vueda-chart-default`; `--vueda-chart-1` when that is unset                                                                                |
| `--vis-color0` to `--vis-color4`                                                                | `--vueda-chart-1` to `--vueda-chart-5`                                                                                                       |
| `--vis-font-family`, `--vis-axis-font-family`, `--vis-legend-font-family`                       | [`--vueda-font-sans`]{@api css-token:vueda-font-sans}                                                                                        |
| `--vis-axis-tick-label-font-size`, `--vis-axis-label-font-size`, `--vis-legend-label-font-size` | [`--vueda-text-supporting`]{@api css-token:vueda-text-supporting}                                                                            |
| `--vis-axis-tick-label-color`, `--vis-axis-label-color`, `--vis-crosshair-line-stroke-color`    | [`--muted-foreground`]{@api css-token:muted-foreground}                                                                                      |
| `--vis-axis-tick-color`, `--vis-axis-domain-color`, `--vis-axis-grid-color`                     | [`--border`]{@api css-token:border}                                                                                                          |
| `--vis-axis-grid-line-width`, `--vis-axis-domain-line-width`, `--vis-axis-tick-line-width`      | `1px`                                                                                                                                        |
| `--vis-axis-grid-line-dasharray`, `--vis-axis-domain-line-dasharray`                            | `none`                                                                                                                                       |
| `--vis-legend-label-color`                                                                      | [`--foreground`]{@api css-token:foreground}                                                                                                  |
| `--vis-legend-item-spacing`, `--vis-legend-vertical-item-spacing`                               | `16px`, `8px`                                                                                                                                |
| `--vis-tooltip-background-color`, `--vis-tooltip-text-color`                                    | [`--popover`]{@api css-token:popover}, [`--popover-foreground`]{@api css-token:popover-foreground}                                           |
| `--vis-tooltip-border-color`, `--vis-tooltip-border-radius`                                     | `--border`, [`--vueda-card-radius`]{@api css-token:vueda-card-radius}                                                                        |
| `--vis-tooltip-box-shadow`, `--vis-tooltip-transition-duration`                                 | [`--vueda-shadow-popover`]{@api css-token:vueda-shadow-popover}, [`--vueda-duration-interaction`]{@api css-token:vueda-duration-interaction} |
| `--vis-tooltip-padding`, `--vis-tooltip-backdrop-filter`                                        | `0.375rem 0.5rem`, `none`                                                                                                                    |

Unovis 1.7.0 has no variable for tooltip font size. The example sets the font size on the element that its tooltip function returns. It fills that element with `textContent` so that data values are never parsed as HTML.

## Coverage and limits

The stylesheet covers the components in the example: `VisStackedBar`, `VisLine`, `VisAxis`, `VisBulletLegend`, `VisCrosshair`, and `VisTooltip`. It sets their palette, typography, axis lines, legend text and spacing, crosshair line color, and tooltip surface. Other Unovis components keep their Unovis defaults. Chart geometry, line patterns, data accessors, and behavior are Unovis props. [Unovis theming](https://unovis.dev/docs/guides/theming/) lists every variable that Unovis reads.

The example renders fixed data. For examples that load chart data from the API, see [issue 321](https://github.com/arrai-innovations/vueda/issues/321).
