import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";

// StickyStackProvider (mounted as the host in these specs) uses the theme; StickyChrome does not.
const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock(),
    THEME_OVERRIDE_PROPS: {},
}));

const importChrome = () => import("@vueda/components/StickyChrome.vue");
const importProvider = () => import("@vueda/components/StickyStackProvider.vue");

describe("lib/components/StickyChrome.vue", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    const mountInProvider = async (zone) => {
        const { default: StickyChrome } = await importChrome();
        const { default: Provider } = await importProvider();
        const Host = defineComponent({
            components: { Provider, StickyChrome },
            props: { zone: { type: String, default: "top" } },
            template: `
                <Provider>
                    <StickyChrome :zone="zone" reveal="scroll-up"><button data-qa="chrome">go</button></StickyChrome>
                </Provider>
            `,
        });
        const wrapper = mount(Host, { props: { zone }, attachTo: document.body });
        // Two ticks: one to mount the bar element, one for the teleport target to resolve.
        await nextTick();
        await nextTick();
        return wrapper;
    };

    describe("teleporting into provider bars", () => {
        scopedIt("teleports its slot into a top-zone bar", async () => {
            const wrapper = await mountInProvider("top");
            const topBar = wrapper.find('[data-qa="sticky-stack-top-bar"]');
            expect(topBar.exists()).toBe(true);
            expect(topBar.element.querySelector('[data-qa="chrome"]')).not.toBeNull();
            expect(wrapper.find('[data-qa="sticky-stack-bottom-bar"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("teleports its slot into a bottom-zone bar", async () => {
            const wrapper = await mountInProvider("bottom");
            const bottomBar = wrapper.find('[data-qa="sticky-stack-bottom-bar"]');
            expect(bottomBar.exists()).toBe(true);
            expect(bottomBar.element.querySelector('[data-qa="chrome"]')).not.toBeNull();
            expect(wrapper.find('[data-qa="sticky-stack-top-bar"]').exists()).toBe(false);
            wrapper.unmount();
        });
    });

    describe("graceful degradation", () => {
        scopedIt("renders its slot in place when no provider is above", async () => {
            const { default: StickyChrome } = await importChrome();
            const wrapper = mount(StickyChrome, {
                props: { zone: "top" },
                slots: { default: "<button data-qa='chrome'>go</button>" },
                attachTo: document.body,
            });
            await nextTick();
            expect(wrapper.find('[data-qa="chrome"]').exists()).toBe(true);
            wrapper.unmount();
        });
    });

    describe("prop validation", () => {
        scopedIt("warns on an unknown reveal strategy string", async () => {
            const { default: StickyChrome } = await importChrome();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const wrapper = mount(StickyChrome, { props: { reveal: "scroll-sideways" } });
            // Vue's invalid-prop warning names the prop; it may pass a component trace as a 2nd arg.
            expect(warn.mock.calls.some((call) => String(call[0]).includes("reveal"))).toBe(true);
            wrapper.unmount();
            warn.mockRestore();
        });

        scopedIt("accepts a valid strategy string without warning", async () => {
            const { default: StickyChrome } = await importChrome();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const wrapper = mount(StickyChrome, { props: { reveal: "scroll-up" } });
            expect(warn).not.toHaveBeenCalled();
            wrapper.unmount();
            warn.mockRestore();
        });
    });
});
