import { scopedIt } from "@tests/unit/utils.js";
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
        __esModule: true,
        ...actual,
        useLoadingError: mockedUseLoadingError,
    };
});

const userStoreMock = reactive({ identityGeneration: 0 });
vi.mock("@vueda/stores/storeUser.js", () => ({
    storeUser: vi.fn(() => userStoreMock),
}));

vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: vi.fn(() => ref(true)),
}));

describe("lib/use/useModelInfo.js", () => {
    const app = ref("myApp");
    const model = ref("myModel");
    let caseJs, key, useModelInfo, es;

    beforeEach(async () => {
        es = effectScope();
        useModelInfo = (await import("@vueda/use/useModelInfo.js")).useModelInfo;
        caseJs = await import("@vueda/utils/case.js");
        key = caseJs.getAppModelDotName({ app: unref(app), model: unref(model) });
    });

    afterEach(() => {
        vi.clearAllMocks();
        modelInfoStoreMock.infos = reactive({});
        modelInfoStoreFnMocks.storeModelInfo.mockReturnValue(modelInfoStoreMock);
        app.value = "myApp";
        model.value = "myModel";
        userStoreMock.identityGeneration = 0;
        es.stop();
    });

    scopedIt("fetches model info on mount", async () => {
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

    scopedIt("reactively updates deep info changes", async () => {
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

    scopedIt("sets error if fetch fails", async () => {
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

    scopedIt("does not fetch if isActive is false", async () => {
        const isActive = ref(false);
        es.run(() => {
            useModelInfo(app, model, isActive);
        });
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).not.toHaveBeenCalled();
    });

    scopedIt("avoids redundant fetches if app/model/isActive haven't changed", async () => {
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

    scopedIt("handles hardcoded string arguments", async () => {
        let result;
        es.run(() => {
            result = useModelInfo("staticApp", "staticModel");
        });
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledWith({ app: "staticApp", model: "staticModel" });
        expect(isReactive(result)).toBe(true);
    });

    scopedIt("fetches model info when app changes but model and isActive stay the same", async () => {
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

    scopedIt("fetches model info when model changes but app and isActive stay the same", async () => {
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

    scopedIt("does not fetch and clears info if app is falsey", async () => {
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
    scopedIt("refetches model info when the authenticated user changes", async () => {
        const isActive = ref(true);
        modelInfoStoreMock.fetchModelInfo.mockResolvedValue({});

        es.run(() => {
            useModelInfo(app, model, isActive);
        });
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledTimes(1);

        // the store dropped its cache at the identity boundary, so the composable has to ask again
        userStoreMock.identityGeneration = 1;
        await flushPromises();

        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledTimes(2);
    });

    scopedIt("does not fetch and clears info if model is falsey", async () => {
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
