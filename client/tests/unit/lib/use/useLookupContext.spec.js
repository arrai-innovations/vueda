import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

let retrieveSpy;
let listSpy;
let listState;
let useListMock;
let cancelRetrieveSpy;
let cancelListSpy;
let retrieveDeferred;
let listDeferred;
let useLookupContext;
let retrieveSpies;

const makeDeferred = () => {
    let resolve, reject;
    // eslint-disable-next-line promise/param-names
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

let forceSyncRetrieveError = false;

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();

    retrieveDeferred = null;
    listDeferred = null;
    cancelRetrieveSpy = vi.fn();
    cancelListSpy = vi.fn();
    retrieveSpies = [];
    listState = null;
    useListMock = null;

    vi.doMock("@vueda/stores/storeModelInfo.js", () => ({
        storeModelInfo: () => ({
            fetchModelInfo: () => Promise.resolve({ pk: "id" }),
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
                    if (forceSyncRetrieveError) {
                        throw new Error("sync boom");
                    }
                    state.object = { id: props.pk, val: "ok" };
                    const inner = retrieveDeferred ? retrieveDeferred.promise : Promise.resolve(true);
                    return actual.CancellablePromise(inner, cancelRetrieveSpy);
                });
                retrieveSpies.push(retrieveSpy);
                return {
                    state,
                    retrieve: retrieveSpy,
                    clear: vi.fn(),
                };
            },
            useList: (useListMock = vi.fn(({ props }) => {
                listState = vue.reactive({
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
                        listState.objects[pk] = { id: pk, val: "ok" };
                    }
                    const inner = listDeferred ? listDeferred.promise : Promise.resolve(true);
                    return actual.CancellablePromise(inner, cancelListSpy);
                });
                return { state: listState, list: listSpy, clearList: vi.fn() };
            })),
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

        scopedIt("returns cached list results on second identical call", async () => {
            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            const p2 = lookup.requestObject("app", "model", "2", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();

            await p1;
            await p2;

            const p3 = lookup.requestObject("app", "model", "1", [], []);
            const p4 = lookup.requestObject("app", "model", "2", [], []);
            await flushPromises();

            expect(listSpy).toHaveBeenCalledTimes(1);
            await expect(p3).resolves.toEqual({ id: "1", val: "ok" });
            await expect(p4).resolves.toEqual({ id: "2", val: "ok" });
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

        scopedIt(
            "creates a fresh request when the *fields* differ while the first call is still in-flight",
            async () => {
                const deferred1 = (retrieveDeferred = makeDeferred());
                const lookup = useLookupContext();
                const p1 = lookup.requestObject("app", "model", "1", ["a"], []);
                await vi.advanceTimersByTimeAsync(300);
                await flushPromises();

                const deferred2 = (retrieveDeferred = makeDeferred());
                const p2 = lookup.requestObject("app", "model", "1", ["b"], []);
                await vi.advanceTimersByTimeAsync(300);
                await flushPromises();

                expect(retrieveSpies).toHaveLength(2);
                expect(retrieveSpies[0]).toHaveBeenCalledTimes(1);
                expect(retrieveSpies[1]).toHaveBeenCalledTimes(1);

                let p2Resolved = false;
                p2.then(() => {
                    p2Resolved = true;
                });

                deferred1.resolve(true);
                await flushPromises();
                await expect(p1).resolves.toEqual({ id: "1", val: "ok" });
                expect(p2Resolved).toBe(false);

                deferred2.resolve(true);
                await flushPromises();
                await expect(p2).resolves.toEqual({ id: "1", val: "ok" });
            },
        );

        scopedIt(
            "creates a fresh request when the *expands* differ while the first call is still in-flight",
            async () => {
                const deferred1 = (retrieveDeferred = makeDeferred());
                const lookup = useLookupContext();
                const p1 = lookup.requestObject("app", "model", "1", [], ["a"]);
                await vi.advanceTimersByTimeAsync(300);
                await flushPromises();

                const deferred2 = (retrieveDeferred = makeDeferred());
                const p2 = lookup.requestObject("app", "model", "1", [], ["b"]);
                await vi.advanceTimersByTimeAsync(300);
                await flushPromises();

                expect(retrieveSpies).toHaveLength(2);
                expect(retrieveSpies[0]).toHaveBeenCalledTimes(1);
                expect(retrieveSpies[1]).toHaveBeenCalledTimes(1);

                let p2Resolved = false;
                p2.then(() => {
                    p2Resolved = true;
                });

                deferred1.resolve(true);
                await flushPromises();
                await expect(p1).resolves.toEqual({ id: "1", val: "ok" });
                expect(p2Resolved).toBe(false);

                deferred2.resolve(true);
                await flushPromises();
                await expect(p2).resolves.toEqual({ id: "1", val: "ok" });
            },
        );

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

        scopedIt("retains previous cache entries when requesting a new pk later", async () => {
            const lookup = useLookupContext();

            const first = lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await first;
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const second = lookup.requestObject("app", "model", "2", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await second;
            expect(retrieveSpy).toHaveBeenCalledTimes(2);

            const again = lookup.requestObject("app", "model", "1", [], []);
            await flushPromises();
            await expect(again).resolves.toEqual({ id: "1", val: "ok" });
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

        scopedIt("propagates a single retrieve() rejection to all in-flight consumers (no extra call)", async () => {
            retrieveDeferred = makeDeferred();
            const lookup = useLookupContext();

            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const p1 = lookup.requestObject("app", "model", "1", [], []);
            await vi.advanceTimersByTimeAsync(250);
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("app", "model", "1", [], []);
            p1.catch(() => {});
            p2.catch(() => {});

            const err = new Error("boom");
            retrieveDeferred.promise.catch(() => {});
            retrieveDeferred.reject(err);

            await flushPromises();

            await expect(p1).rejects.toBe(err);
            await expect(p2).rejects.toBe(err);

            expect(retrieveSpy).toHaveBeenCalledTimes(1);
            expect(listSpy).not.toHaveBeenCalled();
            errorSpy.mockRestore();
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

        scopedIt("uses list manager for multi-PK batched request", async () => {
            const lookup = useLookupContext();

            const p1 = lookup.requestObject("app", "model", "1", [], []);
            const p2 = lookup.requestObject("app", "model", "2", [], []);

            await vi.advanceTimersByTimeAsync(250); // trigger debounce
            await flushPromises();

            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(retrieveSpy).not.toHaveBeenCalled();

            await expect(p1).resolves.toEqual({ id: "1", val: "ok" });
            await expect(p2).resolves.toEqual({ id: "2", val: "ok" });
        });
    });

    describe("manager reuse across app/model pairs", () => {
        scopedIt("updates params and crud args when reused", async () => {
            const lookup = useLookupContext();

            const p1 = lookup.requestObject("a1", "m1", "1", [], []);
            const p2 = lookup.requestObject("a1", "m1", "2", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await p1;
            await p2;

            expect(useListMock).toHaveBeenCalledTimes(1);
            expect(listSpy).toHaveBeenCalledTimes(1);
            expect(listState.crud.args.app).toBe("a1");
            expect(listState.crud.args.model).toBe("m1");
            expect(listState.params.id).toEqual(["1", "2"]);

            const q1 = lookup.requestObject("a2", "m2", "3", [], []);
            const q2 = lookup.requestObject("a2", "m2", "4", [], []);
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await q1;
            await q2;

            expect(useListMock).toHaveBeenCalledTimes(1);
            expect(listSpy).toHaveBeenCalledTimes(2);
            expect(listState.crud.args.app).toBe("a2");
            expect(listState.crud.args.model).toBe("m2");
            expect(listState.params.id).toEqual(["3", "4"]);
        });
    });

    describe("optional arguments", () => {
        scopedIt("handles calls without fields or expand", async () => {
            const lookup = useLookupContext();

            const p1 = lookup.requestObject("app", "model", "1");
            await vi.advanceTimersByTimeAsync(250);
            await flushPromises();
            await expect(p1).resolves.toEqual({ id: "1", val: "ok" });
            expect(retrieveSpy).toHaveBeenCalledTimes(1);

            const p2 = lookup.requestObject("app", "model", "1");
            await flushPromises();
            await expect(p2).resolves.toEqual({ id: "1", val: "ok" });
            expect(retrieveSpy).toHaveBeenCalledTimes(1);
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

    describe("error propagation", () => {
        scopedIt("propagates a synchronous exception from runRequestBatch", async () => {
            const handler = (err) => {
                if (err?.message === "sync boom") {
                    return;
                }
                throw err;
            };
            process.on("unhandledRejection", handler);
            forceSyncRetrieveError = true;
            try {
                const lookup = useLookupContext();

                const p = lookup.requestObject("app", "model", "1", [], []);
                await vi.advanceTimersByTimeAsync(300);

                await expect(p).rejects.toThrow("sync boom");
            } finally {
                forceSyncRetrieveError = false;
                process.off("unhandledRejection", handler);
            }
        });

        scopedIt("propagates error from list manager to all consumers", async () => {
            const handler = (err) => {
                if (err?.message === "list fetch failed") {
                    return;
                }
                throw err;
            };
            process.on("unhandledRejection", handler);
            listDeferred = makeDeferred();

            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            try {
                const lookup = useLookupContext();

                const p1 = lookup.requestObject("app", "model", "1", [], []);
                const p2 = lookup.requestObject("app", "model", "2", [], []);
                await vi.advanceTimersByTimeAsync(300);
                await flushPromises();

                const err = new Error("list fetch failed");
                listDeferred.reject(err);

                await flushPromises();
                await expect(p1).rejects.toBe(err);
                await expect(p2).rejects.toBe(err);
            } finally {
                errorSpy.mockRestore();
                process.off("unhandledRejection", handler);
            }
        });
    });

    describe("warnings", () => {
        scopedIt('logs "skipped request, no consumers"', async () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const lookup = useLookupContext();
            const p = lookup.requestObject("app", "model", "1", [], []);
            await p.cancel();
            await vi.advanceTimersByTimeAsync(300);

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("skipped request, no consumers"),
                expect.any(String),
                expect.any(Array),
                expect.any(Array),
            );

            warnSpy.mockRestore();
        });

        scopedIt('logs "No inflightPromise yet"', async () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const lookup = useLookupContext();
            const p = lookup.requestObject("app", "model", "1", [], []);
            await p.cancel();

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("No inflightPromise yet for"),
                expect.any(String),
                "1",
                expect.any(String),
            );

            warnSpy.mockRestore();
        });

        scopedIt("logs on double cancel", async () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const lookup = useLookupContext();
            const p = lookup.requestObject("app", "model", "1", [], []);
            await p.cancel();
            await p.cancel();

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("already cleaned up"),
                expect.any(String),
                "1",
            );

            warnSpy.mockRestore();
        });

        scopedIt('logs "No consumers for this request"', async () => {
            listDeferred = makeDeferred();
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            lookup.requestObject("app", "model", "2", [], []);
            await vi.advanceTimersByTimeAsync(300);
            await p1.cancel();

            listDeferred.resolve(true);
            await flushPromises();

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("No consumers for this request"),
                expect.any(String),
                "1",
                expect.any(Object),
            );

            warnSpy.mockRestore();
        });

        scopedIt("logs error in runRequestBatch (async)", async () => {
            listDeferred = makeDeferred();
            const err = new Error("async boom");
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const lookup = useLookupContext();
            const p1 = lookup.requestObject("app", "model", "1", [], []);
            const p2 = lookup.requestObject("app", "model", "2", [], []);
            await vi.advanceTimersByTimeAsync(300);

            listDeferred.reject(err);
            await expect(p1).rejects.toBe(err);
            await expect(p2).rejects.toBe(err);

            expect(errorSpy).toHaveBeenCalledWith("[scheduledRequest] Error in runRequestBatch:", err);

            errorSpy.mockRestore();
        });

        scopedIt("warns when underlying cancel throws", async () => {
            cancelRetrieveSpy = vi.fn(() => {
                throw new Error("cancel blew up");
            });

            retrieveDeferred = makeDeferred();
            const lookup = useLookupContext();
            const p = lookup.requestObject("app", "model", "1", [], []);

            await vi.advanceTimersByTimeAsync(300);
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            await p.cancel();

            expect(warnSpy).toHaveBeenCalledWith(
                "[useLookupContext.batchPromise.cancel] cancel failed",
                expect.any(Error),
            );

            warnSpy.mockRestore();
        });
    });
});
