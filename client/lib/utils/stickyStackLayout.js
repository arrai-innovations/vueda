/**
 * @module utils/stickyStackLayout
 * @description Pure geometry for an independently-revealing stack of sticky bars pinned to one edge
 * of the scroll viewport (the top or bottom). Given each bar's measured height and current hidden
 * state, in stack order from the pinned edge outward, it returns the per-bar layout the host applies
 * as inline style: a static sticky offset (`top` or `bottom`), a transform that hides a bar and
 * compacts the survivors, and a stacking order. Keeping the math pure makes it unit-testable without
 * a browser; the host only measures heights and applies the result.
 *
 * The model: each bar's sticky offset is the sum of the heights of all bars between it and the
 * pinned edge (the classic stacked-sticky technique), and never changes as bars hide. Hiding is done
 * with transforms instead, so only the GPU-friendly transform animates: a visible bar shifts toward
 * the edge by the total height of the hidden bars nearer the edge (closing their gaps), and a hidden
 * bar slides fully past the edge, behind the bars nearer the edge (which carry a higher stacking
 * order). The total height of the still-visible bars is returned so the host can publish it (e.g. as
 * the offset a sticky table header sits below).
 */

/**
 * @typedef {object} StickyStackBar
 * @property {number} height - The bar's measured height in pixels.
 * @property {boolean} hidden - Whether the bar is currently hidden (revealed away).
 */

/**
 * @typedef {object} StickyStackBarLayout
 * @property {number} offset - The static sticky offset in pixels from the pinned edge (apply as `top` for the top edge, `bottom` for the bottom edge).
 * @property {number} translate - The transform offset in pixels along the scroll axis: negative pulls toward the top, positive toward the bottom. Apply as `translateY(<translate>px)`.
 * @property {number} zIndex - The stacking order; bars nearer the pinned edge sit on top so a hiding bar slides behind them.
 */

/**
 * @typedef {object} StickyStackLayout
 * @property {StickyStackBarLayout[]} bars - Per-bar layout, in the same order as the input.
 * @property {number} visibleExtent - Total height in pixels of the currently-visible bars (the depth the stack occupies at the pinned edge).
 */

/**
 * Resolve the layout for a stack of sticky bars pinned to one edge.
 *
 * @param {StickyStackBar[]} bars - Bars in stack order from the pinned edge outward (for the top edge, top to bottom; for the bottom edge, bottom to top).
 * @param {'top' | 'bottom'} [edge] - The viewport edge the stack pins to. Defaults to `top`.
 * @returns {StickyStackLayout} The per-bar layout and the visible extent.
 */
export function resolveStickyStack(bars, edge = "top") {
    const sign = edge === "bottom" ? 1 : -1;
    const count = bars.length;

    // Heights accumulate from the pinned edge outward: `nearerAll` is the total height of bars
    // between this bar and the edge; `nearerHidden` is how much of that is currently hidden.
    let nearerAll = 0;
    let nearerHidden = 0;

    const result = bars.map((bar, index) => {
        const height = bar.height || 0;
        const offset = nearerAll;
        // A visible bar slides toward the edge to close the gaps left by hidden bars nearer the edge.
        // A hidden bar slides fully past the edge (its sticky offset plus its own height), behind the
        // bars nearer the edge.
        const distance = bar.hidden ? offset + height : nearerHidden;
        const layout = {
            offset,
            // `|| 0` normalizes the `-0` that `sign * 0` would otherwise produce.
            translate: sign * distance || 0,
            // Bars nearer the pinned edge sit on top so hiding bars slide behind them.
            zIndex: edge === "bottom" ? index + 1 : count - index,
        };

        nearerAll += height;
        if (bar.hidden) {
            nearerHidden += height;
        }
        return layout;
    });

    return { bars: result, visibleExtent: nearerAll - nearerHidden };
}
