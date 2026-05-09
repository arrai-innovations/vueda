import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import SidebarProvider from "@vueda/navigation/sidebar/SidebarProvider.vue";
import { useSidebar } from "@vueda/use/useSidebar.js";
import { SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT } from "@vueda/utils/constants.js";
import { defineComponent, nextTick } from "vue";

vi.mock("@vueda/shell/tooltip/TooltipProvider.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return {
        default: defineComponent({
            name: "TooltipProvider",
            setup(_, { slots }) {
                return () => h("div", null, slots.default ? slots.default() : undefined);
            },
        }),
    };
});

const clearSidebarCookie = () => {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=; path=/; max-age=0`;
};

const makeMediaQueryList = (matches) => ({
    matches,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
});

const stubMatchMedia = (matches) => {
    vi.spyOn(window, "matchMedia").mockImplementation(() => makeMediaQueryList(matches));
};

const Capture = (capture) =>
    defineComponent({
        name: "Capture",
        setup() {
            capture(useSidebar());
            return () => null;
        },
    });

const mountProvider = ({ props = {}, mobile = false, attrs = {} } = {}) => {
    stubMatchMedia(mobile);
    let ctx;
    const wrapper = mount(SidebarProvider, {
        props,
        attrs,
        global: { components: { Capture: Capture((c) => (ctx = c)) } },
        slots: { default: "<Capture /><span class='child'>child</span>" },
    });
    return { wrapper, getCtx: () => ctx };
};

describe("lib/navigation/sidebar/SidebarProvider.vue", () => {
    beforeEach(() => {
        clearSidebarCookie();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        clearSidebarCookie();
    });

    describe("Rendering", () => {
        scopedIt("renders the wrapper with data-slot and slot content", () => {
            const { wrapper } = mountProvider();
            const wrap = wrapper.find('[data-slot="sidebar-wrapper"]');
            expect(wrap.exists()).toBe(true);
            expect(wrap.find(".child").text()).toBe("child");
        });

        scopedIt("merges the class prop onto the wrapper", () => {
            const { wrapper } = mountProvider({ props: { class: "my-wrapper" } });
            expect(wrapper.find('[data-slot="sidebar-wrapper"]').classes()).toContain("my-wrapper");
        });

        scopedIt("exposes sidebar width CSS variables on the wrapper", () => {
            const { wrapper } = mountProvider();
            const style = wrapper.find('[data-slot="sidebar-wrapper"]').attributes("style") || "";
            expect(style).toContain("--sidebar-width: var(--vueda-sidebar-width)");
            expect(style).toContain("--sidebar-width-icon: var(--vueda-sidebar-width-icon)");
        });
    });

    describe("Provided context", () => {
        scopedIt("exposes the documented sidebar context shape", () => {
            const { getCtx } = mountProvider();
            const ctx = getCtx();
            expect(ctx).toBeDefined();
            expect(ctx).toEqual(
                expect.objectContaining({
                    state: expect.any(Object),
                    open: expect.any(Object),
                    setOpen: expect.any(Function),
                    isMobile: expect.any(Object),
                    openMobile: expect.any(Object),
                    setOpenMobile: expect.any(Function),
                    toggleSidebar: expect.any(Function),
                }),
            );
        });

        scopedIt("state reflects the open ref ('expanded' / 'collapsed')", async () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true } });
            const ctx = getCtx();
            expect(ctx.open.value).toBe(true);
            expect(ctx.state.value).toBe("expanded");
            ctx.setOpen(false);
            await nextTick();
            expect(ctx.open.value).toBe(false);
            expect(ctx.state.value).toBe("collapsed");
        });

        scopedIt("isMobile reflects the (max-width: 768px) media query", () => {
            const { getCtx } = mountProvider({ mobile: true });
            expect(getCtx().isMobile.value).toBe(true);
        });
    });

    describe("defaultOpen and cookie", () => {
        scopedIt("defaults to open when no cookie is set", () => {
            const { getCtx } = mountProvider();
            expect(getCtx().open.value).toBe(true);
        });

        scopedIt("defaults to closed when the cookie is 'false'", () => {
            document.cookie = `${SIDEBAR_COOKIE_NAME}=false; path=/`;
            const { getCtx } = mountProvider();
            expect(getCtx().open.value).toBe(false);
        });

        scopedIt("setOpen persists state to cookie with max-age", () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true } });
            getCtx().setOpen(false);
            expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=false`);
            expect(SIDEBAR_COOKIE_MAX_AGE).toBeGreaterThan(0);
        });
    });

    describe("toggleSidebar", () => {
        scopedIt("toggles the desktop open ref when not mobile", async () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true } });
            const ctx = getCtx();
            ctx.toggleSidebar();
            await nextTick();
            expect(ctx.open.value).toBe(false);
            expect(ctx.openMobile.value).toBe(false);
            ctx.toggleSidebar();
            await nextTick();
            expect(ctx.open.value).toBe(true);
        });

        scopedIt("toggles the mobile ref when mobile, leaving open untouched", async () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true }, mobile: true });
            const ctx = getCtx();
            expect(ctx.openMobile.value).toBe(false);
            ctx.toggleSidebar();
            await nextTick();
            expect(ctx.openMobile.value).toBe(true);
            expect(ctx.open.value).toBe(true);
        });
    });

    describe("Keyboard shortcut", () => {
        scopedIt("toggles when the shortcut key fires with metaKey", async () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true } });
            const ctx = getCtx();
            const event = new KeyboardEvent("keydown", {
                key: SIDEBAR_KEYBOARD_SHORTCUT,
                metaKey: true,
                bubbles: true,
                cancelable: true,
            });
            window.dispatchEvent(event);
            await nextTick();
            expect(ctx.open.value).toBe(false);
            expect(event.defaultPrevented).toBe(true);
        });

        scopedIt("toggles when the shortcut key fires with ctrlKey", async () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true } });
            const ctx = getCtx();
            window.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: SIDEBAR_KEYBOARD_SHORTCUT,
                    ctrlKey: true,
                    bubbles: true,
                }),
            );
            await nextTick();
            expect(ctx.open.value).toBe(false);
        });

        scopedIt("ignores the shortcut key without a modifier", async () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true } });
            const ctx = getCtx();
            window.dispatchEvent(new KeyboardEvent("keydown", { key: SIDEBAR_KEYBOARD_SHORTCUT, bubbles: true }));
            await nextTick();
            expect(ctx.open.value).toBe(true);
        });

        scopedIt("ignores other keys with a modifier", async () => {
            const { getCtx } = mountProvider({ props: { defaultOpen: true } });
            const ctx = getCtx();
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", metaKey: true, bubbles: true }));
            await nextTick();
            expect(ctx.open.value).toBe(true);
        });
    });

    describe("Controlled open", () => {
        scopedIt("reflects the controlled open prop and emits update:open on toggle", async () => {
            stubMatchMedia(false);
            let ctx;
            const wrapper = mount(SidebarProvider, {
                props: { open: true },
                global: { components: { Capture: Capture((c) => (ctx = c)) } },
                slots: { default: "<Capture />" },
            });
            expect(ctx.open.value).toBe(true);
            ctx.toggleSidebar();
            await nextTick();
            const events = wrapper.emitted("update:open");
            expect(events).toBeTruthy();
            expect(events[events.length - 1]).toEqual([false]);
        });
    });
});
