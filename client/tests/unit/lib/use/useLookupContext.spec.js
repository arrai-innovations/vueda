import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

let retrieveSpy;
let listSpy;
let cancelRetrieveSpy;
let cancelListSpy;
let retrieveDeferred;
let listDeferred;
let useLookupContext;

const makeDeferred = () => {
    let resolve;
    const promise = new Promise((r) => {
        resolve = r;
    });
    return { promise, resolve };
};

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();

    retrieveDeferred = null;
    listDeferred = null;
    cancelRetrieveSpy = vi.fn();
    cancelListSpy = vi.fn();

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
                    const inner = retrieveDeferred ? retrieveDeferred.promise : Promise.resolve(true);
                    return actual.CancellablePromise(inner, cancelRetrieveSpy);
                });
                return {
                    state,
                    retrieve: retrieveSpy,
                    clear: vi.fn(),
                };
            },
            useList: vi.fn(({ props }) => {
                const state = vue.reactive({
                    crud: {
                        args: {
                            app: props.target.app,
                            model: props.target.model,
                            pkKey: props.pkKey,
                        },
                    },
                    params: props.params,
                    objects: {},
                });
                listSpy = vi.fn(() => {
                    for (const pk of props.params.id) {
                        state.objects[pk] = { id: pk, val: "ok" };
                    }
                    const inner = listDeferred ? listDeferred.promise : Promise.resolve(true);
                    return actual.CancellablePromise(inner, cancelListSpy);
                });
                return { state, list: listSpy, clearList: vi.fn() };
            }),
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

    describe("deduplicates concurrent requests", () => {
        scopedIt("second caller during in-flight shares the same promise", async () => {
            retrieveDeferred = makeDeferred();
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            const p2 = lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(300);
            await flushPromises();
            expect(listSpy).toHaveBeenCalledTimes(1);
            retrieveDeferred.resolve(true);
            await flushPromises();
            await expect(p1).resolves.toEqual({ id: "1", val: "ok" });
            await expect(p2).resolves.toEqual({ id: "1", val: "ok" });
        });

        scopedIt("all callers receive the same resolved value", async () => {
            retrieveDeferred = makeDeferred();
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            const p2 = lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            retrieveDeferred.resolve(true);
            await flushPromises();
            const v1 = await p1;
            const v2 = await p2;
            expect(v1).toBe(v2);
        });

        scopedIt("cancelling *one* consumer keeps the request alive for the rest", async () => {
            retrieveDeferred = makeDeferred();
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            const p2 = lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await p1.cancel();
            expect(cancelRetrieveSpy).not.toHaveBeenCalled();
            retrieveDeferred.resolve(true);
            await flushPromises();
            await expect(p2).resolves.toEqual({ id: "1", val: "ok" });
        });

        scopedIt("cancelling the **last** consumer aborts the underlying retrieve", async () => {
            retrieveDeferred = makeDeferred();
            const lookup = useLookupContext();
            const p = lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await p.cancel();
            expect(cancelRetrieveSpy).toHaveBeenCalled();
            retrieveDeferred.resolve(true);
        });
    });

    describe("request batching window", () => {
        scopedIt("multiple PKs queued inside 250 ms trigger a *single* list() call", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            const p2 = lookup.requestObject("app", "model", "2", [], []);
            await vi.advanceTimersByTimeAsync(250);
            expect(listSpy).toHaveBeenCalledTimes(1);
            await flushPromises();
            await expect(p1).resolves.toEqual({ id: "1", val: "ok" });
            await expect(p2).resolves.toEqual({ id: "2", val: "ok" });
        });

        scopedIt("requests separated by > 250 ms but < maxWait still batch", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(200);
            const p2 = lookup.requestObject("app", "model", "2", [], []);
            await vi.advanceTimersByTimeAsync(200);
            const p3 = lookup.requestObject("app", "model", "3", [], []);
            await vi.advanceTimersByTimeAsync(250);
            expect(listSpy).toHaveBeenCalledTimes(1);
            await flushPromises();
            await expect(p1).resolves.toEqual({ id: "1", val: "ok" });
            await expect(p2).resolves.toEqual({ id: "2", val: "ok" });
            await expect(p3).resolves.toEqual({ id: "3", val: "ok" });
        });

        scopedIt("after maxWait (1 s) the queue is flushed automatically", async () => {
            const lookup = useLookupContext();
            const promises = [lookup.requestObject("app", "model", "1", [], [])];
            for (let i = 2; i <= 4; i++) {
                await vi.advanceTimersByTimeAsync(200);
                promises.push(lookup.requestObject("app", "model", String(i), [], []));
            }
            await vi.advanceTimersByTimeAsync(400); // exceed maxWait
            await flushPromises();
            expect(listSpy).toHaveBeenCalledTimes(1);
            await Promise.all(promises);
        });
    });

    describe("object vs list manager", () => {
        scopedIt("uses *object* manager for a single-PK batch", async () => {
            const lookup = useLookupContext();
            lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            expect(retrieveSpy).toHaveBeenCalledTimes(1);
            expect(listSpy).toHaveBeenCalledTimes(0);
        });

        scopedIt("uses *list* manager for a multi-PK batch", async () => {
            const lookup = useLookupContext();
            lookup.requestObject("app", "model", "1", [], []);
            lookup.requestObject("app", "model", "2", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(retrieveSpy).not.toHaveBeenCalled();
        });
    });

    describe("re-requesting after cancellation", () => {
        scopedIt("cancelled request can be retried with fresh retrieve call", async () => {
            retrieveDeferred = makeDeferred();
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            await p1.cancel();
            retrieveDeferred = null;

            const p2 = lookup.requestObject("app", "model", "1", [], []);

            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();

            await expect(p2).resolves.toEqual({ id: "1", val: "ok" });
        });
    });
});
