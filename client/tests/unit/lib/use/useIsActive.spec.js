import { expectReadOnlyWarning, mockLifecycle, scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

const lifecycleMocks = mockLifecycle(vi);

vi.mock("vue", async () => {
    const original = await vi.importActual("vue");
    return {
        __esModule: true,
        ...original,
        onMounted: lifecycleMocks.mockedOnMounted,
        onActivated: lifecycleMocks.mockedOnActivated,
        onDeactivated: lifecycleMocks.mockedOnDeactivated,
    };
});

describe("lib/use/useIsActive.js", () => {
    let useIsActive;

    beforeEach(async () => {
        useIsActive = await vi.importActual("@vueda/use/useIsActive.js").then((m) => m.useIsActive);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        lifecycleMocks.clearMounted();
        lifecycleMocks.clearActivated();
        lifecycleMocks.clearDeactivated();
    });

    scopedIt("should initially be false until onMounted runs", async () => {
        const isActive = useIsActive();

        expect(isActive.value).toBe(false);

        lifecycleMocks.runMountedHooks();
        await flushPromises();
        expect(isActive.value).toBe(true);
    });

    scopedIt("should become true onActivated and false onDeactivated", async () => {
        const isActive = useIsActive();

        expect(isActive.value).toBe(false);

        lifecycleMocks.runMountedHooks();
        await flushPromises();
        expect(isActive.value).toBe(true);

        lifecycleMocks.runDeactivatedHooks();
        await flushPromises();
        expect(isActive.value).toBe(false);

        lifecycleMocks.runActivatedHooks();
        await flushPromises();
        expect(isActive.value).toBe(true);
    });

    scopedIt("should not change when attempting to set isActive.value", async () => {
        const isActive = useIsActive();

        lifecycleMocks.runMountedHooks();
        await flushPromises();
        expect(isActive.value).toBe(true);

        expectReadOnlyWarning(() => {
            isActive.value = false;
        }, "value");
        expect(isActive.value).toBe(true);
    });
});
