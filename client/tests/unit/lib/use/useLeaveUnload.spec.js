import { mockEventListener, mockLifecycle, mockVueRouterLifecycle, scopedIt } from "@tests/unit/utils.js";

const mockedLifecycle = mockLifecycle(vi);

const mockedVueRouterLifecycle = mockVueRouterLifecycle(vi);

const mockedEventListeners = mockEventListener(vi);

const confirm = vi.fn(() => true);
vi.stubGlobal("confirm", confirm);
vi.stubGlobal("window", {
    ...window,
    addEventListener: mockedEventListeners.mockedAddEventListener,
    removeEventListener: mockedEventListeners.mockedRemoveEventListener,
});

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    return {
        ...actual,
        onMounted: mockedLifecycle.mockedOnMounted,
        onUnmounted: mockedLifecycle.mockedOnUnmounted,
    };
});

vi.mock("vue-router", async () => {
    const actual = await vi.importActual("vue-router");
    return {
        ...actual,
        onBeforeRouteLeave: mockedVueRouterLifecycle.mockedOnBeforeRouteLeave,
        onBeforeRouteUpdate: mockedVueRouterLifecycle.mockedOnBeforeRouteUpdate,
    };
});

vi.mock("@vueda/use/useIsActive.js", () => {
    return {
        useIsActive: vi.fn(() => ({ value: true })),
    };
});

describe("lib/use/useLeaveUnload.js", () => {
    let vue, useLeaveUnload;

    const mountLeaveUnload = (modified = false, loading = false) => {
        useLeaveUnload({ modified, loading });
        mockedLifecycle.runMountedHooks(); // triggers onMounted
        return { modified, loading };
    };

    beforeEach(async () => {
        useLeaveUnload = await import("@vueda/use/useLeaveUnload.js").then((mod) => mod.useLeaveUnload);
        vue = await import("vue");
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockedLifecycle.clearMounted();
        mockedLifecycle.clearUnmounted();
        mockedVueRouterLifecycle.clearLeave();
        mockedVueRouterLifecycle.clearUpdate();
        mockedEventListeners.clear();
    });
    scopedIt("registers and cleans up beforeunload listener", () => {
        mountLeaveUnload();

        expect(window.addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));

        mockedLifecycle.runUnmountedHooks();
        expect(window.removeEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });
    scopedIt("triggers preventDefault on beforeunload when modified and not loading", async () => {
        const modified = vue.ref(true);
        const loading = vue.ref(false);

        const originalEnv = import.meta.env.DEV;
        import.meta.env.DEV = false;
        expect(import.meta.env.DEV).toBe(false);

        mountLeaveUnload(modified, loading);

        const listener = window.addEventListener.mock.calls.find(([event]) => event === "beforeunload")?.[1];
        expect(listener).toBeInstanceOf(Function);

        const event = { preventDefault: vi.fn(), returnValue: undefined };
        listener(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.returnValue).toBe("You have unsaved changes, are you sure to leave?");

        import.meta.env.DEV = originalEnv;
    });
    scopedIt("does nothing in DEV mode", () => {
        const modified = vue.ref(true);
        const loading = vue.ref(false);
        mountLeaveUnload(modified, loading);

        const listener = window.addEventListener.mock.calls.find(([event]) => event === "beforeunload")[1];
        expect(listener).toBeInstanceOf(Function);
        const event = { preventDefault: vi.fn() };
        import.meta.env.DEV = true;

        listener(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
    scopedIt("does nothing if not modified or loading", () => {
        const modified = vue.ref(false);
        const loading = vue.ref(false);
        mountLeaveUnload(modified, loading);

        const listener = window.addEventListener.mock.calls.find(([event]) => event === "beforeunload")[1];
        expect(listener).toBeInstanceOf(Function);
        const event = { preventDefault: vi.fn() };

        listener(event);
        expect(event.preventDefault).not.toHaveBeenCalled();

        // also test loading = true
        modified.value = true;
        loading.value = true;
        listener(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
    scopedIt("triggers confirm() on route leave if modified and not loading", () => {
        const modified = vue.ref(true);
        const loading = vue.ref(false);
        mountLeaveUnload(modified, loading);

        const leaveHook = mockedVueRouterLifecycle.leaveFns[0];

        confirm.mockReturnValueOnce(true);
        const result = leaveHook(); // no need to pass next()

        expect(confirm).toHaveBeenCalledWith("You have unsaved changes, are you sure to leave?");
        expect(result).toBeUndefined();
    });
    scopedIt("does nothing on route leave if not modified or loading", () => {
        const modified = vue.ref(false);
        const loading = vue.ref(true);
        mountLeaveUnload(modified, loading);

        const leaveHook = mockedVueRouterLifecycle.leaveFns[0];
        const result = leaveHook();

        expect(confirm).not.toHaveBeenCalled();
        expect(result).toBeUndefined(); // your guard probably returns nothing in this case
    });
    scopedIt("cancels route leave if confirm() returns false", () => {
        const modified = vue.ref(true);
        const loading = vue.ref(false);
        mountLeaveUnload(modified, loading);

        const leaveHook = mockedVueRouterLifecycle.leaveFns[0];

        confirm.mockReturnValueOnce(false);
        const result = leaveHook();

        expect(confirm).toHaveBeenCalled();
        expect(result).toBe(false);
    });
});
