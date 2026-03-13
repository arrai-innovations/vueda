import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlRangeCalendar from "@vueda/controls/range-calendar/ControlRangeCalendar.vue";
import ControlRangeCalendarCell from "@vueda/controls/range-calendar/ControlRangeCalendarCell.vue";
import ControlRangeCalendarCellTrigger from "@vueda/controls/range-calendar/ControlRangeCalendarCellTrigger.vue";
import ControlRangeCalendarGrid from "@vueda/controls/range-calendar/ControlRangeCalendarGrid.vue";
import ControlRangeCalendarGridBody from "@vueda/controls/range-calendar/ControlRangeCalendarGridBody.vue";
import ControlRangeCalendarGridHead from "@vueda/controls/range-calendar/ControlRangeCalendarGridHead.vue";
import ControlRangeCalendarGridRow from "@vueda/controls/range-calendar/ControlRangeCalendarGridRow.vue";
import ControlRangeCalendarHeadCell from "@vueda/controls/range-calendar/ControlRangeCalendarHeadCell.vue";
import ControlRangeCalendarHeader from "@vueda/controls/range-calendar/ControlRangeCalendarHeader.vue";
import ControlRangeCalendarHeading from "@vueda/controls/range-calendar/ControlRangeCalendarHeading.vue";
import ControlRangeCalendarNextButton from "@vueda/controls/range-calendar/ControlRangeCalendarNextButton.vue";
import ControlRangeCalendarPrevButton from "@vueda/controls/range-calendar/ControlRangeCalendarPrevButton.vue";

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

describe("lib/controls/range-calendar/ControlRangeCalendar.vue", () => {
    describe("ControlRangeCalendar", () => {
        scopedIt("has data-slot=range-calendar", () => {
            const wrapper = mount(ControlRangeCalendar);
            expect(wrapper.find('[data-slot="range-calendar"]').exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendar, { props: { class: "my-calendar" } });
            expect(wrapper.find('[data-slot="range-calendar"]').classes()).toContain("my-calendar");
        });
    });

    describe("ControlRangeCalendarCell", () => {
        scopedIt("has data-slot=range-calendar-cell", () => {
            const wrapper = mount(ControlRangeCalendarCell);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-cell");
        });

        scopedIt("applies p-0 and text-sm classes", () => {
            const wrapper = mount(ControlRangeCalendarCell);
            expect(wrapper.classes()).toContain("p-0");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarCell, { props: { class: "my-cell" } });
            expect(wrapper.classes()).toContain("my-cell");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlRangeCalendarCell, { slots: { default: "<span>day</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlRangeCalendarCellTrigger", () => {
        scopedIt("has data-slot=range-calendar-trigger", () => {
            const wrapper = mount(ControlRangeCalendarCellTrigger);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-trigger");
        });

        scopedIt("applies h-8 and w-8 classes", () => {
            const wrapper = mount(ControlRangeCalendarCellTrigger);
            expect(wrapper.classes()).toContain("h-8");
            expect(wrapper.classes()).toContain("w-8");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarCellTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.classes()).toContain("my-trigger");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlRangeCalendarCellTrigger, { slots: { default: "<span>1</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlRangeCalendarGrid", () => {
        scopedIt("has data-slot=range-calendar-grid", () => {
            const wrapper = mount(ControlRangeCalendarGrid);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid");
        });

        scopedIt("applies w-full class", () => {
            const wrapper = mount(ControlRangeCalendarGrid);
            expect(wrapper.classes()).toContain("w-full");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarGrid, { props: { class: "my-grid" } });
            expect(wrapper.classes()).toContain("my-grid");
        });
    });

    describe("ControlRangeCalendarGridBody", () => {
        scopedIt("has data-slot=range-calendar-grid-body", () => {
            const wrapper = mount(ControlRangeCalendarGridBody);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid-body");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlRangeCalendarGridBody, { slots: { default: "<tr><td>x</td></tr>" } });
            expect(wrapper.find("tr").exists()).toBe(true);
        });
    });

    describe("ControlRangeCalendarGridHead", () => {
        scopedIt("has data-slot=range-calendar-grid-head", () => {
            const wrapper = mount(ControlRangeCalendarGridHead);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid-head");
        });
    });

    describe("ControlRangeCalendarGridRow", () => {
        scopedIt("has data-slot=range-calendar-grid-row", () => {
            const wrapper = mount(ControlRangeCalendarGridRow);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-grid-row");
        });

        scopedIt("applies flex class", () => {
            const wrapper = mount(ControlRangeCalendarGridRow);
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarGridRow, { props: { class: "my-row" } });
            expect(wrapper.classes()).toContain("my-row");
        });
    });

    describe("ControlRangeCalendarHeadCell", () => {
        scopedIt("has data-slot=range-calendar-head-cell", () => {
            const wrapper = mount(ControlRangeCalendarHeadCell);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-head-cell");
        });

        scopedIt("applies text-muted-foreground class", () => {
            const wrapper = mount(ControlRangeCalendarHeadCell);
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarHeadCell, { props: { class: "my-head-cell" } });
            expect(wrapper.classes()).toContain("my-head-cell");
        });
    });

    describe("ControlRangeCalendarHeader", () => {
        scopedIt("has data-slot=range-calendar-header", () => {
            const wrapper = mount(ControlRangeCalendarHeader);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-header");
        });

        scopedIt("applies flex class", () => {
            const wrapper = mount(ControlRangeCalendarHeader);
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarHeader, { props: { class: "my-header" } });
            expect(wrapper.classes()).toContain("my-header");
        });
    });

    describe("ControlRangeCalendarHeading", () => {
        scopedIt("has data-slot=range-calendar-heading", () => {
            const wrapper = mount(ControlRangeCalendarHeading);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-heading");
        });

        scopedIt("applies text-sm class", () => {
            const wrapper = mount(ControlRangeCalendarHeading);
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("renders headingValue by default", () => {
            const wrapper = mount(ControlRangeCalendarHeading);
            expect(wrapper.text()).toContain("January 2024");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarHeading, { props: { class: "my-heading" } });
            expect(wrapper.classes()).toContain("my-heading");
        });
    });

    describe("ControlRangeCalendarNextButton", () => {
        scopedIt("has data-slot=range-calendar-next-button", () => {
            const wrapper = mount(ControlRangeCalendarNextButton);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-next-button");
        });

        scopedIt("applies size-7 class", () => {
            const wrapper = mount(ControlRangeCalendarNextButton);
            expect(wrapper.classes()).toContain("size-7");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarNextButton, { props: { class: "my-next" } });
            expect(wrapper.classes()).toContain("my-next");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(ControlRangeCalendarNextButton, { slots: { default: "<span>›</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlRangeCalendarPrevButton", () => {
        scopedIt("has data-slot=range-calendar-prev-button", () => {
            const wrapper = mount(ControlRangeCalendarPrevButton);
            expect(wrapper.attributes("data-slot")).toBe("range-calendar-prev-button");
        });

        scopedIt("applies size-7 class", () => {
            const wrapper = mount(ControlRangeCalendarPrevButton);
            expect(wrapper.classes()).toContain("size-7");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlRangeCalendarPrevButton, { props: { class: "my-prev" } });
            expect(wrapper.classes()).toContain("my-prev");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(ControlRangeCalendarPrevButton, { slots: { default: "<span>‹</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });
});
