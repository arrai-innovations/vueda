import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import RangeCalendar from "@vueda/controls/range-calendar/RangeCalendar.vue";
import RangeCalendarCell from "@vueda/controls/range-calendar/RangeCalendarCell.vue";
import RangeCalendarCellTrigger from "@vueda/controls/range-calendar/RangeCalendarCellTrigger.vue";
import RangeCalendarGrid from "@vueda/controls/range-calendar/RangeCalendarGrid.vue";
import RangeCalendarGridBody from "@vueda/controls/range-calendar/RangeCalendarGridBody.vue";
import RangeCalendarGridHead from "@vueda/controls/range-calendar/RangeCalendarGridHead.vue";
import RangeCalendarGridRow from "@vueda/controls/range-calendar/RangeCalendarGridRow.vue";
import RangeCalendarHeadCell from "@vueda/controls/range-calendar/RangeCalendarHeadCell.vue";
import RangeCalendarHeader from "@vueda/controls/range-calendar/RangeCalendarHeader.vue";
import RangeCalendarHeading from "@vueda/controls/range-calendar/RangeCalendarHeading.vue";
import RangeCalendarNextButton from "@vueda/controls/range-calendar/RangeCalendarNextButton.vue";
import RangeCalendarPrevButton from "@vueda/controls/range-calendar/RangeCalendarPrevButton.vue";

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
        RangeCalendarRoot: defineComponent({
            name: "RangeCalendarRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({ grid: [], weekDays: [] }) : undefined);
            },
        }),
        RangeCalendarCell: makePassthrough("RangeCalendarCell"),
        RangeCalendarCellTrigger: makePassthrough("RangeCalendarCellTrigger", "button"),
        RangeCalendarGrid: makePassthrough("RangeCalendarGrid", "table"),
        RangeCalendarGridBody: makePassthrough("RangeCalendarGridBody", "tbody"),
        RangeCalendarGridHead: makePassthrough("RangeCalendarGridHead", "thead"),
        RangeCalendarGridRow: makePassthrough("RangeCalendarGridRow", "tr"),
        RangeCalendarHeadCell: makePassthrough("RangeCalendarHeadCell", "th"),
        RangeCalendarHeader: makePassthrough("RangeCalendarHeader"),
        RangeCalendarHeading: defineComponent({
            name: "RangeCalendarHeading",
            setup(_, { slots, attrs }) {
                return () =>
                    h("div", attrs, slots.default ? slots.default({ headingValue: "January 2024" }) : undefined);
            },
        }),
        RangeCalendarNext: makePassthrough("RangeCalendarNext", "button"),
        RangeCalendarPrev: makePassthrough("RangeCalendarPrev", "button"),
    };
});

describe("lib/controls/range-calendar/RangeCalendar.vue", () => {
    describe("RangeCalendar", () => {
        scopedIt("has data-slot=range-calendar", () => {
            const wrapper = mount(RangeCalendar);
            expect(wrapper.find('[data-slot="range-calendar"]').exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendar, { props: { class: "my-calendar" } });
            expect(wrapper.find('[data-slot="range-calendar"]').classes()).toContain("my-calendar");
        });
    });

    describe("RangeCalendarCell", () => {
        scopedIt("has data-slot=range-calendar-cell", () => {
            const wrapper = mount(RangeCalendarCell);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-cell");
        });

        scopedIt("applies p-0 and text-sm classes", () => {
            const wrapper = mount(RangeCalendarCell);
            expect(wrapper.classes()).toContain("p-0");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarCell, { props: { class: "my-cell" } });
            expect(wrapper.classes()).toContain("my-cell");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(RangeCalendarCell, { slots: { default: "<span>day</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("RangeCalendarCellTrigger", () => {
        scopedIt("has data-slot=range-calendar-trigger", () => {
            const wrapper = mount(RangeCalendarCellTrigger);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-trigger");
        });

        scopedIt("applies h-[var(--vueda-cal-day)] and w-[var(--vueda-cal-day)] classes", () => {
            const wrapper = mount(RangeCalendarCellTrigger);
            expect(wrapper.classes()).toContain("h-[var(--vueda-cal-day)]");
            expect(wrapper.classes()).toContain("w-[var(--vueda-cal-day)]");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarCellTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.classes()).toContain("my-trigger");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(RangeCalendarCellTrigger, { slots: { default: "<span>1</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("RangeCalendarGrid", () => {
        scopedIt("has data-slot=range-calendar-grid", () => {
            const wrapper = mount(RangeCalendarGrid);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid");
        });

        scopedIt("applies w-full class", () => {
            const wrapper = mount(RangeCalendarGrid);
            expect(wrapper.classes()).toContain("w-full");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarGrid, { props: { class: "my-grid" } });
            expect(wrapper.classes()).toContain("my-grid");
        });
    });

    describe("RangeCalendarGridBody", () => {
        scopedIt("has data-slot=range-calendar-grid-body", () => {
            const wrapper = mount(RangeCalendarGridBody);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid-body");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(RangeCalendarGridBody, { slots: { default: "<tr><td>x</td></tr>" } });
            expect(wrapper.find("tr").exists()).toBe(true);
        });
    });

    describe("RangeCalendarGridHead", () => {
        scopedIt("has data-slot=range-calendar-grid-head", () => {
            const wrapper = mount(RangeCalendarGridHead);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid-head");
        });
    });

    describe("RangeCalendarGridRow", () => {
        scopedIt("has data-slot=range-calendar-grid-row", () => {
            const wrapper = mount(RangeCalendarGridRow);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid-row");
        });

        scopedIt("applies flex class", () => {
            const wrapper = mount(RangeCalendarGridRow);
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarGridRow, { props: { class: "my-row" } });
            expect(wrapper.classes()).toContain("my-row");
        });
    });

    describe("RangeCalendarHeadCell", () => {
        scopedIt("has data-slot=range-calendar-head-cell", () => {
            const wrapper = mount(RangeCalendarHeadCell);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-head-cell");
        });

        scopedIt("applies text-muted-foreground class", () => {
            const wrapper = mount(RangeCalendarHeadCell);
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarHeadCell, { props: { class: "my-head-cell" } });
            expect(wrapper.classes()).toContain("my-head-cell");
        });
    });

    describe("RangeCalendarHeader", () => {
        scopedIt("has data-slot=range-calendar-header", () => {
            const wrapper = mount(RangeCalendarHeader);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-header");
        });

        scopedIt("applies flex class", () => {
            const wrapper = mount(RangeCalendarHeader);
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarHeader, { props: { class: "my-header" } });
            expect(wrapper.classes()).toContain("my-header");
        });
    });

    describe("RangeCalendarHeading", () => {
        scopedIt("has data-slot=range-calendar-heading", () => {
            const wrapper = mount(RangeCalendarHeading);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-heading");
        });

        scopedIt("applies text-sm class", () => {
            const wrapper = mount(RangeCalendarHeading);
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("renders headingValue by default", () => {
            const wrapper = mount(RangeCalendarHeading);
            expect(wrapper.text()).toContain("January 2024");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarHeading, { props: { class: "my-heading" } });
            expect(wrapper.classes()).toContain("my-heading");
        });
    });

    describe("RangeCalendarNextButton", () => {
        scopedIt("has data-slot=range-calendar-next-button", () => {
            const wrapper = mount(RangeCalendarNextButton);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-next-button");
        });

        scopedIt("applies size-7 class", () => {
            const wrapper = mount(RangeCalendarNextButton);
            expect(wrapper.classes()).toContain("size-7");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarNextButton, { props: { class: "my-next" } });
            expect(wrapper.classes()).toContain("my-next");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(RangeCalendarNextButton, { slots: { default: "<span>›</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("RangeCalendarPrevButton", () => {
        scopedIt("has data-slot=range-calendar-prev-button", () => {
            const wrapper = mount(RangeCalendarPrevButton);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-prev-button");
        });

        scopedIt("applies size-7 class", () => {
            const wrapper = mount(RangeCalendarPrevButton);
            expect(wrapper.classes()).toContain("size-7");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(RangeCalendarPrevButton, { props: { class: "my-prev" } });
            expect(wrapper.classes()).toContain("my-prev");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(RangeCalendarPrevButton, { slots: { default: "<span>‹</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });
});
