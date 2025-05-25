import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

let retrieveSpy;
let useLookupContext;

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock("@vueda/stores/storeModelConfig.js", () => ({
        storeModelConfig: () => ({
            getConfig: () => Promise.resolve({ info: { pk: "id" } }),
        }),
    }));

    vi.doMock("@arrai-innovations/reactive-helpers", async () => {
        const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
        const vue = await vi.importActual("vue");
        return {
            __esModule: true,
            ...actual,
            useObject: ({ props }) => {
                const state = vue.reactive({
                    crud: {
                        args: {
                            app: props.target.app,
                            model: props.target.model,
                            pkKey: props.pkKey,
                        },
                    },
                    params: props.params,
                    pk: props.pk,
                    object: {},
                });
                retrieveSpy = vi.fn(() => {
                    state.object = { id: props.pk, val: "ok" };
                    return actual.CancellablePromise.resolve(true);
                });
                return {
                    state,
                    retrieve: retrieveSpy,
                    clear: vi.fn(),
                };
            },
            useList: vi.fn(),
        };
    });

    useLookupContext = (await import("@vueda/use/useLookupContext.js")).useLookupContext;
});

afterEach(() => {
    vi.useRealTimers();
});

describe("lib/use/useLookupContext.js", () => {
    describe("cache hits for identical requests", () => {
        scopedIt("returns the cached object on the 2nd call (no new retrieve)", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", ["b", "a"], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            const obj1 = await p1;
            expect(obj1).toEqual({ id: "1", val: "ok" });
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("app", "model", "1", ["b", "a"], []);
            await flushPromises();
            const obj2 = await p2;
            expect(obj2).toEqual({ id: "1", val: "ok" });
            expect(retrieveSpy).toHaveBeenCalledTimes(1);
        });

        scopedIt("ignores order of fields when computing the key", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", ["b", "a"], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p1;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("app", "model", "1", ["a", "b"], []);
            await flushPromises();
            await p2;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);
        });

        scopedIt("ignores order of expand when computing the key", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], ["y", "x"]);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p1;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("app", "model", "1", [], ["x", "y"]);
            await flushPromises();
            await p2;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);
        });

        scopedIt("creates a fresh cache entry when *fields* differ", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", ["a"], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p1;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("app", "model", "1", ["b"], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p2;
            expect(retrieveSpy).toHaveBeenCalledTimes(2);
        });

        scopedIt("creates a fresh cache entry when *expand* differs", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], ["a"]);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p1;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("app", "model", "1", [], ["b"]);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p2;
            expect(retrieveSpy).toHaveBeenCalledTimes(2);
        });

        scopedIt("separates cache by app + model namespace", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("a1", "m1", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p1;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("a2", "m2", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p2;
            expect(retrieveSpy).toHaveBeenCalledTimes(2);
        });
    });
});
