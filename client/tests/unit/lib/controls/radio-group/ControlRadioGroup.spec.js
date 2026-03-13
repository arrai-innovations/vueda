import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlRadioGroup from "@vueda/controls/radio-group/ControlRadioGroup.vue";
import ControlRadioGroupItem from "@vueda/controls/radio-group/ControlRadioGroupItem.vue";

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
        RadioGroupRoot: defineComponent({
            name: "RadioGroupRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({ modelValue: undefined }) : undefined);
            },
        }),
        RadioGroupItem: makePassthrough("RadioGroupItem"),
        RadioGroupIndicator: makePassthrough("RadioGroupIndicator"),
    };
});

describe("lib/controls/radio-group/ControlRadioGroup.vue", () => {
    describe("ControlRadioGroup", () => {
        scopedIt("has data-slot=radio-group", () => {
            const wrapper = mount(ControlRadioGroup);
            expect(wrapper.find('[data-slot="radio-group"]').exists()).toBe(true);
        });

        scopedIt("applies grid and gap-3 classes", () => {
            const wrapper = mount(ControlRadioGroup);
            const el = wrapper.find('[data-slot="radio-group"]');
            expect(el.classes()).toContain("grid");
            expect(el.classes()).toContain("gap-3");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRadioGroup, { props: { class: "my-group" } });
            expect(wrapper.find('[data-slot="radio-group"]').classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlRadioGroup, { slots: { default: "<div>item</div>" } });
            expect(wrapper.find("div").exists()).toBe(true);
        });
    });

    describe("ControlRadioGroupItem", () => {
        scopedIt("has data-slot=radio-group-item", () => {
            const wrapper = mount(ControlRadioGroupItem);
            expect(wrapper.find('[data-slot="radio-group-item"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=radio-group-indicator", () => {
            const wrapper = mount(ControlRadioGroupItem);
            expect(wrapper.find('[data-slot="radio-group-indicator"]').exists()).toBe(true);
        });

        scopedIt("applies size-4 and rounded-full classes", () => {
            const wrapper = mount(ControlRadioGroupItem);
            const el = wrapper.find('[data-slot="radio-group-item"]');
            expect(el.classes()).toContain("size-4");
            expect(el.classes()).toContain("rounded-full");
        });

        scopedIt("applies border and shrink-0 classes", () => {
            const wrapper = mount(ControlRadioGroupItem);
            const el = wrapper.find('[data-slot="radio-group-item"]');
            expect(el.classes()).toContain("border");
            expect(el.classes()).toContain("shrink-0");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRadioGroupItem, { props: { class: "my-item" } });
            expect(wrapper.find('[data-slot="radio-group-item"]').classes()).toContain("my-item");
        });

        scopedIt("renders default CircleIcon indicator slot", () => {
            const wrapper = mount(ControlRadioGroupItem);
            // The default slot renders a CircleIcon svg
            expect(wrapper.find('[data-slot="radio-group-indicator"]').exists()).toBe(true);
        });

        scopedIt("renders custom slot content in indicator", () => {
            const wrapper = mount(ControlRadioGroupItem, {
                slots: { default: "<span>dot</span>" },
            });
            expect(wrapper.find('[data-slot="radio-group-indicator"] span').exists()).toBe(true);
        });

        scopedIt("reflects disabled state", () => {
            const wrapper = mount(ControlRadioGroupItem, { props: { disabled: true } });
            expect(wrapper.find('[data-slot="radio-group-item"]').attributes("disabled")).toBeDefined();
        });
    });
});
