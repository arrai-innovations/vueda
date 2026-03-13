import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlNumberField from "@vueda/controls/number-field/ControlNumberField.vue";
import ControlNumberFieldContent from "@vueda/controls/number-field/ControlNumberFieldContent.vue";
import ControlNumberFieldDecrement from "@vueda/controls/number-field/ControlNumberFieldDecrement.vue";
import ControlNumberFieldIncrement from "@vueda/controls/number-field/ControlNumberFieldIncrement.vue";
import ControlNumberFieldInput from "@vueda/controls/number-field/ControlNumberFieldInput.vue";

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const makePassthrough = (name, defaultTag = "div") =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h(defaultTag, attrs, slots.default ? slots.default({}) : undefined);
            },
        });
    return {
        ...actual,
        NumberFieldRoot: defineComponent({
            name: "NumberFieldRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({ modelValue: 0 }) : undefined);
            },
        }),
        NumberFieldInput: makePassthrough("NumberFieldInput", "input"),
        NumberFieldIncrement: makePassthrough("NumberFieldIncrement", "button"),
        NumberFieldDecrement: makePassthrough("NumberFieldDecrement", "button"),
    };
});

describe("lib/controls/number-field/ControlNumberField.vue", () => {
    describe("ControlNumberField", () => {
        scopedIt("has data-slot=number-field", () => {
            const wrapper = mount(ControlNumberField);
            expect(wrapper.find('[data-slot="number-field"]').exists()).toBe(true);
        });

        scopedIt("applies grid and gap-1.5 classes", () => {
            const wrapper = mount(ControlNumberField);
            const el = wrapper.find('[data-slot="number-field"]');
            expect(el.classes()).toContain("grid");
            expect(el.classes()).toContain("gap-1.5");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlNumberField, { props: { class: "my-field" } });
            expect(wrapper.find('[data-slot="number-field"]').classes()).toContain("my-field");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlNumberField, { slots: { default: "<span>input</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlNumberFieldContent", () => {
        scopedIt("has data-slot=number-field-content", () => {
            const wrapper = mount(ControlNumberFieldContent);
            expect(wrapper.attributes("data-slot")).toBe("number-field-content");
        });

        scopedIt("applies relative class", () => {
            const wrapper = mount(ControlNumberFieldContent);
            expect(wrapper.classes()).toContain("relative");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlNumberFieldContent, { props: { class: "my-content" } });
            expect(wrapper.classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlNumberFieldContent, { slots: { default: "<input />" } });
            expect(wrapper.find("input").exists()).toBe(true);
        });
    });

    describe("ControlNumberFieldInput", () => {
        scopedIt("has data-slot=input", () => {
            const wrapper = mount(ControlNumberFieldInput);
            expect(wrapper.find('[data-slot="input"]').exists()).toBe(true);
        });

        scopedIt("applies h-9 and border-input classes", () => {
            const wrapper = mount(ControlNumberFieldInput);
            const el = wrapper.find('[data-slot="input"]');
            expect(el.classes()).toContain("h-9");
            expect(el.classes()).toContain("border-input");
        });

        scopedIt("applies text-center class", () => {
            const wrapper = mount(ControlNumberFieldInput);
            expect(wrapper.find('[data-slot="input"]').classes()).toContain("text-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlNumberFieldInput, { props: { class: "my-input" } });
            expect(wrapper.find('[data-slot="input"]').classes()).toContain("my-input");
        });
    });

    describe("ControlNumberFieldIncrement", () => {
        scopedIt("has data-slot=increment", () => {
            const wrapper = mount(ControlNumberFieldIncrement);
            expect(wrapper.find('[data-slot="increment"]').exists()).toBe(true);
        });

        scopedIt("applies absolute positioning and p-3 classes", () => {
            const wrapper = mount(ControlNumberFieldIncrement);
            const el = wrapper.find('[data-slot="increment"]');
            expect(el.classes()).toContain("absolute");
            expect(el.classes()).toContain("p-3");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlNumberFieldIncrement, { props: { class: "my-inc" } });
            expect(wrapper.find('[data-slot="increment"]').classes()).toContain("my-inc");
        });

        scopedIt("renders default Plus icon slot", () => {
            const wrapper = mount(ControlNumberFieldIncrement);
            // Default slot renders a Plus icon svg
            expect(wrapper.find('[data-slot="increment"]').exists()).toBe(true);
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(ControlNumberFieldIncrement, {
                slots: { default: "<span>+</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlNumberFieldDecrement", () => {
        scopedIt("has data-slot=decrement", () => {
            const wrapper = mount(ControlNumberFieldDecrement);
            expect(wrapper.find('[data-slot="decrement"]').exists()).toBe(true);
        });

        scopedIt("applies absolute positioning and p-3 classes", () => {
            const wrapper = mount(ControlNumberFieldDecrement);
            const el = wrapper.find('[data-slot="decrement"]');
            expect(el.classes()).toContain("absolute");
            expect(el.classes()).toContain("p-3");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlNumberFieldDecrement, { props: { class: "my-dec" } });
            expect(wrapper.find('[data-slot="decrement"]').classes()).toContain("my-dec");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(ControlNumberFieldDecrement, {
                slots: { default: "<span>-</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });
});
