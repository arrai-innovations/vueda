import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";

const { provideStore, mockedInject } = mockProvideInject(vi);
vi.mock("vue", async () => {
    const original = await vi.importActual("vue");
    return {
        __esModule: true,
        ...original,
        inject: mockedInject,
    };
});

describe("lib/use/useResolvedLookupObjects.js", () => {
    let useResolvedLookupObjects, vue;

    // A request that settles when the test calls `resolve`, and that records cancellation.
    const deferredRequest = () => {
        let settle;
        const promise = new Promise((resolve) => {
            settle = resolve;
        });
        promise.cancel = vi.fn(() => Promise.resolve());
        return { promise, resolve: settle };
    };

    const setup = (lookup, { app = "app", model = "model", pks = [13, 1], fields = ["id"], expand = [] } = {}) => {
        provideStore.set(LookupContextSymbol, lookup);
        const refs = {
            app: vue.ref(app),
            model: vue.ref(model),
            pks: vue.ref(pks),
            fields: vue.ref(fields),
            expand: vue.ref(expand),
        };
        const es = vue.effectScope();
        const result = es.run(() => useResolvedLookupObjects(refs.app, refs.model, refs.pks, refs.fields, refs.expand));
        return { refs, result, es };
    };

    beforeEach(async () => {
        vue = await vi.importActual("vue");
        useResolvedLookupObjects = (await import("@vueda/use/useResolvedLookupObjects.js")).useResolvedLookupObjects;
        provideStore.clear();
        vi.clearAllMocks();
    });

    scopedIt("requests every pk through the lookup context and keys the objects by pk string", async () => {
        const lookup = {
            requestObject: vi.fn((app, model, pk) => Promise.resolve({ id: Number(pk) })),
        };
        const { result, es } = setup(lookup);
        expect(result.loading).toBe(true);
        await flushPromises();

        expect(lookup.requestObject).toHaveBeenCalledTimes(2);
        expect(lookup.requestObject).toHaveBeenCalledWith("app", "model", "13", ["id"], []);
        expect(lookup.requestObject).toHaveBeenCalledWith("app", "model", "1", ["id"], []);
        expect(result.objects).toEqual({ 13: { id: 13 }, 1: { id: 1 } });
        expect(result.loading).toBe(false);
        es.stop();
    });

    scopedIt("maps a pk that the server does not return to undefined", async () => {
        const lookup = {
            requestObject: vi.fn((app, model, pk) => Promise.resolve(pk === "13" ? { id: 13 } : undefined)),
        };
        const { result, es } = setup(lookup);
        await flushPromises();

        expect(result.objects[13]).toEqual({ id: 13 });
        expect("1" in result.objects).toBe(true);
        expect(result.objects[1]).toBeUndefined();
        es.stop();
    });

    scopedIt("makes no request and clears loading when the pk list is empty", async () => {
        const lookup = { requestObject: vi.fn() };
        const { result, es } = setup(lookup, { pks: [] });
        await flushPromises();

        expect(lookup.requestObject).not.toHaveBeenCalled();
        expect(result.objects).toEqual({});
        expect(result.loading).toBe(false);
        es.stop();
    });

    scopedIt("ignores null, undefined, and empty pks", async () => {
        const lookup = { requestObject: vi.fn((app, model, pk) => Promise.resolve({ id: Number(pk) })) };
        const { result, es } = setup(lookup, { pks: [null, 13, undefined, ""] });
        await flushPromises();

        expect(lookup.requestObject).toHaveBeenCalledTimes(1);
        expect(result.objects).toEqual({ 13: { id: 13 } });
        es.stop();
    });

    scopedIt("does not request again when the pks change to an equal array", async () => {
        const lookup = { requestObject: vi.fn((app, model, pk) => Promise.resolve({ id: Number(pk) })) };
        const { refs, es } = setup(lookup);
        await flushPromises();
        lookup.requestObject.mockClear();

        refs.pks.value = [13, 1];
        await flushPromises();

        expect(lookup.requestObject).not.toHaveBeenCalled();
        es.stop();
    });

    scopedIt("cancels the previous requests and ignores their results when the pks change", async () => {
        const first = [deferredRequest(), deferredRequest()];
        const second = deferredRequest();
        const requests = { 13: first[0], 1: first[1], 2: second };
        const lookup = { requestObject: vi.fn((app, model, pk) => requests[pk].promise) };
        const { refs, result, es } = setup(lookup);

        refs.pks.value = [2];
        await flushPromises();
        expect(first[0].promise.cancel).toHaveBeenCalled();
        expect(first[1].promise.cancel).toHaveBeenCalled();

        first[0].resolve({ id: 13 });
        first[1].resolve({ id: 1 });
        await flushPromises();
        expect(result.objects).toEqual({});
        expect(result.loading).toBe(true);

        second.resolve({ id: 2 });
        await flushPromises();
        expect(result.objects).toEqual({ 2: { id: 2 } });
        expect(result.loading).toBe(false);
        es.stop();
    });

    scopedIt("cancels the requests and clears objects and loading when the pks become empty", async () => {
        const requests = [deferredRequest(), deferredRequest()];
        let index = 0;
        const lookup = { requestObject: vi.fn(() => requests[index++].promise) };
        const { refs, result, es } = setup(lookup);
        expect(result.loading).toBe(true);

        refs.pks.value = [];
        await flushPromises();

        expect(requests[0].promise.cancel).toHaveBeenCalled();
        expect(requests[1].promise.cancel).toHaveBeenCalled();
        expect(result.objects).toEqual({});
        expect(result.loading).toBe(false);
        es.stop();
    });

    scopedIt("cancels the requests when the scope is disposed", async () => {
        const requests = [deferredRequest(), deferredRequest()];
        let index = 0;
        const lookup = { requestObject: vi.fn(() => requests[index++].promise) };
        const { result, es } = setup(lookup);

        result.effectScope.stop();
        expect(requests[0].promise.cancel).toHaveBeenCalled();
        expect(requests[1].promise.cancel).toHaveBeenCalled();
        es.stop();
    });

    scopedIt("sets the error and keeps the objects that resolved when one request fails", async () => {
        const error = new Error("fail");
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const lookup = {
            requestObject: vi.fn((app, model, pk) =>
                pk === "13" ? Promise.reject(error) : Promise.resolve({ id: 1 }),
            ),
        };
        const { result, es } = setup(lookup);
        await flushPromises();

        expect(result.errored).toBe(true);
        expect(result.error).toBe(error);
        expect(result.objects).toEqual({ 13: undefined, 1: { id: 1 } });
        expect(result.loading).toBe(false);
        consoleError.mockRestore();
        es.stop();
    });

    scopedIt("clears a previous error when new pks load", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const lookup = {
            requestObject: vi.fn((app, model, pk) =>
                pk === "13" ? Promise.reject(new Error("fail")) : Promise.resolve({ id: Number(pk) }),
            ),
        };
        const { refs, result, es } = setup(lookup);
        await flushPromises();
        expect(result.errored).toBe(true);

        refs.pks.value = [1];
        await flushPromises();

        expect(result.errored).toBe(false);
        expect(result.objects).toEqual({ 1: { id: 1 } });
        consoleError.mockRestore();
        es.stop();
    });
});
