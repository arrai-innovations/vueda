import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import flushPromises from "flush-promises";
import { effectScope, isReactive, reactive, readonly, ref, unref } from "vue";

const modelInfoStoreFnMocks = {
    storeModelInfo: vi.fn(() => modelInfoStoreMock),
};
const modelInfoStoreMock = reactive({
    infos: reactive({}),
    fetchModelInfo: vi.fn(),
});

vi.mock("@vueda/stores/storeModelInfo.js", async () => {
    const actual = await vi.importActual("@vueda/stores/storeModelInfo.js");
    return {
        __esModule: true,
        ...actual,
        ...modelInfoStoreFnMocks,
    };
});

const mockedUseLoadingErrorInstance = {
    loading: ref(false),
    error: ref(null),
    errored: ref(false),
    clearError: vi.fn(),
    setError: vi.fn(),
    setLoading: vi.fn(),
    clearLoading: vi.fn(),
};
const mockedUseLoadingError = vi.fn(() => readonly(mockedUseLoadingErrorInstance));

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useLoadingError: mockedUseLoadingError,
    };
});

vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: vi.fn(() => ref(true)),
}));

describe("lib/use/useModelInfo.js", () => {
    const app = ref("myApp");
    const model = ref("myModel");
    const key = getAppModelDotName({ app: unref(app), model: unref(model) });
    let useModelInfo, es;

    beforeEach(async () => {
        es = effectScope();
        useModelInfo = (await import("@vueda/use/useModelInfo.js")).useModelInfo;
    });

    afterEach(() => {
        vi.clearAllMocks();
        modelInfoStoreMock.infos = reactive({});
        modelInfoStoreFnMocks.storeModelInfo.mockReturnValue(modelInfoStoreMock);
        app.value = "myApp";
        model.value = "myModel";
        es.stop();
    });

    it("fetches model info on mount", async () => {
        const info = { label: "My Label" };
        modelInfoStoreMock.infos[key] = info;
        modelInfoStoreMock.fetchModelInfo.mockResolvedValue(info);

        let result;
        es.run(() => {
            result = useModelInfo(app, model);
        });
        expect(isReactive(result)).toBe(true);

        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledWith({ app: unref(app), model: unref(model) });
        expect(result.info).toEqual(info);
    });

    it("reactively updates deep info changes", async () => {
        let result;
        es.run(() => {
            result = useModelInfo(app, model);
        });
        modelInfoStoreMock.infos[key] = ref({ foo: "bar" });
        modelInfoStoreMock.fetchModelInfo.mockResolvedValue({});

        await flushPromises();
        expect(result.info.foo).toBe("bar");

        modelInfoStoreMock.infos[key].foo = "baz";
        await flushPromises();
        expect(result.info.foo).toBe("baz");
    });

    it("sets error if fetch fails", async () => {
        const error = new Error("bad fetch");
        modelInfoStoreMock.fetchModelInfo.mockRejectedValue(error);

        let result;
        es.run(() => {
            result = useModelInfo(ref("badApp"), ref("badModel"));
        });
        await flushPromises();
        expect(mockedUseLoadingErrorInstance.setError).toHaveBeenCalledWith(error);
        expect(result.errored).toBe(false); // still false unless you internally track it
    });

    it("does not fetch if isActive is false", async () => {
        const isActive = ref(false);
        es.run(() => {
            useModelInfo(app, model, isActive);
        });
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).not.toHaveBeenCalled();
    });

    it("avoids redundant fetches if app/model/isActive haven't changed", async () => {
        const spy = vi.spyOn(modelInfoStoreMock, "fetchModelInfo").mockResolvedValue({});
        const isActive = ref(true);

        es.run(() => {
            useModelInfo(app, model, isActive);
        });
        await flushPromises();

        app.value = "myApp";
        model.value = "myModel";
        isActive.value = true;
        await flushPromises();

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("handles hardcoded string arguments", async () => {
        let result;
        es.run(() => {
            result = useModelInfo("staticApp", "staticModel");
        });
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledWith({ app: "staticApp", model: "staticModel" });
        expect(isReactive(result)).toBe(true);
    });

    it("fetches model info when app changes but model and isActive stay the same", async () => {
        const isActive = ref(true);
        es.run(() => {
            useModelInfo(app, model, isActive);
        });
        await flushPromises(); // initial fetch
        modelInfoStoreMock.fetchModelInfo.mockClear();
        app.value = "newApp";
        await flushPromises();

        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalled();
    });

    it("fetches model info when model changes but app and isActive stay the same", async () => {
        const isActive = ref(true);
        es.run(() => {
            useModelInfo(app, model, isActive);
        });
        await flushPromises(); // initial fetch
        modelInfoStoreMock.fetchModelInfo.mockClear();
        model.value = "newModel";
        await flushPromises();

        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalled();
    });

    it("does not fetch and clears info if app is falsey", async () => {
        const app = ref("");
        const model = ref("someModel");

        let result;
        es.run(() => {
            result = useModelInfo(app, model);
        });

        await flushPromises();

        expect(modelInfoStoreMock.fetchModelInfo).not.toHaveBeenCalled();
        expect(result.info).toEqual({});
    });
    it("does not fetch and clears info if model is falsey", async () => {
        const app = ref("someApp");
        const model = ref(null);

        let result;
        es.run(() => {
            result = useModelInfo(app, model);
        });

        await flushPromises();

        expect(modelInfoStoreMock.fetchModelInfo).not.toHaveBeenCalled();
        expect(result.info).toEqual({});
    });
});
