import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { effectScope, isReactive, reactive, ref, unref } from "vue";

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
    // the composable guards on `loading`, so the mock has to move it the way the real helper does
    setLoading: vi.fn(() => {
        mockedUseLoadingErrorInstance.loading.value = true;
    }),
    clearLoading: vi.fn(() => {
        mockedUseLoadingErrorInstance.loading.value = false;
    }),
};
const mockedUseLoadingError = vi.fn(() => mockedUseLoadingErrorInstance);

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
    let caseJs, errorsJs, key, useModelInfo, es;

    beforeEach(async () => {
        es = effectScope();
        mockedUseLoadingErrorInstance.loading.value = false;
        // mockReset also drops queued mockImplementationOnce entries, which clearAllMocks leaves
        // behind: one left over from a test that fetched fewer times than it queued would otherwise
        // answer the next test's first fetch. The default keeps the mount fetch resolving for tests
        // that set their own implementation after mounting.
        modelInfoStoreMock.fetchModelInfo.mockReset();
        modelInfoStoreMock.fetchModelInfo.mockResolvedValue({});
        useModelInfo = (await import("@vueda/use/useModelInfo.js")).useModelInfo;
        caseJs = await import("@vueda/utils/case.js");
        // imported here rather than at the top, because a static import pulls in the mocked
        // reactive-helpers module before the mock factory's variables exist
        errorsJs = await import("@vueda/utils/errors.js");
        key = caseJs.getAppModelDotName({ app: unref(app), model: unref(model) });
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockedUseLoadingErrorInstance.loading.value = false;
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

    scopedIt("refetches when the authenticated user changes while a fetch is in flight", async () => {
        let rejectFirstFetch;
        modelInfoStoreMock.fetchModelInfo
            .mockImplementationOnce(
                () =>
                    new Promise((resolve, reject) => {
                        rejectFirstFetch = reject;
                    }),
            )
            .mockImplementationOnce(() => Promise.resolve({}));

        let result;
        es.run(() => {
            result = useModelInfo(app, model);
        });
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledTimes(1);
        expect(result.loading).toBe(true);

        // the user changes with the first request still in flight, so the guard skips the fetch
        userStoreMock.identityGeneration = 1;
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledTimes(1);

        // the store abandons that request rather than caching a response fetched for the previous user
        const newUserInfo = { label: "authorized for the new user" };
        modelInfoStoreMock.infos[key] = newUserInfo;
        rejectFirstFetch(new errorsJs.AuthScopeInvalidatedError("storeModelInfo.fetchModelInfo", key));
        await flushPromises();

        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledTimes(2);
        expect(result.info).toEqual(newUserInfo);
        expect(result.loading).toBe(false);
        expect(mockedUseLoadingErrorInstance.setError).not.toHaveBeenCalled();
    });

    scopedIt("loads the latest cold target after an in-flight request without publishing stale metadata", async () => {
        let resolveFirst;
        let resolveLast;
        modelInfoStoreMock.fetchModelInfo
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveFirst = resolve;
                    }),
            )
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveLast = resolve;
                    }),
            );
        const result = useModelInfo(app, model);
        await flushPromises();
        model.value = "intermediate";
        await flushPromises();
        model.value = "finalModel";
        await flushPromises();
        modelInfoStoreMock.infos[caseJs.getAppModelDotName({ app: app.value, model: "myModel" })] = {
            label: "Final model",
        };
        resolveFirst();
        await flushPromises();
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenCalledTimes(2);
        expect(modelInfoStoreMock.fetchModelInfo).toHaveBeenLastCalledWith({ app: app.value, model: "finalModel" });
        expect(result.loading).toBe(true);
        expect(result.info).not.toEqual({ label: "Final model" });
        modelInfoStoreMock.infos[caseJs.getAppModelDotName({ app: app.value, model: "finalModel" })] = {
            label: "Final model",
        };
        resolveLast();
        await flushPromises();
        expect(result.info).toEqual({ label: "Final model" });
        expect(result.loading).toBe(false);
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
