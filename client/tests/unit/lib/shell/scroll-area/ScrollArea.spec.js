import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ScrollArea from "@vueda/shell/scroll-area/ScrollArea.vue";
import ScrollBar from "@vueda/shell/scroll-area/ScrollBar.vue";

// ScrollAreaScrollbar and ScrollAreaThumb use ResizeObserver which is not available
// in jsdom. Stub them as passthrough divs so wrapper behavior can be tested in isolation.
vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const makePassthrough = (name) =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({}) : undefined);
            },
        });
    return {
        ...actual,
        ScrollAreaScrollbar: makePassthrough("ScrollAreaScrollbar"),
        ScrollAreaThumb: makePassthrough("ScrollAreaThumb"),
    };
});

describe("lib/shell/scroll-area/ScrollArea.vue", () => {
    describe("ScrollArea", () => {
        scopedIt("has data-slot=scroll-area on the root", () => {
            const wrapper = mount(ScrollArea);
            expect(wrapper.attributes("data-slot")).toBe("scroll-area");
        });

        scopedIt("applies base relative class", () => {
            const wrapper = mount(ScrollArea);
            expect(wrapper.classes()).toContain("relative");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ScrollArea, { props: { class: "my-class" } });
            expect(wrapper.classes()).toContain("my-class");
            expect(wrapper.classes()).toContain("relative");
        });

        scopedIt("renders a viewport with data-slot=scroll-area-viewport", () => {
            const wrapper = mount(ScrollArea);
            expect(wrapper.find('[data-slot="scroll-area-viewport"]').exists()).toBe(true);
        });

        scopedIt("renders slot content inside the viewport", () => {
            const wrapper = mount(ScrollArea, {
                slots: { default: "<p>scrollable content</p>" },
            });
            const viewport = wrapper.find('[data-slot="scroll-area-viewport"]');
            expect(viewport.text()).toBe("scrollable content");
        });

        scopedIt("renders a scrollbar via ScrollBar", () => {
            const wrapper = mount(ScrollArea);
            expect(wrapper.find('[data-slot="scroll-area-scrollbar"]').exists()).toBe(true);
        });

        scopedIt("renders a scroll thumb", () => {
            const wrapper = mount(ScrollArea);
            expect(wrapper.find('[data-slot="scroll-area-thumb"]').exists()).toBe(true);
        });
    });

    describe("ScrollBar", () => {
        scopedIt("has data-slot=scroll-area-scrollbar", () => {
            const wrapper = mount(ScrollBar);
            expect(wrapper.attributes("data-slot")).toBe("scroll-area-scrollbar");
        });

        scopedIt("applies vertical layout classes by default", () => {
            const wrapper = mount(ScrollBar);
            expect(wrapper.classes()).toContain("w-2.5");
        });

        scopedIt("applies horizontal layout classes when orientation is horizontal", () => {
            const wrapper = mount(ScrollBar, { props: { orientation: "horizontal" } });
            expect(wrapper.classes()).toContain("h-2.5");
            expect(wrapper.classes()).not.toContain("w-2.5");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ScrollBar, { props: { class: "my-scrollbar" } });
            expect(wrapper.classes()).toContain("my-scrollbar");
        });

        scopedIt("renders a thumb with data-slot=scroll-area-thumb", () => {
            const wrapper = mount(ScrollBar);
            expect(wrapper.find('[data-slot="scroll-area-thumb"]').exists()).toBe(true);
        });
    });
});
