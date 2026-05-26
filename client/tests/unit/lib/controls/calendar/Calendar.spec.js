import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Calendar from "@vueda/controls/calendar/Calendar.vue";
import CalendarCell from "@vueda/controls/calendar/CalendarCell.vue";
import CalendarCellTrigger from "@vueda/controls/calendar/CalendarCellTrigger.vue";
import CalendarGrid from "@vueda/controls/calendar/CalendarGrid.vue";
import CalendarGridBody from "@vueda/controls/calendar/CalendarGridBody.vue";
import CalendarGridHead from "@vueda/controls/calendar/CalendarGridHead.vue";
import CalendarGridRow from "@vueda/controls/calendar/CalendarGridRow.vue";
import CalendarHeadCell from "@vueda/controls/calendar/CalendarHeadCell.vue";
import CalendarHeader from "@vueda/controls/calendar/CalendarHeader.vue";
import CalendarHeading from "@vueda/controls/calendar/CalendarHeading.vue";
import CalendarNextButton from "@vueda/controls/calendar/CalendarNextButton.vue";
import CalendarPrevButton from "@vueda/controls/calendar/CalendarPrevButton.vue";

// CalendarRoot and all calendar sub-primitives require internal CalendarRoot context.
// Stub them as passthrough divs so each Calendar* wrapper can be tested in isolation.
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

describe("lib/controls/calendar/Calendar.vue", () => {
    describe("Calendar", () => {
        scopedIt("has data-slot=calendar on the root element", () => {
            const wrapper = mount(Calendar);
            expect(wrapper.find('[data-slot="calendar"]').exists()).toBe(true);
        });

        scopedIt("applies base padding class", () => {
            const wrapper = mount(Calendar);
            expect(wrapper.find('[data-slot="calendar"]').classes()).toContain("p-3");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(Calendar, { props: { class: "my-calendar" } });
            expect(wrapper.find('[data-slot="calendar"]').classes()).toContain("my-calendar");
        });
    });

    describe("Calendar layout variants", () => {
        scopedIt("renders default heading when no layout is set", () => {
            const wrapper = mount(Calendar);
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(true);
            expect(wrapper.find('[data-slot="native-select"]').exists()).toBe(false);
        });

        scopedIt("renders month and year selects with layout=month-and-year", () => {
            const wrapper = mount(Calendar, { props: { layout: "month-and-year" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(false);
            expect(wrapper.findAll('[data-slot="native-select"]').length).toBe(2);
        });

        scopedIt("renders month select with layout=month-only", () => {
            const wrapper = mount(Calendar, { props: { layout: "month-only" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(false);
            expect(wrapper.findAll('[data-slot="native-select"]').length).toBe(1);
        });

        scopedIt("renders year select with layout=year-only", () => {
            const wrapper = mount(Calendar, { props: { layout: "year-only" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(false);
            expect(wrapper.findAll('[data-slot="native-select"]').length).toBe(1);
        });
    });

    describe("CalendarHeader", () => {
        scopedIt("has data-slot=calendar-header", () => {
            const wrapper = mount(CalendarHeader);
            expect(wrapper.find('[data-slot="calendar-header"]').exists()).toBe(true);
        });

        scopedIt("applies layout classes", () => {
            const wrapper = mount(CalendarHeader);
            const el = wrapper.find('[data-slot="calendar-header"]');
            expect(el.classes()).toContain("flex");
            expect(el.classes()).toContain("justify-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarHeader, { props: { class: "my-header" } });
            expect(wrapper.find('[data-slot="calendar-header"]').classes()).toContain("my-header");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(CalendarHeader, { slots: { default: "<span>Nav</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("CalendarHeading", () => {
        scopedIt("has data-slot=calendar-heading", () => {
            const wrapper = mount(CalendarHeading);
            expect(wrapper.find('[data-slot="calendar-heading"]').exists()).toBe(true);
        });

        scopedIt("applies font classes", () => {
            const wrapper = mount(CalendarHeading);
            const el = wrapper.find('[data-slot="calendar-heading"]');
            expect(el.classes()).toContain("text-sm");
            expect(el.classes()).toContain("font-medium");
        });

        scopedIt("renders the headingValue from slot context by default", () => {
            const wrapper = mount(CalendarHeading);
            expect(wrapper.text()).toContain("March 2026");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarHeading, { props: { class: "my-heading" } });
            expect(wrapper.find('[data-slot="calendar-heading"]').classes()).toContain("my-heading");
        });
    });

    describe("CalendarPrevButton", () => {
        scopedIt("has data-slot=calendar-prev-button", () => {
            const wrapper = mount(CalendarPrevButton);
            expect(wrapper.find('[data-slot="calendar-prev-button"]').exists()).toBe(true);
        });

        scopedIt("applies outline button and size classes", () => {
            const wrapper = mount(CalendarPrevButton);
            const el = wrapper.find('[data-slot="calendar-prev-button"]');
            expect(el.classes()).toContain("size-7");
            expect(el.classes()).toContain("bg-transparent");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarPrevButton, { props: { class: "my-prev" } });
            expect(wrapper.find('[data-slot="calendar-prev-button"]').classes()).toContain("my-prev");
        });
    });

    describe("CalendarNextButton", () => {
        scopedIt("has data-slot=calendar-next-button", () => {
            const wrapper = mount(CalendarNextButton);
            expect(wrapper.find('[data-slot="calendar-next-button"]').exists()).toBe(true);
        });

        scopedIt("applies size and opacity classes", () => {
            const wrapper = mount(CalendarNextButton);
            const el = wrapper.find('[data-slot="calendar-next-button"]');
            expect(el.classes()).toContain("size-7");
            expect(el.classes()).toContain("opacity-50");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarNextButton, { props: { class: "my-next" } });
            expect(wrapper.find('[data-slot="calendar-next-button"]').classes()).toContain("my-next");
        });
    });

    describe("CalendarGrid", () => {
        scopedIt("has data-slot=calendar-grid", () => {
            const wrapper = mount(CalendarGrid);
            expect(wrapper.find('[data-slot="calendar-grid"]').exists()).toBe(true);
        });

        scopedIt("applies w-full and border-collapse classes", () => {
            const wrapper = mount(CalendarGrid);
            const el = wrapper.find('[data-slot="calendar-grid"]');
            expect(el.classes()).toContain("w-full");
            expect(el.classes()).toContain("border-collapse");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarGrid, { props: { class: "my-grid" } });
            expect(wrapper.find('[data-slot="calendar-grid"]').classes()).toContain("my-grid");
        });
    });

    describe("CalendarGridHead", () => {
        scopedIt("has data-slot=calendar-grid-head", () => {
            const wrapper = mount(CalendarGridHead);
            expect(wrapper.find('[data-slot="calendar-grid-head"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(CalendarGridHead, { slots: { default: "<tr><th>Mo</th></tr>" } });
            expect(wrapper.find("th").exists()).toBe(true);
        });
    });

    describe("CalendarGridBody", () => {
        scopedIt("has data-slot=calendar-grid-body", () => {
            const wrapper = mount(CalendarGridBody);
            expect(wrapper.find('[data-slot="calendar-grid-body"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(CalendarGridBody, { slots: { default: "<tr></tr>" } });
            expect(wrapper.find("tr").exists()).toBe(true);
        });
    });

    describe("CalendarGridRow", () => {
        scopedIt("has data-slot=calendar-grid-row", () => {
            const wrapper = mount(CalendarGridRow);
            expect(wrapper.find('[data-slot="calendar-grid-row"]').exists()).toBe(true);
        });

        scopedIt("applies flex class", () => {
            const wrapper = mount(CalendarGridRow);
            expect(wrapper.find('[data-slot="calendar-grid-row"]').classes()).toContain("flex");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarGridRow, { props: { class: "my-row" } });
            expect(wrapper.find('[data-slot="calendar-grid-row"]').classes()).toContain("my-row");
        });
    });

    describe("CalendarHeadCell", () => {
        scopedIt("has data-slot=calendar-head-cell", () => {
            const wrapper = mount(CalendarHeadCell);
            expect(wrapper.find('[data-slot="calendar-head-cell"]').exists()).toBe(true);
        });

        scopedIt("applies muted text and font-normal classes", () => {
            const wrapper = mount(CalendarHeadCell);
            const el = wrapper.find('[data-slot="calendar-head-cell"]');
            expect(el.classes()).toContain("text-muted-foreground");
            expect(el.classes()).toContain("font-normal");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarHeadCell, { props: { class: "my-head-cell" } });
            expect(wrapper.find('[data-slot="calendar-head-cell"]').classes()).toContain("my-head-cell");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(CalendarHeadCell, { slots: { default: "Mo" } });
            expect(wrapper.text()).toBe("Mo");
        });
    });

    describe("CalendarCell", () => {
        scopedIt("has data-slot=calendar-cell", () => {
            const wrapper = mount(CalendarCell);
            expect(wrapper.find('[data-slot="calendar-cell"]').exists()).toBe(true);
        });

        scopedIt("applies relative and text-center classes", () => {
            const wrapper = mount(CalendarCell);
            const el = wrapper.find('[data-slot="calendar-cell"]');
            expect(el.classes()).toContain("relative");
            expect(el.classes()).toContain("text-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarCell, { props: { class: "my-cell" } });
            expect(wrapper.find('[data-slot="calendar-cell"]').classes()).toContain("my-cell");
        });
    });

    describe("CalendarCellTrigger", () => {
        scopedIt("has data-slot=calendar-cell-trigger", () => {
            const wrapper = mount(CalendarCellTrigger);
            expect(wrapper.find('[data-slot="calendar-cell-trigger"]').exists()).toBe(true);
        });

        scopedIt("applies size and cursor classes", () => {
            const wrapper = mount(CalendarCellTrigger);
            const el = wrapper.find('[data-slot="calendar-cell-trigger"]');
            expect(el.classes()).toContain("size-[var(--vueda-cal-day)]");
            expect(el.classes()).toContain("cursor-default");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CalendarCellTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.find('[data-slot="calendar-cell-trigger"]').classes()).toContain("my-trigger");
        });
    });
});
