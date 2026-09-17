import { scopedIt } from "@tests/unit/utils.js";
import { ref } from "vue";

const { MockMaskInput, mountedFns, disposeFns, mockedTryOnMounted, mockedTryOnScopeDispose } = vi.hoisted(() => {
    const mountedFns = [];
    const disposeFns = [];
    return {
        MockMaskInput: vi.fn(function () {
            return {
                update: vi.fn(),
                destroy: vi.fn(),
            };
        }),
        mountedFns,
        disposeFns,
        mockedTryOnMounted: vi.fn((fn) => mountedFns.push(fn)),
        mockedTryOnScopeDispose: vi.fn((fn) => disposeFns.push(fn)),
    };
});

vi.mock("maska", () => ({ MaskInput: MockMaskInput }));

vi.mock("@vueuse/core", async () => {
    const actual = await vi.importActual("@vueuse/core");
    return {
        ...actual,
        tryOnMounted: mockedTryOnMounted,
        tryOnScopeDispose: mockedTryOnScopeDispose,
    };
});

const runMountedHooks = () => {
    for (const fn of mountedFns) fn();
};
const runDisposeHooks = () => {
    for (const fn of disposeFns) fn();
};

const importModule = () => import("@vueda/use/useMaska.js");

describe("lib/use/useMaska.js", () => {
    let useMaska;

    beforeEach(async () => {
        useMaska = (await importModule()).useMaska;
        MockMaskInput.mockClear();
        mockedTryOnMounted.mockClear();
        mockedTryOnScopeDispose.mockClear();
        mountedFns.length = 0;
        disposeFns.length = 0;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Return shape", () => {
        scopedIt("returns masked, unmasked, completed refs and destroy method", () => {
            const target = ref(null);
            const result = useMaska(target, ref({ mask: "###" }));
            expect(result).toHaveProperty("masked");
            expect(result).toHaveProperty("unmasked");
            expect(result).toHaveProperty("completed");
            expect(result).toHaveProperty("destroy");
            expect(typeof result.destroy).toBe("function");
        });

        scopedIt("does not expose an initialize method", () => {
            const target = ref(null);
            const result = useMaska(target, ref({ mask: "###" }));
            expect(result).not.toHaveProperty("initialize");
        });

        scopedIt("returns readonly refs for masked, unmasked, and completed", () => {
            const target = ref(null);
            const { masked, unmasked, completed } = useMaska(target, ref({ mask: "###" }));
            expect(masked.value).toBe("");
            expect(unmasked.value).toBe("");
            expect(completed.value).toBe(false);
        });
    });

    describe("Lifecycle", () => {
        scopedIt("registers tryOnMounted and tryOnScopeDispose hooks", () => {
            const target = ref(null);
            useMaska(target, ref({ mask: "###" }));
            expect(mockedTryOnMounted).toHaveBeenCalledTimes(1);
            expect(mockedTryOnScopeDispose).toHaveBeenCalledTimes(1);
        });

        scopedIt("creates MaskInput on mount when target is an element", () => {
            const el = document.createElement("input");
            const target = ref(el);
            useMaska(target, ref({ mask: "###" }));
            expect(MockMaskInput).not.toHaveBeenCalled();
            runMountedHooks();
            expect(MockMaskInput).toHaveBeenCalledTimes(1);
            expect(MockMaskInput.mock.calls[0][0]).toBe(el);
        });

        scopedIt("does not create MaskInput on mount when target is null", () => {
            const target = ref(null);
            useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            expect(MockMaskInput).not.toHaveBeenCalled();
        });

        scopedIt("destroys MaskInput on scope dispose", () => {
            const el = document.createElement("input");
            const target = ref(el);
            useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            const instance = MockMaskInput.mock.results[0].value;
            runDisposeHooks();
            expect(instance.destroy).toHaveBeenCalledTimes(1);
        });

        scopedIt("scope dispose is safe when already destroyed early", () => {
            const el = document.createElement("input");
            const target = ref(el);
            const { destroy } = useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            const instance = MockMaskInput.mock.results[0].value;
            destroy();
            expect(instance.destroy).toHaveBeenCalledTimes(1);
            expect(() => runDisposeHooks()).not.toThrow();
            expect(instance.destroy).toHaveBeenCalledTimes(1);
        });
    });

    describe("Initialization", () => {
        scopedIt("unwraps component $el from target ref", () => {
            const el = document.createElement("input");
            const target = ref({ $el: el });
            useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            expect(MockMaskInput).toHaveBeenCalledTimes(1);
            expect(MockMaskInput.mock.calls[0][0]).toBe(el);
        });

        scopedIt("passes mask options with onMaska callback to MaskInput", () => {
            const el = document.createElement("input");
            const target = ref(el);
            useMaska(target, ref({ mask: "###-####" }));
            runMountedHooks();
            const config = MockMaskInput.mock.calls[0][1];
            expect(config.mask).toBe("###-####");
            expect(typeof config.onMaska).toBe("function");
        });
    });

    describe("Early destruction", () => {
        scopedIt("calls destroy on the MaskInput instance", () => {
            const el = document.createElement("input");
            const target = ref(el);
            const { destroy } = useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            const instance = MockMaskInput.mock.results[0].value;
            destroy();
            expect(instance.destroy).toHaveBeenCalledTimes(1);
        });

        scopedIt("is safe to call destroy when not initialized", () => {
            const target = ref(null);
            const { destroy } = useMaska(target, ref({ mask: "###" }));
            expect(() => destroy()).not.toThrow();
        });

        scopedIt("is safe to call destroy multiple times", () => {
            const el = document.createElement("input");
            const target = ref(el);
            const { destroy } = useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            const instance = MockMaskInput.mock.results[0].value;
            destroy();
            destroy();
            expect(instance.destroy).toHaveBeenCalledTimes(1);
        });
    });

    describe("onMaska callback", () => {
        scopedIt("updates masked, unmasked, and completed refs", () => {
            const el = document.createElement("input");
            const target = ref(el);
            const { masked, unmasked, completed } = useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            const config = MockMaskInput.mock.calls[0][1];
            config.onMaska({ masked: "1-2", unmasked: "12", completed: false });
            expect(masked.value).toBe("1-2");
            expect(unmasked.value).toBe("12");
            expect(completed.value).toBe(false);

            config.onMaska({ masked: "1-2-3", unmasked: "123", completed: true });
            expect(masked.value).toBe("1-2-3");
            expect(unmasked.value).toBe("123");
            expect(completed.value).toBe(true);
        });
    });

    describe("Reactive options watch", () => {
        scopedIt("calls update on the instance when options change", async () => {
            const el = document.createElement("input");
            const target = ref(el);
            const options = ref({ mask: "###" });
            useMaska(target, options);
            runMountedHooks();
            const instance = MockMaskInput.mock.results[0].value;

            options.value = { mask: "####-####" };
            const { nextTick } = await vi.importActual("vue");
            await nextTick();

            expect(instance.update).toHaveBeenCalledTimes(1);
            const updateConfig = instance.update.mock.calls[0][0];
            expect(updateConfig.mask).toBe("####-####");
            expect(typeof updateConfig.onMaska).toBe("function");
        });
    });

    describe("Target element watch", () => {
        scopedIt("re-initializes when target element changes", async () => {
            const el1 = document.createElement("input");
            const el2 = document.createElement("input");
            const target = ref(el1);
            useMaska(target, ref({ mask: "###" }));
            runMountedHooks();
            const firstInstance = MockMaskInput.mock.results[0].value;

            target.value = el2;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();

            expect(firstInstance.destroy).toHaveBeenCalledTimes(1);
            expect(MockMaskInput).toHaveBeenCalledTimes(2);
            expect(MockMaskInput.mock.calls[1][0]).toBe(el2);
        });

        scopedIt("does not re-initialize when target becomes null", async () => {
            const el = document.createElement("input");
            const target = ref(el);
            useMaska(target, ref({ mask: "###" }));
            runMountedHooks();

            target.value = null;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();

            expect(MockMaskInput).toHaveBeenCalledTimes(1);
        });
    });
});
