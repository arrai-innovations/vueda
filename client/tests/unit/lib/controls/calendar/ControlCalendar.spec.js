import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlCalendar from "@vueda/controls/calendar/ControlCalendar.vue";
import ControlCalendarCell from "@vueda/controls/calendar/ControlCalendarCell.vue";
import ControlCalendarCellTrigger from "@vueda/controls/calendar/ControlCalendarCellTrigger.vue";
import ControlCalendarGrid from "@vueda/controls/calendar/ControlCalendarGrid.vue";
import ControlCalendarGridBody from "@vueda/controls/calendar/ControlCalendarGridBody.vue";
import ControlCalendarGridHead from "@vueda/controls/calendar/ControlCalendarGridHead.vue";
import ControlCalendarGridRow from "@vueda/controls/calendar/ControlCalendarGridRow.vue";
import ControlCalendarHeadCell from "@vueda/controls/calendar/ControlCalendarHeadCell.vue";
import ControlCalendarHeader from "@vueda/controls/calendar/ControlCalendarHeader.vue";
import ControlCalendarHeading from "@vueda/controls/calendar/ControlCalendarHeading.vue";
import ControlCalendarNextButton from "@vueda/controls/calendar/ControlCalendarNextButton.vue";
import ControlCalendarPrevButton from "@vueda/controls/calendar/ControlCalendarPrevButton.vue";

// CalendarRoot and all calendar sub-primitives require internal CalendarRoot context.
// Stub them as passthrough divs so each ControlCalendar* wrapper can be tested in isolation.
vi.mock("reka-ui/date", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        createYear: () => [],
        createYearRange: () => [],
        toDate: () => new Date("2026-03-01"),
    };
});

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
        useDateFormatter: () => ({ custom: () => "Mar 2026" }),
        CalendarRoot: defineComponent({
            name: "CalendarRoot",
            setup(_, { slots, attrs }) {
                return () =>
                    h(
                        "div",
                        attrs,
                        slots.default
                            ? slots.default({ grid: [], weekDays: [], date: { month: 3, year: 2026 } })
                            : undefined,
                    );
            },
        }),
        CalendarCell: makePassthrough("CalendarCell"),
        CalendarCellTrigger: makePassthrough("CalendarCellTrigger"),
        CalendarGrid: makePassthrough("CalendarGrid"),
        CalendarGridBody: makePassthrough("CalendarGridBody"),
        CalendarGridHead: makePassthrough("CalendarGridHead"),
        CalendarGridRow: makePassthrough("CalendarGridRow"),
        CalendarHeadCell: makePassthrough("CalendarHeadCell"),
        CalendarHeader: makePassthrough("CalendarHeader"),
        CalendarHeading: defineComponent({
            name: "CalendarHeading",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({ headingValue: "March 2026" }) : undefined);
            },
        }),
        CalendarNext: makePassthrough("CalendarNext"),
        CalendarPrev: makePassthrough("CalendarPrev"),
    };
});

describe("lib/controls/calendar/ControlCalendar.vue", () => {
    describe("ControlCalendar", () => {
        scopedIt("has data-slot=calendar on the root element", () => {
            const wrapper = mount(ControlCalendar);
            expect(wrapper.find('[data-slot="calendar"]').exists()).toBe(true);
        });

        scopedIt("applies base padding class", () => {
            const wrapper = mount(ControlCalendar);
            expect(wrapper.find('[data-slot="calendar"]').classes()).toContain("p-3");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendar, { props: { class: "my-calendar" } });
            expect(wrapper.find('[data-slot="calendar"]').classes()).toContain("my-calendar");
        });
    });

    describe("ControlCalendar layout variants", () => {
        scopedIt("renders default heading when no layout is set", () => {
            const wrapper = mount(ControlCalendar);
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(true);
            expect(wrapper.find('[data-slot="native-select"]').exists()).toBe(false);
        });

        scopedIt("renders month and year selects with layout=month-and-year", () => {
            const wrapper = mount(ControlCalendar, { props: { layout: "month-and-year" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(false);
            expect(wrapper.findAll('[data-slot="native-select"]').length).toBe(2);
        });

        scopedIt("renders month select with layout=month-only", () => {
            const wrapper = mount(ControlCalendar, { props: { layout: "month-only" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(false);
            expect(wrapper.findAll('[data-slot="native-select"]').length).toBe(1);
        });

        scopedIt("renders year select with layout=year-only", () => {
            const wrapper = mount(ControlCalendar, { props: { layout: "year-only" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(false);
            expect(wrapper.findAll('[data-slot="native-select"]').length).toBe(1);
        });
    });

    describe("ControlCalendarHeader", () => {
        scopedIt("has data-slot=calendar-header", () => {
            const wrapper = mount(ControlCalendarHeader);
            expect(wrapper.find('[data-slot="calendar-header"]').exists()).toBe(true);
        });

        scopedIt("applies layout classes", () => {
            const wrapper = mount(ControlCalendarHeader);
            const el = wrapper.find('[data-slot="calendar-header"]');
            expect(el.classes()).toContain("flex");
            expect(el.classes()).toContain("justify-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarHeader, { props: { class: "my-header" } });
            expect(wrapper.find('[data-slot="calendar-header"]').classes()).toContain("my-header");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlCalendarHeader, { slots: { default: "<span>Nav</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlCalendarHeading", () => {
        scopedIt("has data-slot=calendar-heading", () => {
            const wrapper = mount(ControlCalendarHeading);
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(true);
        });

        scopedIt("applies font classes", () => {
            const wrapper = mount(ControlCalendarHeading);
            const el = wrapper.find('[data-slot="calendar-heading"]');
            expect(el.classes()).toContain("text-sm");
            expect(el.classes()).toContain("font-medium");
        });

        scopedIt("renders the headingValue from slot context by default", () => {
            const wrapper = mount(ControlCalendarHeading);
            expect(wrapper.text()).toContain("March 2026");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarHeading, { props: { class: "my-heading" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').classes()).toContain("my-heading");
        });
    });

    describe("ControlCalendarPrevButton", () => {
        scopedIt("has data-slot=calendar-prev-button", () => {
            const wrapper = mount(ControlCalendarPrevButton);
            expect(wrapper.find('[data-slot="calendar-prev-button"]').exists()).toBe(true);
        });

        scopedIt("applies outline button and size classes", () => {
            const wrapper = mount(ControlCalendarPrevButton);
            const el = wrapper.find('[data-slot="calendar-prev-button"]');
            expect(el.classes()).toContain("size-7");
            expect(el.classes()).toContain("bg-transparent");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarPrevButton, { props: { class: "my-prev" } });
            expect(wrapper.find('[data-slot="calendar-prev-button"]').classes()).toContain("my-prev");
        });
    });

    describe("ControlCalendarNextButton", () => {
        scopedIt("has data-slot=calendar-next-button", () => {
            const wrapper = mount(ControlCalendarNextButton);
            expect(wrapper.find('[data-slot="calendar-next-button"]').exists()).toBe(true);
        });

        scopedIt("applies size and opacity classes", () => {
            const wrapper = mount(ControlCalendarNextButton);
            const el = wrapper.find('[data-slot="calendar-next-button"]');
            expect(el.classes()).toContain("size-7");
            expect(el.classes()).toContain("opacity-50");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarNextButton, { props: { class: "my-next" } });
            expect(wrapper.find('[data-slot="calendar-next-button"]').classes()).toContain("my-next");
        });
    });

    describe("ControlCalendarGrid", () => {
        scopedIt("has data-slot=calendar-grid", () => {
            const wrapper = mount(ControlCalendarGrid);
            expect(wrapper.find('[data-slot="calendar-grid"]').exists()).toBe(true);
        });

        scopedIt("applies w-full and border-collapse classes", () => {
            const wrapper = mount(ControlCalendarGrid);
            const el = wrapper.find('[data-slot="calendar-grid"]');
            expect(el.classes()).toContain("w-full");
            expect(el.classes()).toContain("border-collapse");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarGrid, { props: { class: "my-grid" } });
            expect(wrapper.find('[data-slot="calendar-grid"]').classes()).toContain("my-grid");
        });
    });

    describe("ControlCalendarGridHead", () => {
        scopedIt("has data-slot=calendar-grid-head", () => {
            const wrapper = mount(ControlCalendarGridHead);
            expect(wrapper.find('[data-slot="calendar-grid-head"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlCalendarGridHead, { slots: { default: "<tr><th>Mo</th></tr>" } });
            expect(wrapper.find("th").exists()).toBe(true);
        });
    });

    describe("ControlCalendarGridBody", () => {
        scopedIt("has data-slot=calendar-grid-body", () => {
            const wrapper = mount(ControlCalendarGridBody);
            expect(wrapper.find('[data-slot="calendar-grid-body"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlCalendarGridBody, { slots: { default: "<tr></tr>" } });
            expect(wrapper.find("tr").exists()).toBe(true);
        });
    });

    describe("ControlCalendarGridRow", () => {
        scopedIt("has data-slot=calendar-grid-row", () => {
            const wrapper = mount(ControlCalendarGridRow);
            expect(wrapper.find('[data-slot="calendar-grid-row"]').exists()).toBe(true);
        });

        scopedIt("applies flex class", () => {
            const wrapper = mount(ControlCalendarGridRow);
            expect(wrapper.find('[data-slot="calendar-grid-row"]').classes()).toContain("flex");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarGridRow, { props: { class: "my-row" } });
            expect(wrapper.find('[data-slot="calendar-grid-row"]').classes()).toContain("my-row");
        });
    });

    describe("ControlCalendarHeadCell", () => {
        scopedIt("has data-slot=calendar-head-cell", () => {
            const wrapper = mount(ControlCalendarHeadCell);
            expect(wrapper.find('[data-slot="calendar-head-cell"]').exists()).toBe(true);
        });

        scopedIt("applies muted text and font-normal classes", () => {
            const wrapper = mount(ControlCalendarHeadCell);
            const el = wrapper.find('[data-slot="calendar-head-cell"]');
            expect(el.classes()).toContain("text-muted-foreground");
            expect(el.classes()).toContain("font-normal");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarHeadCell, { props: { class: "my-head-cell" } });
            expect(wrapper.find('[data-slot="calendar-head-cell"]').classes()).toContain("my-head-cell");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlCalendarHeadCell, { slots: { default: "Mo" } });
            expect(wrapper.text()).toBe("Mo");
        });
    });

    describe("ControlCalendarCell", () => {
        scopedIt("has data-slot=calendar-cell", () => {
            const wrapper = mount(ControlCalendarCell);
            expect(wrapper.find('[data-slot="calendar-cell"]').exists()).toBe(true);
        });

        scopedIt("applies relative and text-center classes", () => {
            const wrapper = mount(ControlCalendarCell);
            const el = wrapper.find('[data-slot="calendar-cell"]');
            expect(el.classes()).toContain("relative");
            expect(el.classes()).toContain("text-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarCell, { props: { class: "my-cell" } });
            expect(wrapper.find('[data-slot="calendar-cell"]').classes()).toContain("my-cell");
        });
    });

    describe("ControlCalendarCellTrigger", () => {
        scopedIt("has data-slot=calendar-cell-trigger", () => {
            const wrapper = mount(ControlCalendarCellTrigger);
            expect(wrapper.find('[data-slot="calendar-cell-trigger"]').exists()).toBe(true);
        });

        scopedIt("applies size and cursor classes", () => {
            const wrapper = mount(ControlCalendarCellTrigger);
            const el = wrapper.find('[data-slot="calendar-cell-trigger"]');
            expect(el.classes()).toContain("size-8");
            expect(el.classes()).toContain("cursor-default");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCalendarCellTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.find('[data-slot="calendar-cell-trigger"]').classes()).toContain("my-trigger");
        });
    });
});
