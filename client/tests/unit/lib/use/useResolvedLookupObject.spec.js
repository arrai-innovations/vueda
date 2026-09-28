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

let loadingErrorInstance;
let mockedUseLoadingError;
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    const vue = await vi.importActual("vue");
    loadingErrorInstance = {
        loading: vue.ref(false),
        error: vue.ref(null),
        errored: vue.ref(false),
        clearError: vi.fn(),
        setError: vi.fn(),
        setLoading: vi.fn(),
        clearLoading: vi.fn(),
    };
    mockedUseLoadingError = vi.fn(() => loadingErrorInstance);
    return {
        __esModule: true,
        ...actual,
        useLoadingError: mockedUseLoadingError,
    };
});

describe("lib/use/useResolvedLookupObject.js", () => {
    let useResolvedLookupObject, vue;
    beforeEach(async () => {
        vue = await vi.importActual("vue");
        useResolvedLookupObject = (await import("@vueda/use/useResolvedLookupObject.js")).useResolvedLookupObject;
        provideStore.clear();
        vi.clearAllMocks();
    });

    scopedIt("fetches object when params are valid", async () => {
        const lookup = {
            requestObject: vi.fn(() => Promise.resolve({ id: 1 })),
        };
        provideStore.set(LookupContextSymbol, lookup);

        let result;
        const es = vue.effectScope();
        es.run(() => {
            result = useResolvedLookupObject(
                vue.ref("app"),
                vue.ref("model"),
                vue.ref("1"),
                vue.ref(["id"]),
                vue.ref([]),
            );
        });
        await flushPromises();

        expect(lookup.requestObject).toHaveBeenCalledWith("app", "model", "1", ["id"], []);
        expect(result.object).toEqual({ id: 1 });
        expect(mockedUseLoadingError).toHaveBeenCalled();
        expect(loadingErrorInstance.setLoading).toHaveBeenCalled();
        expect(loadingErrorInstance.clearLoading).toHaveBeenCalled();
        es.stop();
    });

    scopedIt("skips fetch when app, model, or pk is missing", async () => {
        const lookup = { requestObject: vi.fn() };
        provideStore.set(LookupContextSymbol, lookup);

        let result;
        const es = vue.effectScope();
        es.run(() => {
            result = useResolvedLookupObject(vue.ref("app"), vue.ref("model"), vue.ref(""), vue.ref([]), vue.ref([]));
        });
        await flushPromises();

        expect(lookup.requestObject).not.toHaveBeenCalled();
        expect(result.object).toEqual({});
        es.stop();
    });

    scopedIt("clears object when lookup returns non-object", async () => {
        const lookup = { requestObject: vi.fn(() => Promise.resolve(null)) };
        provideStore.set(LookupContextSymbol, lookup);

        let result;
        const es = vue.effectScope();
        es.run(() => {
            result = useResolvedLookupObject(vue.ref("app"), vue.ref("model"), vue.ref("1"), vue.ref([]), vue.ref([]));
        });
        await flushPromises();

        expect(result.object).toEqual({});
        es.stop();
    });

    scopedIt("sets error state when lookup fails", async () => {
        const error = new Error("fail");
        const lookup = { requestObject: vi.fn(() => Promise.reject(error)) };
        provideStore.set(LookupContextSymbol, lookup);

        const es = vue.effectScope();
        es.run(() => {
            useResolvedLookupObject(vue.ref("app"), vue.ref("model"), vue.ref("1"), vue.ref([]), vue.ref([]));
        });
        await flushPromises();

        expect(loadingErrorInstance.setError).toHaveBeenCalledWith(error);
        es.stop();
    });

    describe("Request triggers", () => {
        const mountLookup = (refs) => {
            const lookup = { requestObject: vi.fn(() => Promise.resolve({ id: 1 })) };
            provideStore.set(LookupContextSymbol, lookup);
            const es = vue.effectScope();
            es.run(() => useResolvedLookupObject(refs.app, refs.model, refs.pk, refs.fields, refs.expand));
            return { lookup, es };
        };

        scopedIt("fetches on mount when fields and expand are not given", async () => {
            const refs = {
                app: vue.ref("app"),
                model: vue.ref("model"),
                pk: vue.ref("1"),
                fields: vue.ref(undefined),
                expand: vue.ref(undefined),
            };
            const { lookup, es } = mountLookup(refs);
            await flushPromises();

            expect(lookup.requestObject).toHaveBeenCalledWith("app", "model", "1", undefined, undefined);
            es.stop();
        });

        scopedIt("does not refetch when fields and expand are replaced with equal arrays", async () => {
            const refs = {
                app: vue.ref("app"),
                model: vue.ref("model"),
                pk: vue.ref("1"),
                fields: vue.ref(["id"]),
                expand: vue.ref(["owner"]),
            };
            const { lookup, es } = mountLookup(refs);
            await flushPromises();

            refs.fields.value = ["id"];
            refs.expand.value = ["owner"];
            await flushPromises();

            expect(lookup.requestObject).toHaveBeenCalledTimes(1);
            es.stop();
        });

        scopedIt("refetches when the pk changes while fields and expand keep their contents", async () => {
            const refs = {
                app: vue.ref("app"),
                model: vue.ref("model"),
                pk: vue.ref("1"),
                fields: vue.ref(["id"]),
                expand: vue.ref(["owner"]),
            };
            const { lookup, es } = mountLookup(refs);
            await flushPromises();

            refs.pk.value = "2";
            refs.fields.value = ["id"];
            refs.expand.value = ["owner"];
            await flushPromises();

            expect(lookup.requestObject).toHaveBeenLastCalledWith("app", "model", "2", ["id"], ["owner"]);
            expect(lookup.requestObject).toHaveBeenCalledTimes(2);
            es.stop();
        });
    });
});
