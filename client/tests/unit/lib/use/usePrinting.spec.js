import { mockLifecycle, scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

const { mockedOnUnmounted, unmountedFunctions, clearUnmounted } = mockLifecycle(vi);

vi.mock("vue", async () => {
    const original = await vi.importActual("vue");
    return {
        __esModule: true,
        ...original,
        onUnmounted: mockedOnUnmounted, // override onUnmounted
    };
});

describe("lib/use/usePrinting.js", () => {
    let usePrinting;

    beforeEach(async () => {
        usePrinting = await vi.importActual("@vueda/use/usePrinting.js").then((m) => m.usePrinting);
    });

    afterEach(() => {
        clearUnmounted();
        vi.clearAllMocks();
    });

    scopedIt("reflects the initial media query state", async () => {
        const addEventListenerSpy = vi.fn();
        const removeEventListenerSpy = vi.fn();
        const mediaQueryList = {
            matches: true,
            addEventListener: addEventListenerSpy,
            removeEventListener: removeEventListenerSpy,
        };
        vi.spyOn(window, "matchMedia").mockImplementation((query) => {
            expect(query).toBe("print");
            return mediaQueryList;
        });
        const printingRef = usePrinting();
        expect(printingRef.value).toBe(true);
    });

    scopedIt("updates when media query changes", async () => {
        const addEventListenerSpy = vi.fn();
        const removeEventListenerSpy = vi.fn();
        const mediaQueryList = {
            matches: false,
            addEventListener: addEventListenerSpy,
            removeEventListener: removeEventListenerSpy,
        };
        vi.spyOn(window, "matchMedia").mockReturnValue(mediaQueryList);
        const printingRef = usePrinting();
        expect(printingRef.value).toBe(false);
        const changeHandler = addEventListenerSpy.mock.calls[0][1];
        mediaQueryList.matches = true;
        changeHandler({ matches: true });
        await flushPromises();
        expect(printingRef.value).toBe(true);
    });

    scopedIt("removes event listener on unmount", async () => {
        const addEventListenerSpy = vi.fn();
        const removeEventListenerSpy = vi.fn();
        const mediaQueryList = {
            matches: false,
            addEventListener: addEventListenerSpy,
            removeEventListener: removeEventListenerSpy,
        };
        vi.spyOn(window, "matchMedia").mockReturnValue(mediaQueryList);
        usePrinting();
        expect(removeEventListenerSpy).not.toHaveBeenCalled();
        unmountedFunctions.forEach((fn) => fn());
        await flushPromises();
        expect(removeEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
    });

    scopedIt("returns a read-only ref", async () => {
        vi.spyOn(window, "matchMedia").mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
        const printingRef = usePrinting();
        // [Vue warn] is expected here, it's exactly what we want to test
        printingRef.value = true;
        expect(printingRef.value).toBe(false);
    });
});
