import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { DateTime } from "luxon";

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => `theme-${k}` });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

let DateRangeDisplay;

beforeEach(async () => {
    vi.clearAllMocks();
    DateRangeDisplay = (await import("@vueda/display/date-display/DateRangeDisplay.vue")).default;
});

describe("lib/display/date-display/DateRangeDisplay.vue", () => {
    scopedIt("calls useTheme and applies classes", () => {
        const wrapper = mount(DateRangeDisplay, {
            props: { start: "2024-05-01", end: "2024-05-10" },
        });
        expect(mockedUseTheme).toHaveBeenCalledWith("DateRangeDisplay", expect.any(Object));
        const spans = wrapper.findAll("span");
        const root = spans[0];
        const from = spans[1];
        const separator = spans[2];
        const to = spans[3];
        expect(root.classes()).toContain("theme-root");
        expect(from.classes()).toContain("theme-from");
        expect(separator.classes()).toContain("theme-separator");
        expect(to.classes()).toContain("theme-to");
    });

    scopedIt.for([
        { start: "2024-05-01", end: "2024-05-10", expected: "May 1 – 10 2024" },
        { start: "2024-05-01", end: "2024-06-03", expected: "May 1 – Jun 3 2024" },
        { start: "2023-12-31", end: "2024-01-02", expected: "Dec 31 2023 – Jan 2 2024" },
        {
            start: DateTime.fromISO("2024-05-10T13:10:00"),
            end: DateTime.fromISO("2024-05-10T14:20:00"),
            showTime: true,
            expected: "May 10 2024, 1:10 p.m.",
        },
    ])("formats date ranges", ({ start, end, expected, showTime }) => {
        const wrapper = mount(DateRangeDisplay, {
            props: { start, end, showTime },
        });
        expect(wrapper.text().trim()).toBe(expected);
    });

    scopedIt("shows nothing for invalid dates", () => {
        const wrapper = mount(DateRangeDisplay, {
            props: { start: "bad", end: "nope" },
        });
        expect(wrapper.text().trim()).toBe("");
    });
});
