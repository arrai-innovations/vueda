import { mockEventListener, mockLifecycle } from "@tests/unit/utils.js";

const mockedLifecycle = mockLifecycle(vi);
const mockedEventListener = mockEventListener(vi);

vi.stubGlobal("document", {
    addEventListener: mockedEventListener.mockedAddEventListener,
    removeEventListener: mockedEventListener.mockedRemoveEventListener,
});

vi.mock("platform-detect/os.mjs", () => ({
    default: { macos: false, windows: true }, // mock as Windows by default
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    return {
        ...actual,
        onMounted: mockedLifecycle.mockedOnMounted,
        onActivated: mockedLifecycle.mockedOnActivated,
        onDeactivated: mockedLifecycle.mockedOnDeactivated,
        onUnmounted: mockedLifecycle.mockedOnUnmounted,
    };
});

describe("lib/use/useWindowShortcut.js", () => {
    let useWindowShortcut, vue;
    beforeEach(async () => {
        useWindowShortcut = (await import("@vueda/use/useWindowShortcut.js")).useWindowShortcut;
        vue = await import("vue");
    });
    afterEach(async () => {
        vi.clearAllMocks();
        mockedLifecycle.clearMounted();
        mockedLifecycle.clearUnmounted();
        mockedEventListener.clear();
        const os = await import("platform-detect/os.mjs");
        os.default.macos = false;
        os.default.windows = true;
    });

    it("attaches keydown listener on mounted and activated", () => {
        const props = vue.ref({
            triggers: [],
        });

        useWindowShortcut(props.value);

        mockedLifecycle.runMountedHooks();
        expect(mockedEventListener.mockedAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));

        mockedLifecycle.runActivatedHooks();
        expect(mockedEventListener.mockedAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });

    it("removes keydown listener on deactivated", () => {
        const props = vue.ref({
            triggers: [],
        });

        useWindowShortcut(props.value);

        mockedLifecycle.runDeactivatedHooks();
        expect(mockedEventListener.mockedRemoveEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });

    it("calls trigger fn when key and modifiers match", async () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [
                {
                    keys: "s",
                    modifiers: ["ctrlKey"],
                    fn,
                },
            ],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        expect(mockedEventListener.mockedAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([event]) => event === "keydown")[1];

        handler({ key: "s", ctrlKey: true, repeat: false, stopPropagation: vi.fn(), preventDefault: vi.fn() });

        expect(fn).toHaveBeenCalled();
    });

    it("does not call trigger fn if repeat is true", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [
                {
                    keys: "s",
                    modifiers: ["ctrlKey"],
                    fn,
                },
            ],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        expect(mockedEventListener.mockedAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([event]) => event === "keydown")[1];

        handler({ key: "s", ctrlKey: true, repeat: true });

        expect(fn).not.toHaveBeenCalled();
    });

    it("handles shiftKey by uppercasing key", async () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [
                {
                    keys: "s",
                    modifiers: ["shiftKey"],
                    fn,
                },
            ],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        expect(mockedEventListener.mockedAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([event]) => event === "keydown")[1];

        handler({ key: "S", shiftKey: true, stopPropagation: vi.fn(), preventDefault: vi.fn() });

        expect(fn).toHaveBeenCalled();
    });

    it("uses macOsModifiers on macOS", async () => {
        vi.mocked(await import("platform-detect/os.mjs")).default.macos = true;

        const fn = vi.fn();
        const props = vue.ref({
            triggers: [
                {
                    keys: "s",
                    modifiers: ["ctrlKey"], // ignored
                    macOsModifiers: ["metaKey"],
                    fn,
                },
            ],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        expect(mockedEventListener.mockedAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([event]) => event === "keydown")[1];

        handler({ key: "s", metaKey: true, stopPropagation: vi.fn(), preventDefault: vi.fn() });

        expect(fn).toHaveBeenCalled();
    });
    it("does not call fn when no modifier key is pressed", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [{ keys: "s", modifiers: ["ctrlKey"], fn }],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([e]) => e === "keydown")[1];

        handler({ key: "s", ctrlKey: false, altKey: false, shiftKey: false, metaKey: false });

        expect(fn).not.toHaveBeenCalled(); // hits the early modifier bailout
    });
    it("calls fn when no modifiers are defined (modifiers.every skipped)", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [{ keys: "s", fn }],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([e]) => e === "keydown")[1];

        handler({
            key: "s",
            ctrlKey: true, // still passes the modifier presence check
            stopPropagation: vi.fn(),
            preventDefault: vi.fn(),
        });

        expect(fn).toHaveBeenCalled(); // modifiers.every skipped
    });
    it("does not call fn when key does not match any trigger", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [{ keys: "a", modifiers: ["ctrlKey"], fn }],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([e]) => e === "keydown")[1];

        handler({
            key: "z",
            ctrlKey: true,
            stopPropagation: vi.fn(),
            preventDefault: vi.fn(),
        });

        expect(fn).not.toHaveBeenCalled(); // fall-through case
    });
    it("normalizes single string modifier to array", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [{ keys: "s", modifiers: "ctrlKey", fn }],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([e]) => e === "keydown")[1];

        handler({
            key: "s",
            ctrlKey: true,
            stopPropagation: vi.fn(),
            preventDefault: vi.fn(),
        });

        expect(fn).toHaveBeenCalled(); // confirms that "ctrlKey" was normalized to ["ctrlKey"]
    });
    it("normalizes keys from string to array", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [{ keys: "s", modifiers: ["ctrlKey"], fn }],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([e]) => e === "keydown")[1];

        handler({
            key: "s",
            ctrlKey: true,
            stopPropagation: vi.fn(),
            preventDefault: vi.fn(),
        });

        expect(fn).toHaveBeenCalled(); // hits keys normalization
    });
    it("calls fn when event.key matches one of multiple keys", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [
                {
                    keys: ["s", "S"],
                    modifiers: ["ctrlKey"],
                    fn,
                },
            ],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([e]) => e === "keydown")[1];

        handler({
            key: "S", // matches one of the keys
            ctrlKey: true,
            stopPropagation: vi.fn(),
            preventDefault: vi.fn(),
        });

        expect(fn).toHaveBeenCalled();
    });
    it("handles single string modifier instead of array", () => {
        const fn = vi.fn();
        const props = vue.ref({
            triggers: [
                {
                    keys: "x",
                    modifiers: "altKey", // string, not array
                    fn,
                },
            ],
        });

        useWindowShortcut(props.value);
        mockedLifecycle.runMountedHooks();

        const handler = mockedEventListener.mockedAddEventListener.mock.calls.find(([e]) => e === "keydown")[1];

        handler({
            key: "x",
            altKey: true,
            stopPropagation: vi.fn(),
            preventDefault: vi.fn(),
        });

        expect(fn).toHaveBeenCalled(); // confirms string modifier normalized to array
    });
});
