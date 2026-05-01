import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import DateField from "@vueda/controls/date-field/DateField.vue";
import DateFieldInput from "@vueda/controls/date-field/DateFieldInput.vue";

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    return {
        ...actual,
        DateFieldRoot: defineComponent({
            name: "DateFieldRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({}) : undefined);
            },
        }),
        DateFieldInput: defineComponent({
            name: "DateFieldInput",
            setup(_, { slots, attrs }) {
                return () => h("span", attrs, slots.default ? slots.default({}) : undefined);
            },
        }),
    };
});

describe("lib/controls/date-field/DateField.vue", () => {
    describe("DateField", () => {
        scopedIt("has data-slot=date-field on the root element", () => {
            const wrapper = mount(DateField);
            expect(wrapper.find('[data-slot="date-field"]').exists()).toBe(true);
        });

        scopedIt("applies border and layout classes", () => {
            const wrapper = mount(DateField);
            const el = wrapper.find('[data-slot="date-field"]');
            expect(el.classes()).toContain("flex");
            expect(el.classes()).toContain("rounded-vueda-control");
            expect(el.classes()).toContain("border-input");
        });

        scopedIt("applies text-sm class", () => {
            const wrapper = mount(DateField);
            expect(wrapper.find('[data-slot="date-field"]').classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(DateField, { props: { class: "my-date-field" } });
            expect(wrapper.find('[data-slot="date-field"]').classes()).toContain("my-date-field");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(DateField, { slots: { default: "<span>segments</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("DateFieldInput", () => {
        scopedIt("has data-slot=date-field-input", () => {
            const wrapper = mount(DateFieldInput, { props: { part: "day" } });
            expect(wrapper.find('[data-slot="date-field-input"]').exists()).toBe(true);
        });

        scopedIt("passes part prop to the underlying element", () => {
            const wrapper = mount(DateFieldInput, { props: { part: "month" } });
            expect(wrapper.find('[data-slot="date-field-input"]').attributes("part")).toBe("month");
        });

        scopedIt("applies tabular-nums and caret-transparent classes", () => {
            const wrapper = mount(DateFieldInput, { props: { part: "year" } });
            const el = wrapper.find('[data-slot="date-field-input"]');
            expect(el.classes()).toContain("tabular-nums");
            expect(el.classes()).toContain("caret-transparent");
        });

        scopedIt("applies text-center and inline classes", () => {
            const wrapper = mount(DateFieldInput, { props: { part: "day" } });
            const el = wrapper.find('[data-slot="date-field-input"]');
            expect(el.classes()).toContain("text-center");
            expect(el.classes()).toContain("inline");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(DateFieldInput, { props: { part: "day", class: "my-segment" } });
            expect(wrapper.find('[data-slot="date-field-input"]').classes()).toContain("my-segment");
        });
    });
});
