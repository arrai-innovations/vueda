import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (slot) => `theme-${slot}` });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

describe("lib/display/boolean-display/BooleanDisplay.vue", () => {
    let BooleanDisplay;

    beforeEach(async () => {
        BooleanDisplay = (await import("@vueda/display/boolean-display/BooleanDisplay.vue")).default;
    });

    describe("Word rendering", () => {
        scopedIt("renders the true label for a true value", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: true } });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("Yes");
        });

        scopedIt("renders the false label for a false value", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: false } });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("No");
        });

        scopedIt("takes custom labels", () => {
            const wrapper = mount(BooleanDisplay, {
                props: { value: false, trueLabel: "Enabled", falseLabel: "Disabled" },
            });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("Disabled");
        });
    });

    describe("Empty and coerced values", () => {
        scopedIt.each([
            ["null", null],
            ["undefined", undefined],
            ["an empty string", ""],
        ])("renders the dash for %s", (_label, value) => {
            const wrapper = mount(BooleanDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="boolean-display-dash"]').text()).toBe("-");
            expect(wrapper.find('[data-qa="boolean-display-value"]').exists()).toBe(false);
        });

        // A serializer may send a boolean as a number or a string; neither should fall
        // through to the dash, which means "no value recorded".
        scopedIt.each([
            ["the number 1", 1, "Yes"],
            ["the number 0", 0, "No"],
            ['the string "true"', "true", "Yes"],
            ['the string "false"', "false", "No"],
        ])("renders a word for %s", (_label, value, expected) => {
            const wrapper = mount(BooleanDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe(expected);
        });
    });

    describe("Option labels", () => {
        const options = [
            { label: "Submitted", value: true },
            { label: "-", value: false },
            { label: "Unknown", value: null },
        ];

        scopedIt.each([
            ["true", true, "Submitted"],
            ["false", false, "-"],
            ['the string "false"', "false", "-"],
        ])("renders the matching option's label for %s", (_label, value, expected) => {
            const wrapper = mount(BooleanDisplay, { props: { value, options } });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe(expected);
        });

        scopedIt("renders a null value's option label in place of the dash", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: null, options } });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("Unknown");
            expect(wrapper.find('[data-qa="boolean-display-dash"]').exists()).toBe(false);
        });

        scopedIt("renders the dash for a null value that matches no option", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: null, options: options.slice(0, 2) } });
            expect(wrapper.get('[data-qa="boolean-display-dash"]').text()).toBe("-");
        });

        scopedIt("renders the true label for a value that matches no option", () => {
            const wrapper = mount(BooleanDisplay, {
                props: { value: true, trueLabel: "Enabled", options: [{ label: "Off", value: false }] },
            });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("Enabled");
        });

        scopedIt("renders the true label for an option without a label", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: true, options: [{ value: true }] } });
            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("Yes");
        });
    });

    describe("Layout", () => {
        scopedIt("wraps in a div by default", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: true } });
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("wraps in a span when inline", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: true, inline: true } });
            expect(wrapper.element.tagName).toBe("SPAN");
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(BooleanDisplay, { props: { value: true, class: "my-class" } });
            expect(wrapper.classes()).toContain("my-class");
        });
    });
});
