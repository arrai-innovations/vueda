import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import NumberField from "@vueda/controls/number-field/NumberField.vue";
import NumberFieldContent from "@vueda/controls/number-field/NumberFieldContent.vue";
import NumberFieldDecrement from "@vueda/controls/number-field/NumberFieldDecrement.vue";
import NumberFieldIncrement from "@vueda/controls/number-field/NumberFieldIncrement.vue";
import NumberFieldInput from "@vueda/controls/number-field/NumberFieldInput.vue";

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

describe("lib/controls/number-field/NumberField.vue", () => {
    describe("NumberField", () => {
        scopedIt("has data-slot=number-field", () => {
            const wrapper = mount(NumberField);
            expect(wrapper.find('[data-slot="number-field"]').exists()).toBe(true);
        });

        scopedIt("applies grid and gap-1.5 classes", () => {
            const wrapper = mount(NumberField);
            const el = wrapper.find('[data-slot="number-field"]');
            expect(el.classes()).toContain("grid");
            expect(el.classes()).toContain("gap-1.5");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NumberField, { props: { class: "my-field" } });
            expect(wrapper.find('[data-slot="number-field"]').classes()).toContain("my-field");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(NumberField, { slots: { default: "<span>input</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("NumberFieldContent", () => {
        scopedIt("has data-slot=number-field-content", () => {
            const wrapper = mount(NumberFieldContent);
            expect(wrapper.attributes("data-slot")).toBe("number-field-content");
        });

        scopedIt("applies relative class", () => {
            const wrapper = mount(NumberFieldContent);
            expect(wrapper.classes()).toContain("relative");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NumberFieldContent, { props: { class: "my-content" } });
            expect(wrapper.classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(NumberFieldContent, { slots: { default: "<input />" } });
            expect(wrapper.find("input").exists()).toBe(true);
        });
    });

    describe("NumberFieldInput", () => {
        scopedIt("has data-slot=input", () => {
            const wrapper = mount(NumberFieldInput);
            expect(wrapper.find('[data-slot="input"]').exists()).toBe(true);
        });

        scopedIt("applies h-9 and border-input classes", () => {
            const wrapper = mount(NumberFieldInput);
            const el = wrapper.find('[data-slot="input"]');
            expect(el.classes()).toContain("h-9");
            expect(el.classes()).toContain("border-input");
        });

        scopedIt("applies text-center class", () => {
            const wrapper = mount(NumberFieldInput);
            expect(wrapper.find('[data-slot="input"]').classes()).toContain("text-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NumberFieldInput, { props: { class: "my-input" } });
            expect(wrapper.find('[data-slot="input"]').classes()).toContain("my-input");
        });
    });

    describe("NumberFieldIncrement", () => {
        scopedIt("has data-slot=increment", () => {
            const wrapper = mount(NumberFieldIncrement);
            expect(wrapper.find('[data-slot="increment"]').exists()).toBe(true);
        });

        scopedIt("applies absolute positioning and p-3 classes", () => {
            const wrapper = mount(NumberFieldIncrement);
            const el = wrapper.find('[data-slot="increment"]');
            expect(el.classes()).toContain("absolute");
            expect(el.classes()).toContain("p-3");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NumberFieldIncrement, { props: { class: "my-inc" } });
            expect(wrapper.find('[data-slot="increment"]').classes()).toContain("my-inc");
        });

        scopedIt("renders default Plus icon slot", () => {
            const wrapper = mount(NumberFieldIncrement);
            // Default slot renders a Plus icon svg
            expect(wrapper.find('[data-slot="increment"]').exists()).toBe(true);
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(NumberFieldIncrement, {
                slots: { default: "<span>+</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("NumberFieldDecrement", () => {
        scopedIt("has data-slot=decrement", () => {
            const wrapper = mount(NumberFieldDecrement);
            expect(wrapper.find('[data-slot="decrement"]').exists()).toBe(true);
        });

        scopedIt("applies absolute positioning and p-3 classes", () => {
            const wrapper = mount(NumberFieldDecrement);
            const el = wrapper.find('[data-slot="decrement"]');
            expect(el.classes()).toContain("absolute");
            expect(el.classes()).toContain("p-3");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NumberFieldDecrement, { props: { class: "my-dec" } });
            expect(wrapper.find('[data-slot="decrement"]').classes()).toContain("my-dec");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(NumberFieldDecrement, {
                slots: { default: "<span>-</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });
});
