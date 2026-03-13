import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlSlider from "@vueda/controls/slider/ControlSlider.vue";

// SliderRoot and SliderThumb use ResizeObserver which is not available in jsdom.
// Stub them as passthrough divs so wrapper behavior can be tested in isolation.
vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const makePassthrough = (name) =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({ modelValue: [25, 75] }) : undefined);
            },
        });
    return {
        ...actual,
        SliderRoot: makePassthrough("SliderRoot"),
        SliderTrack: makePassthrough("SliderTrack"),
        SliderRange: makePassthrough("SliderRange"),
        SliderThumb: makePassthrough("SliderThumb"),
    };
});

describe("lib/controls/slider/ControlSlider.vue", () => {
    describe("rendering", () => {
        scopedIt("has data-slot=slider on the root element", () => {
            const wrapper = mount(ControlSlider, { props: { modelValue: [50], min: 0, max: 100 } });
            expect(wrapper.find('[data-slot="slider"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=slider-track inside the root", () => {
            const wrapper = mount(ControlSlider, { props: { modelValue: [50], min: 0, max: 100 } });
            expect(wrapper.find('[data-slot="slider-track"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=slider-range inside the track", () => {
            const wrapper = mount(ControlSlider, { props: { modelValue: [50], min: 0, max: 100 } });
            expect(wrapper.find('[data-slot="slider-range"]').exists()).toBe(true);
        });

        scopedIt("renders one thumb per value entry from slot context", () => {
            // SliderRoot mock exposes { modelValue: [25, 75] } in its default slot,
            // so the v-for in ControlSlider renders two thumbs.
            const wrapper = mount(ControlSlider, { props: { modelValue: [25, 75], min: 0, max: 100 } });
            expect(wrapper.findAll('[data-slot="slider-thumb"]')).toHaveLength(2);
        });

        scopedIt("applies base layout classes to the root", () => {
            const wrapper = mount(ControlSlider, { props: { modelValue: [0], min: 0, max: 100 } });
            const root = wrapper.find('[data-slot="slider"]');
            expect(root.classes()).toContain("flex");
            expect(root.classes()).toContain("w-full");
        });

        scopedIt("merges custom class on the root", () => {
            const wrapper = mount(ControlSlider, {
                props: { class: "my-slider", modelValue: [50], min: 0, max: 100 },
            });
            expect(wrapper.find('[data-slot="slider"]').classes()).toContain("my-slider");
        });
    });
});
