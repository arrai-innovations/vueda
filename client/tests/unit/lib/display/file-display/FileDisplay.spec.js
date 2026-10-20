import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (slot) => `theme-${slot}` });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

describe("lib/display/file-display/FileDisplay.vue", () => {
    let FileDisplay;

    beforeEach(async () => {
        FileDisplay = (await import("@vueda/display/file-display/FileDisplay.vue")).default;
    });

    describe("Link rendering", () => {
        scopedIt("links a { name, url } value to its URL, labelled with its name", () => {
            const wrapper = mount(FileDisplay, {
                props: { value: { name: "manuals/guide.pdf", url: "https://files.domain.invalid/manuals/guide.pdf" } },
            });
            const link = wrapper.get('[data-qa="file-display-link"]');
            expect(link.element.tagName).toBe("A");
            expect(link.attributes("href")).toBe("https://files.domain.invalid/manuals/guide.pdf");
            expect(link.text()).toBe("manuals/guide.pdf");
            expect(link.classes()).toContain("theme-link");
            // The object itself never reaches the page as text.
            expect(wrapper.text()).not.toContain("{");
        });

        scopedIt("reads a string value as the URL and the label", () => {
            const wrapper = mount(FileDisplay, { props: { value: "https://files.domain.invalid/a.pdf" } });
            const link = wrapper.get('[data-qa="file-display-link"]');
            expect(link.attributes("href")).toBe("https://files.domain.invalid/a.pdf");
            expect(link.text()).toBe("https://files.domain.invalid/a.pdf");
        });

        scopedIt("labels an object without a name with its URL", () => {
            const wrapper = mount(FileDisplay, { props: { value: { url: "https://files.domain.invalid/a.pdf" } } });
            expect(wrapper.get('[data-qa="file-display-link"]').text()).toBe("https://files.domain.invalid/a.pdf");
        });

        scopedIt("shows a name without a URL as plain text", () => {
            const wrapper = mount(FileDisplay, { props: { value: { name: "manuals/guide.pdf", url: null } } });
            expect(wrapper.find('[data-qa="file-display-link"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="file-display-name"]').text()).toBe("manuals/guide.pdf");
        });
    });

    describe("Empty values", () => {
        scopedIt.each([
            ["null", null],
            ["undefined", undefined],
            ["an empty string", ""],
            ["an object with no name or URL", { name: "", url: "" }],
        ])("renders the dash for %s", (_label, value) => {
            const wrapper = mount(FileDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="file-display-dash"]').text()).toBe("-");
            expect(wrapper.find('[data-qa="file-display-link"]').exists()).toBe(false);
        });
    });

    describe("Layout", () => {
        scopedIt("wraps in a div by default", () => {
            const wrapper = mount(FileDisplay, { props: { value: "https://files.domain.invalid/a.pdf" } });
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("wraps in a span when inline", () => {
            const wrapper = mount(FileDisplay, {
                props: { value: "https://files.domain.invalid/a.pdf", inline: true },
            });
            expect(wrapper.element.tagName).toBe("SPAN");
        });
    });
});
