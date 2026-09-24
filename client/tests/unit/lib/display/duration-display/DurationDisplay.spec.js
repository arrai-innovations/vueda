import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (slot) => `theme-${slot}` });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

describe("lib/display/duration-display/DurationDisplay.vue", () => {
    let DurationDisplay;

    beforeEach(async () => {
        DurationDisplay = (await import("@vueda/display/duration-display/DurationDisplay.vue")).default;
    });

    const textFor = (props) => {
        const wrapper = mount(DurationDisplay, { props });
        return wrapper.get('[data-qa="duration-display-value"]').text();
    };

    describe("Unit wording", () => {
        // The reported defect: a read view printed the stored `730 00:00:00`.
        scopedIt("names only the units the value holds", () => {
            expect(textFor({ value: "730 00:00:00" })).toBe("730 days");
        });

        scopedIt("names every non-zero unit in order", () => {
            expect(textFor({ value: "1 04:05:06" })).toBe("1 day, 4 hours, 5 minutes, 6 seconds");
        });

        scopedIt("uses the singular unit for a count of one", () => {
            expect(textFor({ value: "00:01:00" })).toBe("1 minute");
        });

        scopedIt("reads a number of seconds, which is what DurationSecondsField sends", () => {
            expect(textFor({ value: 5025 })).toBe("1 hour, 23 minutes, 45 seconds");
        });

        scopedIt("signs a negative duration", () => {
            expect(textFor({ value: "-1 23:00:00" })).toBe("-1 hour");
        });

        // Zero is a recorded measurement, unlike an absent value, so it keeps a unit.
        scopedIt("names the smallest unit for a duration of zero", () => {
            expect(textFor({ value: "00:00:00" })).toBe("0 seconds");
        });

        scopedIt("abbreviates each unit in the short format", () => {
            expect(textFor({ value: "1 04:00:06", format: "short" })).toBe("1d 4h 6s");
        });
    });

    describe("Empty values", () => {
        scopedIt.each([
            ["null", null],
            ["undefined", undefined],
            ["an empty string", ""],
            ["unparseable text", "bad"],
        ])("renders the dash for %s", (_label, value) => {
            const wrapper = mount(DurationDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="duration-display-dash"]').text()).toBe("-");
            expect(wrapper.find('[data-qa="duration-display-value"]').exists()).toBe(false);
        });
    });

    describe("Layout", () => {
        scopedIt("wraps in a div by default", () => {
            const wrapper = mount(DurationDisplay, { props: { value: 60 } });
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("wraps in a span when inline", () => {
            const wrapper = mount(DurationDisplay, { props: { value: 60, inline: true } });
            expect(wrapper.element.tagName).toBe("SPAN");
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(DurationDisplay, { props: { value: 60, class: "my-class" } });
            expect(wrapper.classes()).toContain("my-class");
        });
    });
});
