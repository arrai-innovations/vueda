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

    describe("Relative time refresh", () => {
        scopedIt("refreshes an older date once a minute, not every second", () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2024-01-01T01:00:00Z"));

            const wrapper = mount(DateTimeDisplay, { props: { value: "2024-01-01T00:00:00Z" } });

            expect(vi.getTimerCount()).toBe(1);
            wrapper.unmount();
        });

        scopedIt("refreshes a date under a minute old every second until it passes a minute", async () => {
            vi.useFakeTimers();
            const iso = "2024-01-01T00:00:00Z";
            vi.setSystemTime(new Date(Date.parse(iso) + 50_000));

            const wrapper = mount(DateTimeDisplay, { props: { value: iso } });
            expect(vi.getTimerCount()).toBe(2);

            await vi.advanceTimersByTimeAsync(15_000);
            expect(vi.getTimerCount()).toBe(1);
            expect(wrapper.text()).toContain("1 minute ago");
            wrapper.unmount();
        });

        scopedIt("keeps one quick refresh when the minute interval fires while one is pending", async () => {
            vi.useFakeTimers();
            const iso = "2024-01-01T00:00:00Z";
            // Thirty seconds ahead, so a quick refresh is pending when the minute interval fires.
            vi.setSystemTime(new Date(Date.parse(iso) - 30_000));

            const wrapper = mount(DateTimeDisplay, { props: { value: iso } });
            await vi.advanceTimersByTimeAsync(60_000);

            expect(vi.getTimerCount()).toBe(2);
            wrapper.unmount();
        });

        scopedIt("clears every timer on unmount", async () => {
            vi.useFakeTimers();
            const iso = "2024-01-01T00:00:00Z";
            vi.setSystemTime(new Date(Date.parse(iso) - 30_000));

            const wrapper = mount(DateTimeDisplay, { props: { value: iso } });
            await vi.advanceTimersByTimeAsync(60_000);
            wrapper.unmount();

            expect(vi.getTimerCount()).toBe(0);
        });
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
