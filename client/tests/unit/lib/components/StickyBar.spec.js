import { mockEventListener, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

let themeContext;
const mockedUseTheme = vi.fn((comp, props, context) => {
    themeContext = context;
    return vi.fn();
});
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

const mockedListeners = mockEventListener(vi);

vi.stubGlobal("window", {
    ...window,
    scrollY: 0,
    addEventListener: mockedListeners.mockedAddEventListener,
    removeEventListener: mockedListeners.mockedRemoveEventListener,
});

const importComponent = () => import("@vueda/components/StickyBar.vue");

describe("lib/components/StickyBar.vue", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        mockedListeners.clear();
        vi.clearAllMocks();
        themeContext = undefined;
    });

    scopedIt("registers and cleans up scroll listener", async () => {
        const { default: StickyBar } = await importComponent();
        const wrapper = mount(StickyBar);
        const handler = mockedListeners.mockedAddEventListener.mock.calls.find(([e]) => e === "scroll")[1];
        expect(handler).toBeInstanceOf(Function);
        wrapper.unmount();
        expect(mockedListeners.mockedRemoveEventListener).toHaveBeenCalledWith("scroll", handler);
    });

    scopedIt("updates hidden state on scroll", async () => {
        const { default: StickyBar } = await importComponent();
        const wrapper = mount(StickyBar);
        await nextTick();
        expect(themeContext.hidden).toBe(false);

        const handler = mockedListeners.mockedAddEventListener.mock.calls.find(([e]) => e === "scroll")[1];
        window.scrollY = 100;
        handler();
        await nextTick();
        expect(themeContext.hidden).toBe(true);

        vi.advanceTimersByTime(300);
        await nextTick();
        expect(themeContext.hidden).toBe(false);

        window.scrollY = 50;
        handler();
        await nextTick();
        expect(themeContext.hidden).toBe(false);
        wrapper.unmount();
    });

    scopedIt("clears pending timeout on unmount", async () => {
        const { default: StickyBar } = await importComponent();
        const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
        const wrapper = mount(StickyBar);
        const handler = mockedListeners.mockedAddEventListener.mock.calls.find(([e]) => e === "scroll")[1];
        window.scrollY = 100;
        handler();
        wrapper.unmount();
        expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    scopedIt("renders default slot when neither primary nor secondary slot is bound", async () => {
        const { default: StickyBar } = await importComponent();
        const wrapper = mount(StickyBar, {
            slots: { default: "<span data-qa='legacy'>legacy</span>" },
        });
        expect(wrapper.find('[data-qa="legacy"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="sticky-bar-primary"]').exists()).toBe(false);
        expect(wrapper.find('[data-qa="sticky-bar-secondary"]').exists()).toBe(false);
    });

    scopedIt("renders primary slot inside themed primary container", async () => {
        const { default: StickyBar } = await importComponent();
        const wrapper = mount(StickyBar, {
            slots: { primary: "<span data-qa='p'>primary</span>" },
        });
        expect(wrapper.find('[data-qa="sticky-bar-primary"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="sticky-bar-secondary"]').exists()).toBe(false);
        expect(wrapper.find('[data-qa="p"]').exists()).toBe(true);
    });

    scopedIt("renders secondary slot inside themed secondary container", async () => {
        const { default: StickyBar } = await importComponent();
        const wrapper = mount(StickyBar, {
            slots: {
                primary: "<span data-qa='p'>primary</span>",
                secondary: "<span data-qa='s'>secondary</span>",
            },
        });
        expect(wrapper.find('[data-qa="sticky-bar-primary"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="sticky-bar-secondary"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="s"]').exists()).toBe(true);
    });

    scopedIt("ignores default slot when primary/secondary are bound", async () => {
        const { default: StickyBar } = await importComponent();
        const wrapper = mount(StickyBar, {
            slots: {
                default: "<span data-qa='legacy'>legacy</span>",
                primary: "<span data-qa='p'>primary</span>",
            },
        });
        expect(wrapper.find('[data-qa="legacy"]').exists()).toBe(false);
        expect(wrapper.find('[data-qa="p"]').exists()).toBe(true);
    });
});
