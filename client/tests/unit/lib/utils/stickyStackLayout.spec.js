import { resolveStickyStack } from "@vueda/utils/stickyStackLayout.js";

describe("lib/utils/stickyStackLayout.js", () => {
    describe("top edge", () => {
        it("stacks visible bars at cumulative offsets with no transform", () => {
            const { bars, visibleExtent } = resolveStickyStack(
                [
                    { height: 40, hidden: false },
                    { height: 32, hidden: false },
                    { height: 50, hidden: false },
                ],
                "top",
            );
            expect(bars.map((b) => b.offset)).toEqual([0, 40, 72]);
            expect(bars.map((b) => b.translate)).toEqual([0, 0, 0]);
            // Bars nearer the top sit on top so a hiding bar slides behind them.
            expect(bars.map((b) => b.zIndex)).toEqual([3, 2, 1]);
            expect(visibleExtent).toBe(122);
        });

        it("hides a middle bar upward and compacts the bars below it", () => {
            const { bars, visibleExtent } = resolveStickyStack(
                [
                    { height: 40, hidden: false }, // title (always)
                    { height: 32, hidden: true }, // toolbar (hidden)
                    { height: 50, hidden: false }, // another bar
                ],
                "top",
            );
            // Static offsets never change; only transforms move.
            expect(bars.map((b) => b.offset)).toEqual([0, 40, 72]);
            // Hidden bar slides fully past the top edge (offset + own height); the bar below shifts
            // up by the hidden bar's height to close the gap (effective top 72 - 32 = 40).
            expect(bars.map((b) => b.translate)).toEqual([0, -72, -32]);
            // Visible extent excludes the hidden bar.
            expect(visibleExtent).toBe(90);
        });

        it("collapses to zero visible extent when every bar is hidden", () => {
            const { visibleExtent } = resolveStickyStack(
                [
                    { height: 40, hidden: true },
                    { height: 32, hidden: true },
                ],
                "top",
            );
            expect(visibleExtent).toBe(0);
        });

        it("defaults the edge to top", () => {
            const fromDefault = resolveStickyStack([{ height: 10, hidden: false }]);
            const fromTop = resolveStickyStack([{ height: 10, hidden: false }], "top");
            expect(fromDefault).toEqual(fromTop);
        });
    });

    describe("bottom edge", () => {
        it("stacks visible bars from the bottom with bottom-most on top", () => {
            const { bars, visibleExtent } = resolveStickyStack(
                [
                    { height: 50, hidden: false }, // bottom-most (e.g. pagination)
                    { height: 32, hidden: false },
                ],
                "bottom",
            );
            expect(bars.map((b) => b.offset)).toEqual([0, 50]);
            expect(bars.map((b) => b.translate)).toEqual([0, 0]);
            // Bars nearer the bottom edge sit on top.
            expect(bars.map((b) => b.zIndex)).toEqual([1, 2]);
            expect(visibleExtent).toBe(82);
        });

        it("hides a bar downward (positive transform) and drops the hidden height from the extent", () => {
            const { bars, visibleExtent } = resolveStickyStack(
                [
                    { height: 50, hidden: false },
                    { height: 32, hidden: true },
                ],
                "bottom",
            );
            expect(bars.map((b) => b.translate)).toEqual([0, 82]);
            expect(visibleExtent).toBe(50);
        });
    });

    describe("edge cases", () => {
        it("returns an empty layout for no bars", () => {
            expect(resolveStickyStack([], "top")).toEqual({ bars: [], visibleExtent: 0 });
        });

        it("treats a missing height as zero", () => {
            const { bars, visibleExtent } = resolveStickyStack(
                [{ hidden: false }, { height: 20, hidden: false }],
                "top",
            );
            expect(bars.map((b) => b.offset)).toEqual([0, 0]);
            expect(visibleExtent).toBe(20);
        });
    });
});
