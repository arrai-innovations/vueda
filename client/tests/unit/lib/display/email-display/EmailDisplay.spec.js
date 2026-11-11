import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (slot) => `theme-${slot}` });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

describe("lib/display/email-display/EmailDisplay.vue", () => {
    let EmailDisplay;

    beforeEach(async () => {
        EmailDisplay = (await import("@vueda/display/email-display/EmailDisplay.vue")).default;
    });

    describe("Link rendering", () => {
        scopedIt("links an address to mailto:, labelled with the address as stored", () => {
            const wrapper = mount(EmailDisplay, { props: { value: "sales@domain.invalid" } });
            const link = wrapper.get('[data-qa="email-display-link"]');
            expect(link.element.tagName).toBe("A");
            expect(link.attributes("href")).toBe("mailto:sales@domain.invalid");
            expect(link.text()).toBe("sales@domain.invalid");
            expect(link.classes()).toContain("theme-link");
        });

        scopedIt.each([
            ["a header", "sales@domain.invalid?bcc=other@domain.invalid"],
            ["a second header", "sales@domain.invalid&subject=hi"],
            ["a comma-separated recipient", "sales@domain.invalid,other@domain.invalid"],
            ["a semicolon-separated recipient", "sales@domain.invalid;other@domain.invalid"],
            ["whitespace", "sales @domain.invalid"],
            ["an encoded header", "sales%3Fbcc%3Dother%40domain.invalid@domain.invalid"],
            ["an encoded recipient separator", "sales@domain.invalid%2Cother%40domain.invalid"],
            ["no @", "sales"],
            ["two @", "sales@team@domain.invalid"],
            ["nothing before the @", "@domain.invalid"],
        ])("shows a value with %s as plain text", (_label, value) => {
            const wrapper = mount(EmailDisplay, { props: { value } });
            expect(wrapper.find('[data-qa="email-display-link"]').exists()).toBe(false);
            const text = wrapper.get('[data-qa="email-display-text"]');
            expect(text.text()).toBe(value);
            expect(text.classes()).toContain("theme-text");
        });
    });

    describe("Empty values", () => {
        scopedIt.each([
            ["null", null],
            ["undefined", undefined],
            ["an empty string", ""],
        ])("renders the dash for %s", (_label, value) => {
            const wrapper = mount(EmailDisplay, { props: { value } });
            expect(wrapper.get('[data-qa="email-display-dash"]').text()).toBe("-");
            expect(wrapper.find('[data-qa="email-display-link"]').exists()).toBe(false);
        });
    });

    describe("Layout", () => {
        scopedIt("wraps in a div by default", () => {
            const wrapper = mount(EmailDisplay, { props: { value: "sales@domain.invalid" } });
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("wraps in a span when inline", () => {
            const wrapper = mount(EmailDisplay, { props: { value: "sales@domain.invalid", inline: true } });
            expect(wrapper.element.tagName).toBe("SPAN");
        });
    });
});
