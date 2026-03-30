import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlDateRangeField from "@vueda/controls/date-range-field/ControlDateRangeField.vue";
import ControlDateRangeFieldInput from "@vueda/controls/date-range-field/ControlDateRangeFieldInput.vue";

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    return {
        ...actual,
        DateRangeFieldRoot: defineComponent({
            name: "DateRangeFieldRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({}) : undefined);
            },
        }),
        DateRangeFieldInput: defineComponent({
            name: "DateRangeFieldInput",
            setup(_, { slots, attrs }) {
                return () => h("span", attrs, slots.default ? slots.default({}) : undefined);
            },
        }),
    };
});

describe("lib/controls/date-range-field/ControlDateRangeField.vue", () => {
    describe("ControlDateRangeField", () => {
        scopedIt("has data-slot=date-range-field on the root element", () => {
            const wrapper = mount(ControlDateRangeField);
            expect(wrapper.find('[data-slot="date-range-field"]').exists()).toBe(true);
        });

        scopedIt("applies border and layout classes", () => {
            const wrapper = mount(ControlDateRangeField);
            const el = wrapper.find('[data-slot="date-range-field"]');
            expect(el.classes()).toContain("flex");
            expect(el.classes()).toContain("rounded-md");
            expect(el.classes()).toContain("border-input");
        });

        scopedIt("applies text-sm class", () => {
            const wrapper = mount(ControlDateRangeField);
            expect(wrapper.find('[data-slot="date-range-field"]').classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlDateRangeField, { props: { class: "my-range-field" } });
            expect(wrapper.find('[data-slot="date-range-field"]').classes()).toContain("my-range-field");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlDateRangeField, { slots: { default: "<span>segments</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlDateRangeFieldInput", () => {
        scopedIt("has data-slot=date-range-field-input", () => {
            const wrapper = mount(ControlDateRangeFieldInput, { props: { part: "day", type: "start" } });
            expect(wrapper.find('[data-slot="date-range-field-input"]').exists()).toBe(true);
        });

        scopedIt("passes part prop to the underlying element", () => {
            const wrapper = mount(ControlDateRangeFieldInput, { props: { part: "month", type: "start" } });
            expect(wrapper.find('[data-slot="date-range-field-input"]').attributes("part")).toBe("month");
        });

        scopedIt("passes type prop to the underlying element", () => {
            const wrapper = mount(ControlDateRangeFieldInput, { props: { part: "day", type: "end" } });
            expect(wrapper.find('[data-slot="date-range-field-input"]').attributes("type")).toBe("end");
        });

        scopedIt("applies tabular-nums and caret-transparent classes", () => {
            const wrapper = mount(ControlDateRangeFieldInput, { props: { part: "year", type: "start" } });
            const el = wrapper.find('[data-slot="date-range-field-input"]');
            expect(el.classes()).toContain("tabular-nums");
            expect(el.classes()).toContain("caret-transparent");
        });

        scopedIt("applies text-center and inline classes", () => {
            const wrapper = mount(ControlDateRangeFieldInput, { props: { part: "day", type: "start" } });
            const el = wrapper.find('[data-slot="date-range-field-input"]');
            expect(el.classes()).toContain("text-center");
            expect(el.classes()).toContain("inline");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlDateRangeFieldInput, {
                props: { part: "day", type: "start", class: "my-segment" },
            });
            expect(wrapper.find('[data-slot="date-range-field-input"]').classes()).toContain("my-segment");
        });
    });
});
