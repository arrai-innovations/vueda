import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (slot) => `theme-${slot}` });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

describe("lib/display/url-display/UrlDisplay.vue", () => {
    let UrlDisplay;

    beforeEach(async () => {
        UrlDisplay = (await import("@vueda/display/url-display/UrlDisplay.vue")).default;
    });

    describe("Link rendering", () => {
        scopedIt.each([["https://www.domain.invalid/catalog?page=2"], ["http://www.domain.invalid"]])(
            "links %s to itself, labelled with the URL as stored",
            (value) => {
                const wrapper = mount(UrlDisplay, { props: { value } });
                const link = wrapper.get('[data-qa="url-display-link"]');
                expect(link.element.tagName).toBe("A");
                expect(link.attributes("href")).toBe(value);
                expect(link.text()).toBe(value);
                expect(link.classes()).toContain("theme-link");
            },
        );

        scopedIt("opens in the same tab and withholds the referrer", () => {
            const wrapper = mount(UrlDisplay, { props: { value: "https://www.domain.invalid" } });
            const link = wrapper.get('[data-qa="url-display-link"]');
            expect(link.attributes("target")).toBeUndefined();
            expect(link.attributes("rel")).toBe("noopener noreferrer");
        });

        scopedIt.each([
            ["a javascript: URL", "javascript:alert(1)"],
            ["a javascript: URL with leading whitespace", " javascript:alert(1)"],
            ["a mixed-case javascript: URL", "JavaScript:alert(1)"],
            ["a data: URL", "data:text/html,<p>hi</p>"],
            ["an ftp: URL", "ftp://files.domain.invalid/a.txt"],
            ["text that is not a URL", "www.domain.invalid"],
        ])("shows %s as plain text", (_label, value) => {
            const wrapper = mount(UrlDisplay, { props: { value } });
            expect(wrapper.find("a").exists()).toBe(false);
            const text = wrapper.get('[data-qa="url-display-text"]');
            expect(text.text()).toBe(value.trim());
            expect(text.classes()).toContain("theme-text");
        });
    });

    describe("Empty values", () => {
        scopedIt.each([
            ["null", null],
            ["undefined", undefined],
            ["an empty string", ""],
        ])("renders the dash for %s", (_label, value) => {
            const wrapper = mount(UrlDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="url-display-dash"]').text()).toBe("-");
            expect(wrapper.find('[data-qa="url-display-link"]').exists()).toBe(false);
        });
    });

    describe("Layout", () => {
        scopedIt("wraps in a div by default", () => {
            const wrapper = mount(UrlDisplay, { props: { value: "https://www.domain.invalid" } });
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("wraps in a span when inline", () => {
            const wrapper = mount(UrlDisplay, { props: { value: "https://www.domain.invalid", inline: true } });
            expect(wrapper.element.tagName).toBe("SPAN");
        });
    });
});
