import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock(),
    THEME_OVERRIDE_PROPS: {},
}));

const importComponent = () => import("@vueda/shell/sticky/StickyStackProvider.vue");

describe("lib/shell/sticky/StickyStackProvider.vue", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("structure", () => {
        scopedIt("renders the root, the title and bottom bars, and both scroll sentinels", async () => {
            const { default: Provider } = await importComponent();
            const wrapper = mount(Provider);
            await nextTick();

            expect(wrapper.find('[data-qa="sticky-stack-root"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-title-bar"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-bottom-anchor"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-top-sentinel"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="sticky-stack-bottom-sentinel"]').exists()).toBe(true);
            wrapper.unmount();
        });

        scopedIt(
            "places the top slot in the title bar, the bottom slot in the anchor, and content between",
            async () => {
                const { default: Provider } = await importComponent();
                const wrapper = mount(Provider, {
                    slots: {
                        top: "<h1 data-qa='title'>Suppliers</h1>",
                        default: "<main data-qa='content'>rows</main>",
                        bottom: "<nav data-qa='pager'>1 of 3</nav>",
                    },
                });

                expect(wrapper.find('[data-qa="sticky-stack-title-bar"]').find('[data-qa="title"]').exists()).toBe(
                    true,
                );
                expect(wrapper.find('[data-qa="sticky-stack-bottom-anchor"]').find('[data-qa="pager"]').exists()).toBe(
                    true,
                );
                expect(wrapper.find('[data-qa="content"]').exists()).toBe(true);
                wrapper.unmount();
            },
        );

        scopedIt("publishes the --vueda-sticky-stack-top custom property on the root", async () => {
            const { default: Provider } = await importComponent();
            const wrapper = mount(Provider);
            await nextTick();
            const root = wrapper.find('[data-qa="sticky-stack-root"]');
            expect(root.attributes("style") || "").toContain("--vueda-sticky-stack-top");
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
