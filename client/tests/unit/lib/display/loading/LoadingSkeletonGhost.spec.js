import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import LoadingSkeletonGhost from "@vueda/display/loading/LoadingSkeletonGhost.vue";

describe("lib/display/loading/LoadingSkeletonGhost.vue", () => {
    describe("root element", () => {
        scopedIt("renders with data-slot='loading-skeleton-ghost'", () => {
            const wrapper = mount(LoadingSkeletonGhost);
            expect(wrapper.attributes("data-slot")).toBe("loading-skeleton-ghost");
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { class: "custom-class" } });
            expect(wrapper.classes()).toContain("custom-class");
        });
    });

    describe("bar rendering", () => {
        scopedIt("renders four bars by default", () => {
            const wrapper = mount(LoadingSkeletonGhost);
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(4);
        });

        scopedIt("renders the correct number of bars from the bars prop", () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { bars: [50, 80, 30] } });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(3);
        });

        scopedIt("applies width as an inline style per bar", () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { bars: [60, 90] } });
            const bars = wrapper.findAll('[data-slot="skeleton"]');
            expect(bars[0].attributes("style")).toContain("width: 60%");
            expect(bars[1].attributes("style")).toContain("width: 90%");
        });

        scopedIt("uses the default bar widths [40, 90, 70, 50]", () => {
            const wrapper = mount(LoadingSkeletonGhost);
            const bars = wrapper.findAll('[data-slot="skeleton"]');
            const widths = bars.map((b) => b.attributes("style"));
            expect(widths[0]).toContain("width: 40%");
            expect(widths[1]).toContain("width: 90%");
            expect(widths[2]).toContain("width: 70%");
            expect(widths[3]).toContain("width: 50%");
        });

        scopedIt("renders an empty container when bars is an empty array", () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { bars: [] } });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(0);
        });
    });

    describe("pattern preset", () => {
        scopedIt("pattern='form' renders 4 bars", () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { pattern: "form" } });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(4);
        });

        scopedIt("pattern='table' renders 4 bars all at 100%", () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { pattern: "table" } });
            const bars = wrapper.findAll('[data-slot="skeleton"]');
            expect(bars).toHaveLength(4);
            bars.forEach((b) => expect(b.attributes("style")).toContain("width: 100%"));
        });

        scopedIt("pattern='card' renders 4 bars", () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { pattern: "card" } });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(4);
        });

        scopedIt("pattern overrides the bars prop", () => {
            const wrapper = mount(LoadingSkeletonGhost, {
                props: { bars: [10, 20], pattern: "table" },
            });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(4);
        });
    });

    describe("themeOverride", () => {
        scopedIt("applies themeOverride to the root", () => {
            const wrapper = mount(LoadingSkeletonGhost, {
                props: {
                    themeOverride: { LoadingSkeletonGhost: { root: { class: "custom-root" } } },
                },
            });
            expect(wrapper.classes()).toContain("custom-root");
        });

        scopedIt("applies themeOverride to each bar", () => {
            const wrapper = mount(LoadingSkeletonGhost, {
                props: {
                    bars: [50, 80],
                    themeOverride: { LoadingSkeletonGhost: { bar: { class: "custom-bar" } } },
                },
            });
            const bars = wrapper.findAll('[data-slot="skeleton"]');
            bars.forEach((b) => expect(b.classes()).toContain("custom-bar"));
        });
    });

    describe("reactivity", () => {
        scopedIt("re-renders when bars prop changes", async () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { bars: [50, 80] } });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(2);
            await wrapper.setProps({ bars: [30, 60, 90] });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(3);
        });

        scopedIt("switches to pattern bars when pattern prop is set", async () => {
            const wrapper = mount(LoadingSkeletonGhost, { props: { bars: [10, 20] } });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(2);
            await wrapper.setProps({ pattern: "table" });
            expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(4);
        });
    });
});
