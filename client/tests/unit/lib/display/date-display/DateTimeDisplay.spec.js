import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { DateTime } from "luxon";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "theme" });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

describe("lib/display/date-display/DateTimeDisplay.vue", () => {
    let DateTimeDisplay;

    beforeEach(async () => {
        DateTimeDisplay = (await import("@vueda/display/date-display/DateTimeDisplay.vue")).default;
        mockedUseTheme.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    scopedIt("displays inline format with relative time", () => {
        vi.useFakeTimers();
        const iso = "2024-01-01T00:00:00Z";
        vi.setSystemTime(new Date(Date.parse(iso) + 500));

        const wrapper = mount(DateTimeDisplay, { props: { value: iso } });
        const abs = DateTime.fromISO(iso)
            .setLocale("en-CA")
            .toLocaleString({ ...DateTime.DATETIME_SHORT, timeZoneName: "short" });

        expect(wrapper.text()).toBe(`${abs} (just now)`);
        expect(mockedUseTheme).toHaveBeenCalled();
    });

    scopedIt("renders absolute format with tooltip", () => {
        vi.useFakeTimers();
        const value = "2024-03-05T12:30:00Z";
        const now = "2024-03-05T12:31:00Z";
        vi.setSystemTime(new Date(now));

        const wrapper = mount(DateTimeDisplay, { props: { value, format: "absolute" } });
        const abs = DateTime.fromISO(value)
            .setLocale("en-CA")
            .toLocaleString({ ...DateTime.DATETIME_SHORT, timeZoneName: "short" });
        const rel = DateTime.fromISO(value)
            .setLocale("en-CA")
            .toRelative({ base: DateTime.fromISO(now) });

        const span = wrapper.get("span");
        expect(span.text()).toBe(abs);
        expect(span.attributes("title")).toBe(rel);
    });

    scopedIt("shows dash when date is invalid", () => {
        const wrapper = mount(DateTimeDisplay, { props: { value: "bad-date" } });
        expect(wrapper.text()).toBe("-");
    });
});
