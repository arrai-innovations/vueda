import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlTimeField from "@vueda/controls/time-field/ControlTimeField.vue";
import ControlTimeFieldInput from "@vueda/controls/time-field/ControlTimeFieldInput.vue";

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    return {
        ...actual,
        TimeFieldRoot: defineComponent({
            name: "TimeFieldRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({}) : undefined);
            },
        }),
        TimeFieldInput: defineComponent({
            name: "TimeFieldInput",
            setup(_, { slots, attrs }) {
                return () => h("span", attrs, slots.default ? slots.default({}) : undefined);
            },
        }),
    };
});

describe("lib/controls/time-field/ControlTimeField.vue", () => {
    describe("ControlTimeField", () => {
        scopedIt("has data-slot=time-field on the root element", () => {
            const wrapper = mount(ControlTimeField);
            expect(wrapper.find('[data-slot="time-field"]').exists()).toBe(true);
        });

        scopedIt("applies border and layout classes", () => {
            const wrapper = mount(ControlTimeField);
            const el = wrapper.find('[data-slot="time-field"]');
            expect(el.classes()).toContain("flex");
            expect(el.classes()).toContain("rounded-md");
            expect(el.classes()).toContain("border-input");
        });

        scopedIt("applies text-sm class", () => {
            const wrapper = mount(ControlTimeField);
            expect(wrapper.find('[data-slot="time-field"]').classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlTimeField, { props: { class: "my-time-field" } });
            expect(wrapper.find('[data-slot="time-field"]').classes()).toContain("my-time-field");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlTimeField, { slots: { default: "<span>segments</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlTimeFieldInput", () => {
        scopedIt("has data-slot=time-field-input", () => {
            const wrapper = mount(ControlTimeFieldInput, { props: { part: "hour" } });
            expect(wrapper.find('[data-slot="time-field-input"]').exists()).toBe(true);
        });

        scopedIt("passes part prop to the underlying element", () => {
            const wrapper = mount(ControlTimeFieldInput, { props: { part: "minute" } });
            expect(wrapper.find('[data-slot="time-field-input"]').attributes("part")).toBe("minute");
        });

        scopedIt("applies tabular-nums and caret-transparent classes", () => {
            const wrapper = mount(ControlTimeFieldInput, { props: { part: "hour" } });
            const el = wrapper.find('[data-slot="time-field-input"]');
            expect(el.classes()).toContain("tabular-nums");
            expect(el.classes()).toContain("caret-transparent");
        });

        scopedIt("applies text-center and inline classes", () => {
            const wrapper = mount(ControlTimeFieldInput, { props: { part: "hour" } });
            const el = wrapper.find('[data-slot="time-field-input"]');
            expect(el.classes()).toContain("text-center");
            expect(el.classes()).toContain("inline");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlTimeFieldInput, { props: { part: "hour", class: "my-segment" } });
            expect(wrapper.find('[data-slot="time-field-input"]').classes()).toContain("my-segment");
        });
    });
});
