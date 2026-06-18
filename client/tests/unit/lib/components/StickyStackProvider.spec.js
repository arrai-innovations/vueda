import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeCapture = { context: undefined };
const mockedUseTheme = makeUseThemeMock({
    onCall: (componentName, props, context) => {
        if (componentName === "StickyStackProvider") {
            themeCapture.context = context;
        }
    },
});
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

const importComponent = () => import("@vueda/components/StickyStackProvider.vue");

describe("lib/components/StickyStackProvider.vue", () => {
    afterEach(() => {
        vi.clearAllMocks();
        themeCapture.context = undefined;
    });

    describe("structure", () => {
        scopedIt("renders the root, both zones, and both teleport targets", async () => {
            const { default: Provider } = await importComponent();
            const wrapper = mount(Provider);
            await nextTick();

            expect(wrapper.find('[data-qa="sticky-stack-root"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-top-zone"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-bottom-zone"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-top-target"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-bottom-target"]').exists()).toBe(true);
            wrapper.unmount();
        });

        scopedIt("renders the top slot inside the top zone and the default slot as content", async () => {
            const { default: Provider } = await importComponent();
            const wrapper = mount(Provider, {
                slots: {
                    top: "<h1 data-qa='title'>Suppliers</h1>",
                    default: "<main data-qa='content'>rows</main>",
                },
            });

            const topZone = wrapper.find('[data-qa="sticky-stack-top-zone"]');
            expect(topZone.find('[data-qa="title"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="content"]').exists()).toBe(true);
            // The content is not inside the top zone.
            expect(topZone.find('[data-qa="content"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("publishes the --vueda-sticky-stack-top custom property on the root", async () => {
            const { default: Provider } = await importComponent();
            const wrapper = mount(Provider);
            await nextTick();
            const root = wrapper.find('[data-qa="sticky-stack-root"]');
            expect(root.attributes("style") || "").toContain("--vueda-sticky-stack-top");
            wrapper.unmount();
        });
    });

    describe("reveal context", () => {
        scopedIt("exposes top/bottom hidden flags, both false by default (zones default to always)", async () => {
            const { default: Provider } = await importComponent();
            const wrapper = mount(Provider);
            await nextTick();
            expect(themeCapture.context.topHidden).toBe(false);
            expect(themeCapture.context.bottomHidden).toBe(false);
            wrapper.unmount();
        });
    });

    describe("dev scroll-blocking guard", () => {
        scopedIt("warns, naming the offender, when an ancestor sets a non-visible overflow", async () => {
            const { default: Provider } = await importComponent();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const host = document.createElement("div");
            host.style.overflowY = "auto";
            document.body.appendChild(host);

            const wrapper = mount(Provider, { attachTo: host });
            await nextTick();

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("position:sticky"), expect.anything());
            wrapper.unmount();
            host.remove();
            warn.mockRestore();
        });

        scopedIt("does not warn when no ancestor blocks scrolling", async () => {
            const { default: Provider } = await importComponent();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const host = document.createElement("div");
            document.body.appendChild(host);

            const wrapper = mount(Provider, { attachTo: host });
            await nextTick();

            expect(warn).not.toHaveBeenCalled();
            wrapper.unmount();
            host.remove();
            warn.mockRestore();
        });
    });
});
