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
                    <StickyChrome :zone="zone"><button data-qa="chrome">go</button></StickyChrome>
                </Provider>
            `,
        });
        const wrapper = mount(Host, { props: { zone }, attachTo: document.body });
        // Two ticks: one to mount the zone elements, one for the teleport target to resolve.
        await nextTick();
        await nextTick();
        return wrapper;
    };

    describe("teleporting into provider zones", () => {
        scopedIt("teleports its slot into the top zone target", async () => {
            const wrapper = await mountInProvider("top");
            const topTarget = wrapper.find('[data-qa="sticky-stack-top-target"]').element;
            const bottomTarget = wrapper.find('[data-qa="sticky-stack-bottom-target"]').element;
            expect(topTarget.querySelector('[data-qa="chrome"]')).not.toBeNull();
            expect(bottomTarget.querySelector('[data-qa="chrome"]')).toBeNull();
            wrapper.unmount();
        });

        scopedIt("teleports its slot into the bottom zone target", async () => {
            const wrapper = await mountInProvider("bottom");
            const topTarget = wrapper.find('[data-qa="sticky-stack-top-target"]').element;
            const bottomTarget = wrapper.find('[data-qa="sticky-stack-bottom-target"]').element;
            expect(bottomTarget.querySelector('[data-qa="chrome"]')).not.toBeNull();
            expect(topTarget.querySelector('[data-qa="chrome"]')).toBeNull();
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
});
