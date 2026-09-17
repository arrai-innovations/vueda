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

        scopedIt("applies field-line and layout classes", () => {
            const wrapper = mount(DateField);
            const el = wrapper.find('[data-slot="date-field"]');
            expect(el.classes()).toContain("flex");
            expect(el.classes()).toContain("rounded-vueda-field");
            expect(el.classes()).toContain("field-line");
        });

        scopedIt("applies text-sm class", () => {
            const wrapper = mount(DateField);
            expect(wrapper.find('[data-slot="date-field"]').classes()).toContain("text-sm");
        });

        scopedIt("applies the field fill", () => {
            const wrapper = mount(DateField);
            expect(wrapper.find('[data-slot="date-field"]').classes()).toContain("bg-field");
        });

        scopedIt("applies aria-invalid destructive ring classes", () => {
            const wrapper = mount(DateField);
            const classes = wrapper.find('[data-slot="date-field"]').classes();
            expect(classes).toContain("aria-invalid:hairline-destructive");
            expect(classes).toContain("focus-within:aria-invalid:focus-ring-shadow-destructive");
        });

        scopedIt("applies default size geometry", () => {
            const wrapper = mount(DateField);
            const classes = wrapper.find('[data-slot="date-field"]').classes();
            expect(classes).toContain("h-vueda-control");
            expect(classes).toContain("px-vueda-control-px");
        });

        scopedIt("applies sm size geometry", () => {
            const wrapper = mount(DateField, { props: { size: "sm" } });
            const classes = wrapper.find('[data-slot="date-field"]').classes();
            expect(classes).toContain("h-vueda-control-sm");
            expect(classes).toContain("px-vueda-control-px-sm");
        });

        scopedIt("applies lg size geometry", () => {
            const wrapper = mount(DateField, { props: { size: "lg" } });
            const classes = wrapper.find('[data-slot="date-field"]').classes();
            expect(classes).toContain("h-vueda-control-lg");
            expect(classes).toContain("px-vueda-control-px-lg");
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

        scopedIt("applies mono / medium / slashed-zero feature settings and caret-transparent classes", () => {
            const wrapper = mount(DateFieldInput, { props: { part: "year" } });
            const el = wrapper.find('[data-slot="date-field-input"]');
            expect(el.classes()).toContain("font-mono");
            expect(el.classes()).toContain("font-medium");
            expect(el.classes()).toContain("[font-feature-settings:'tnum','zero']");
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
