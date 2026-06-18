import { mockEventListener, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useScrollReveal } from "@vueda/use/useScrollReveal.js";
import { defineComponent, h, nextTick, ref } from "vue";

const mockedListeners = mockEventListener(vi);

vi.stubGlobal("window", {
    ...window,
    scrollY: 0,
    addEventListener: mockedListeners.mockedAddEventListener,
    removeEventListener: mockedListeners.mockedRemoveEventListener,
});

// Mount a tiny host that wires `useScrollReveal` to a real element ref and exposes the result, so
// the composable runs inside a component effect scope the way StickyBar uses it.
const mountHost = (options = {}) => {
    let context;
    const Host = defineComponent({
        setup() {
            const root = ref(null);
            context = useScrollReveal(root, options);
            return () => h("div", { ref: root });
        },
    });
    const wrapper = mount(Host);
    return { wrapper, context: () => context };
};

const windowScrollHandler = () => mockedListeners.mockedAddEventListener.mock.calls.find(([e]) => e === "scroll")?.[1];

describe("lib/use/useScrollReveal.js", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollY = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
        mockedListeners.clear();
        vi.clearAllMocks();
    });

    describe("scroll target binding", () => {
        scopedIt("binds a window scroll listener by default and cleans it up on scope dispose", async () => {
            const { wrapper } = mountHost();
            const handler = windowScrollHandler();
            expect(handler).toBeInstanceOf(Function);

            wrapper.unmount();
            expect(mockedListeners.mockedRemoveEventListener).toHaveBeenCalledWith("scroll", handler);
        });

        scopedIt("binds to scrollRoot and reacts to its scroll position instead of the window", async () => {
            const scrollRoot = {
                scrollTop: 0,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                getBoundingClientRect: () => ({ top: 0, bottom: 0 }),
            };
            const { wrapper, context } = mountHost({ scrollRoot });
            await nextTick();

            expect(scrollRoot.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
            expect(mockedListeners.mockedAddEventListener).not.toHaveBeenCalledWith("scroll", expect.any(Function));
            expect(context().hidden.value).toBe(false);

            const handler = scrollRoot.addEventListener.mock.calls.find(([e]) => e === "scroll")[1];
            scrollRoot.scrollTop = 100;
            handler();
            await nextTick();
            expect(context().hidden.value).toBe(true);

            wrapper.unmount();
            expect(scrollRoot.removeEventListener).toHaveBeenCalledWith("scroll", handler);
        });

        scopedIt("accepts a getter for scrollRoot", async () => {
            const scrollRoot = {
                scrollTop: 0,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                getBoundingClientRect: () => ({ top: 0, bottom: 0 }),
            };
            mountHost({ scrollRoot: () => scrollRoot });
            await nextTick();
            expect(scrollRoot.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
        });
    });

    describe("reveal strategy: scroll-up-or-idle (default)", () => {
        scopedIt("hides on scroll down, then reveals after the idle delay and on scroll up", async () => {
            const { context } = mountHost();
            await nextTick();
            expect(context().hidden.value).toBe(false);

            const handler = windowScrollHandler();
            window.scrollY = 100;
            handler();
            await nextTick();
            expect(context().hidden.value).toBe(true);

            // Idle reveal: pausing past the delay brings the chrome back.
            vi.advanceTimersByTime(300);
            await nextTick();
            expect(context().hidden.value).toBe(false);

            // Scroll up also reveals.
            window.scrollY = 50;
            handler();
            await nextTick();
            expect(context().hidden.value).toBe(false);
        });

        scopedIt("clears the pending idle timer on scope dispose", async () => {
            const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
            const { wrapper } = mountHost();
            const handler = windowScrollHandler();
            window.scrollY = 100;
            handler();
            wrapper.unmount();
            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });

    describe("reveal strategy: scroll-up", () => {
        scopedIt("hides on scroll down and stays hidden while idle (no idle reveal)", async () => {
            const { context } = mountHost({ reveal: "scroll-up" });
            await nextTick();

            const handler = windowScrollHandler();
            window.scrollY = 100;
            handler();
            await nextTick();
            expect(context().hidden.value).toBe(true);

            // Unlike scroll-up-or-idle, pausing must NOT reveal the chrome.
            vi.advanceTimersByTime(1000);
            await nextTick();
            expect(context().hidden.value).toBe(true);

            // Only a scroll up reveals it.
            window.scrollY = 40;
            handler();
            await nextTick();
            expect(context().hidden.value).toBe(false);
        });
    });

    describe("reveal strategy: always", () => {
        scopedIt("never hides regardless of scroll position", async () => {
            const { context } = mountHost({ reveal: "always" });
            await nextTick();
            expect(context().hidden.value).toBe(false);

            const handler = windowScrollHandler();
            window.scrollY = 500;
            handler();
            await nextTick();
            expect(context().hidden.value).toBe(false);
        });
    });

    describe("reactive reveal strategy", () => {
        scopedIt("switches behavior when a ref strategy changes", async () => {
            const reveal = ref("scroll-up");
            const { context } = mountHost({ reveal });
            await nextTick();

            const handler = windowScrollHandler();
            window.scrollY = 100;
            handler();
            await nextTick();
            expect(context().hidden.value).toBe(true);

            // Flipping to `always` reveals immediately without any further scroll.
            reveal.value = "always";
            await nextTick();
            expect(context().hidden.value).toBe(false);
        });
    });
});
