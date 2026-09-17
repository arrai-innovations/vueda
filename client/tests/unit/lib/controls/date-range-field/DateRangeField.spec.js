import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import DateRangeField from "@vueda/controls/date-range-field/DateRangeField.vue";
import DateRangeFieldInput from "@vueda/controls/date-range-field/DateRangeFieldInput.vue";

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

describe("lib/controls/date-range-field/DateRangeField.vue", () => {
    describe("DateRangeField", () => {
        scopedIt("has data-slot=date-range-field on the root element", () => {
            const wrapper = mount(DateRangeField);
            expect(wrapper.find('[data-slot="date-range-field"]').exists()).toBe(true);
        });

        scopedIt("applies field-line and layout classes", () => {
            const wrapper = mount(DateRangeField);
            const el = wrapper.find('[data-slot="date-range-field"]');
            expect(el.classes()).toContain("flex");
            expect(el.classes()).toContain("rounded-vueda-field");
            expect(el.classes()).toContain("field-line");
        });

        scopedIt("applies text-sm class", () => {
            const wrapper = mount(DateRangeField);
            expect(wrapper.find('[data-slot="date-range-field"]').classes()).toContain("text-sm");
        });

        scopedIt("applies the field fill", () => {
            const wrapper = mount(DateRangeField);
            expect(wrapper.find('[data-slot="date-range-field"]').classes()).toContain("bg-field");
        });

        scopedIt("applies aria-invalid destructive ring classes", () => {
            const wrapper = mount(DateRangeField);
            const classes = wrapper.find('[data-slot="date-range-field"]').classes();
            expect(classes).toContain("aria-invalid:hairline-destructive");
            expect(classes).toContain("focus-within:aria-invalid:focus-ring-shadow-destructive");
        });

        scopedIt("applies default size geometry", () => {
            const wrapper = mount(DateRangeField);
            const classes = wrapper.find('[data-slot="date-range-field"]').classes();
            expect(classes).toContain("h-vueda-control");
            expect(classes).toContain("px-vueda-control-px");
        });

        scopedIt("applies sm size geometry", () => {
            const wrapper = mount(DateRangeField, { props: { size: "sm" } });
            const classes = wrapper.find('[data-slot="date-range-field"]').classes();
            expect(classes).toContain("h-vueda-control-sm");
            expect(classes).toContain("px-vueda-control-px-sm");
        });

        scopedIt("applies lg size geometry", () => {
            const wrapper = mount(DateRangeField, { props: { size: "lg" } });
            const classes = wrapper.find('[data-slot="date-range-field"]').classes();
            expect(classes).toContain("h-vueda-control-lg");
            expect(classes).toContain("px-vueda-control-px-lg");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(DateRangeField, { props: { class: "my-range-field" } });
            expect(wrapper.find('[data-slot="date-range-field"]').classes()).toContain("my-range-field");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(DateRangeField, { slots: { default: "<span>segments</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("DateRangeFieldInput", () => {
        scopedIt("has data-slot=date-range-field-input", () => {
            const wrapper = mount(DateRangeFieldInput, { props: { part: "day", type: "start" } });
            expect(wrapper.find('[data-slot="date-range-field-input"]').exists()).toBe(true);
        });

        scopedIt("passes part prop to the underlying element", () => {
            const wrapper = mount(DateRangeFieldInput, { props: { part: "month", type: "start" } });
            expect(wrapper.find('[data-slot="date-range-field-input"]').attributes("part")).toBe("month");
        });

        scopedIt("passes type prop to the underlying element", () => {
            const wrapper = mount(DateRangeFieldInput, { props: { part: "day", type: "end" } });
            expect(wrapper.find('[data-slot="date-range-field-input"]').attributes("type")).toBe("end");
        });

        scopedIt("applies mono / medium / slashed-zero feature settings and caret-transparent classes", () => {
            const wrapper = mount(DateRangeFieldInput, { props: { part: "year", type: "start" } });
            const el = wrapper.find('[data-slot="date-range-field-input"]');
            expect(el.classes()).toContain("font-mono");
            expect(el.classes()).toContain("font-medium");
            expect(el.classes()).toContain("[font-feature-settings:'tnum','zero']");
            expect(el.classes()).toContain("caret-transparent");
        });

        scopedIt("applies text-center and inline classes", () => {
            const wrapper = mount(DateRangeFieldInput, { props: { part: "day", type: "start" } });
            const el = wrapper.find('[data-slot="date-range-field-input"]');
            expect(el.classes()).toContain("text-center");
            expect(el.classes()).toContain("inline");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(DateRangeFieldInput, {
                props: { part: "day", type: "start", class: "my-segment" },
            });
            expect(wrapper.find('[data-slot="date-range-field-input"]').classes()).toContain("my-segment");
        });
    });
});
