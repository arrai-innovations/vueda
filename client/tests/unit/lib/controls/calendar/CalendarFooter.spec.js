import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import CalendarFooter from "@vueda/controls/calendar/CalendarFooter.vue";

describe("lib/controls/calendar/CalendarFooter.vue", () => {
    scopedIt("has data-slot=calendar-footer on the root element", () => {
        const wrapper = mount(CalendarFooter);
        expect(wrapper.find('[data-slot="calendar-footer"]').exists()).toBe(true);
    });

    scopedIt("applies the layout, gap, and border-top classes", () => {
        const wrapper = mount(CalendarFooter);
        const classes = wrapper.find('[data-slot="calendar-footer"]').classes();
        expect(classes).toContain("flex");
        expect(classes).toContain("items-center");
        expect(classes).toContain("justify-between");
        expect(classes).toContain("gap-2");
        expect(classes).toContain("mt-2");
        expect(classes).toContain("pt-2");
        expect(classes).toContain("border-t-hairline");
    });

    scopedIt("renders the summary span with mono / slashed-zero classes by default", () => {
        const wrapper = mount(CalendarFooter, { slots: { summary: "Apr 10 – Apr 24" } });
        const summary = wrapper.find('[data-slot="calendar-footer-summary"]');
        expect(summary.exists()).toBe(true);
        const classes = summary.classes();
        expect(classes).toContain("font-mono");
        expect(classes).toContain("font-medium");
        expect(classes).toContain("text-muted-foreground");
        expect(classes).toContain("[font-feature-settings:'tnum','zero']");
        expect(summary.text()).toBe("Apr 10 – Apr 24");
    });

    scopedIt("renders the actions slot alongside the summary", () => {
        const wrapper = mount(CalendarFooter, {
            slots: { actions: '<button data-test="apply">Apply</button>' },
        });
        expect(wrapper.find('[data-test="apply"]').exists()).toBe(true);
    });

    scopedIt("default slot fully replaces the summary + actions layout", () => {
        const wrapper = mount(CalendarFooter, { slots: { default: '<div data-test="custom" />' } });
        expect(wrapper.find('[data-test="custom"]').exists()).toBe(true);
        expect(wrapper.find('[data-slot="calendar-footer-summary"]').exists()).toBe(false);
    });

    scopedIt("merges custom class on the root", () => {
        const wrapper = mount(CalendarFooter, { props: { class: "my-footer" } });
        expect(wrapper.find('[data-slot="calendar-footer"]').classes()).toContain("my-footer");
    });
});
