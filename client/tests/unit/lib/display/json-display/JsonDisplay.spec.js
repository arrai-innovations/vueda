import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (slot) => `theme-${slot}` });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

describe("lib/display/json-display/JsonDisplay.vue", () => {
    let JsonDisplay;

    beforeEach(async () => {
        JsonDisplay = (await import("@vueda/display/json-display/JsonDisplay.vue")).default;
    });

    const textFor = (props) => {
        const wrapper = mount(JsonDisplay, { props });
        return wrapper.get('[data-qa="json-display-value"]').text();
    };

    describe("Block form", () => {
        // The reported defect: a read view printed the whole payload on one line.
        scopedIt("indents a nested object over several lines", () => {
            const wrapper = mount(JsonDisplay, { props: { value: { a: 1, b: { c: 2 } } } });
            expect(wrapper.get('[data-qa="json-display-value"]').element.textContent).toBe(
                '{\n  "a": 1,\n  "b": {\n    "c": 2\n  }\n}',
            );
        });

        scopedIt("renders into a pre, so the indentation survives", () => {
            const wrapper = mount(JsonDisplay, { props: { value: { a: 1 } } });
            expect(wrapper.element.tagName).toBe("PRE");
            expect(wrapper.attributes("data-inline")).toBeUndefined();
        });

        scopedIt("takes a custom indent", () => {
            const wrapper = mount(JsonDisplay, { props: { value: { a: 1 }, indent: 4 } });
            expect(wrapper.get('[data-qa="json-display-value"]').element.textContent).toBe('{\n    "a": 1\n}');
        });

        // A read view exists to show the whole value, so the cap is the inline form's.
        scopedIt("never truncates", () => {
            const value = { note: "x".repeat(400) };
            const wrapper = mount(JsonDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="json-display-value"]').element.textContent).toContain("x".repeat(400));
        });
    });

    describe("Inline form", () => {
        scopedIt("renders compact, on one line", () => {
            expect(textFor({ value: { a: 1, b: { c: 2 } }, inline: true })).toBe('{"a":1,"b":{"c":2}}');
        });

        scopedIt("renders into a span, marked so the recipe can drop the block whitespace", () => {
            const wrapper = mount(JsonDisplay, { props: { value: { a: 1 }, inline: true } });
            expect(wrapper.element.tagName).toBe("SPAN");
            expect(wrapper.attributes("data-inline")).toBe("true");
        });

        scopedIt("truncates past maxLength", () => {
            const text = textFor({ value: { note: "x".repeat(400) }, inline: true });
            expect(text).toHaveLength(200);
            expect(text.endsWith("…")).toBe(true);
        });

        scopedIt("keeps the whole value when maxLength is zero", () => {
            const text = textFor({ value: { note: "x".repeat(400) }, inline: true, maxLength: 0 });
            expect(text).toContain("x".repeat(400));
        });
    });

    describe("Empty and edge values", () => {
        scopedIt.each([
            ["null", null],
            ["undefined", undefined],
        ])("renders the dash for %s", (_label, value) => {
            const wrapper = mount(JsonDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="json-display-dash"]').text()).toBe("-");
            expect(wrapper.find('[data-qa="json-display-value"]').exists()).toBe(false);
        });

        // An empty container is a recorded value, unlike an absent one.
        scopedIt.each([
            ["an empty object", {}, "{}"],
            ["an empty array", [], "[]"],
            ["the empty string scalar", "", '""'],
            ["a false scalar", false, "false"],
            ["a zero scalar", 0, "0"],
        ])("renders %s as JSON rather than the dash", (_label, value, expected) => {
            const wrapper = mount(JsonDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="json-display-value"]').element.textContent).toBe(expected);
        });

        scopedIt("falls back to coercion for a value that cannot be serialized", () => {
            const value = {};
            value.self = value;
            expect(textFor({ value })).toBe("[object Object]");
        });
    });

    describe("Layout", () => {
        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(JsonDisplay, { props: { value: { a: 1 }, class: "my-class" } });
            expect(wrapper.classes()).toContain("my-class");
        });
    });
});
