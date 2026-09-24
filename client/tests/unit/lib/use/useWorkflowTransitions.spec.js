import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { effectScope, isReactive, reactive, ref, unref } from "vue";

const workflowStoreFnMocks = {
    getUsingVuedaWorkflow: vi.fn(() => true),
    storeWorkflow: vi.fn(() => workflowStoreMock),
};
const workflowStoreMock = reactive({
    fetchWorkflowTransition: vi.fn(),
    workflowTransitions: reactive({}),
});

vi.mock("@vueda/stores/storeWorkflow.js", async () => {
    const actual = await vi.importActual("@vueda/stores/storeWorkflow.js");
    return {
        __esModule: true,
        ...actual,
        ...workflowStoreFnMocks,
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

describe("lib/use/useWorkflowTransitions.js", () => {
    const app = ref("myApp");
    const model = ref("myModel");
    let useWorkflowTransitions, caseJs, errorsJs, getAppModelDotName;
    beforeEach(async () => {
        mockedUseLoadingErrorInstance.loading.value = false;
        // mockReset also drops queued mockImplementationOnce entries, which clearAllMocks leaves
        // behind: one left over from a test that fetched fewer times than it queued would otherwise
        // answer the next test's first fetch
        workflowStoreMock.fetchWorkflowTransition.mockReset();
        workflowStoreMock.fetchWorkflowTransition.mockResolvedValue([]);
        useWorkflowTransitions = (await import("@vueda/use/useWorkflowTransitions.js")).useWorkflowTransitions;
        caseJs = await import("@vueda/utils/case.js");
        // imported here rather than at the top, because a static import pulls in the mocked
        // reactive-helpers module before the mock factory's variables exist
        errorsJs = await import("@vueda/utils/errors.js");
        getAppModelDotName = caseJs.getAppModelDotName;
    });
    afterEach(() => {
        vi.clearAllMocks();
        workflowStoreMock.workflowTransitions = {};
        workflowStoreFnMocks.getUsingVuedaWorkflow.mockReturnValue(true);
        app.value = "myApp";
        model.value = "myModel";
        userStoreMock.identityGeneration = 0;
        mockedUseLoadingErrorInstance.loading.value = false;
    });

    scopedIt("returns inert state when getUsingVuedaWorkflow is false", () => {
        workflowStoreFnMocks.getUsingVuedaWorkflow.mockReturnValue(false);
        const result = useWorkflowTransitions(app, model);
        expect(isReactive(result)).toBe(true);
        expect(result.transitions).toEqual([]);
        expect(result.loading).toBe(false);
        expect(result.error).toBe(null);
    });

    scopedIt("fetches transitions on mount when active", async () => {
        const transitions = [{ code: "one", name: "One" }];
        workflowStoreMock.workflowTransitions[getAppModelDotName({ app: unref(app), model: unref(model) })] =
            transitions;
        workflowStoreMock.fetchWorkflowTransition.mockResolvedValue(transitions);

        const es = effectScope();
        let result;
        es.run(() => {
            result = useWorkflowTransitions(app, model);
        });
        expect(isReactive(result)).toBe(true);
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledWith(unref(app), unref(model));
        expect(result.transitions).toEqual(transitions);
        es.stop();
    });

    scopedIt("updates transitions reactively", async () => {
        const transRef = ref([{ code: "init", name: "Init" }]);
        workflowStoreMock.workflowTransitions[getAppModelDotName({ app: unref(app), model: unref(model) })] = transRef;

        const result = useWorkflowTransitions(app, model);
        expect(isReactive(result)).toBe(true);

        await flushPromises();
        expect(result.transitions).toEqual([{ code: "init", name: "Init" }]);

        transRef.value = [{ code: "next", name: "Next" }];
        await flushPromises();
        expect(result.transitions).toEqual([{ code: "next", name: "Next" }]);
    });

    scopedIt("sets error state if fetch throws", async () => {
        const error = new Error("fetch failed");
        workflowStoreMock.fetchWorkflowTransition.mockRejectedValue(error);

        const result = useWorkflowTransitions(ref("badApp"), ref("badModel"));
        expect(isReactive(result)).toBe(true);
        await flushPromises();
        expect(mockedUseLoadingErrorInstance.setError).toHaveBeenCalledWith(error);
    });

    scopedIt("refetches transitions when the authenticated user changes", async () => {
        const key = getAppModelDotName({ app: unref(app), model: unref(model) });
        const transitions = [{ code: "one", name: "One" }];
        workflowStoreMock.workflowTransitions[key] = transitions;
        workflowStoreMock.fetchWorkflowTransition.mockResolvedValue(transitions);

        const es = effectScope();
        let result;
        es.run(() => {
            result = useWorkflowTransitions(app, model);
        });
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledTimes(1);

        // the store dropped its cache at the identity boundary, so the last fetched key no longer
        // describes anything this instance holds
        delete workflowStoreMock.workflowTransitions[key];
        userStoreMock.identityGeneration = 1;
        await flushPromises();

        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledTimes(2);

        workflowStoreMock.workflowTransitions[key] = [{ code: "two", name: "Two" }];
        await flushPromises();
        expect(result.transitions).toEqual([{ code: "two", name: "Two" }]);
        es.stop();
    });

    scopedIt("refetches when the authenticated user changes while a fetch is in flight", async () => {
        const key = getAppModelDotName({ app: unref(app), model: unref(model) });
        let rejectFirstFetch;
        workflowStoreMock.fetchWorkflowTransition
            .mockImplementationOnce(
                () =>
                    new Promise((resolve, reject) => {
                        rejectFirstFetch = reject;
                    }),
            )
            .mockImplementationOnce(() => Promise.resolve([]));

        const es = effectScope();
        let result;
        es.run(() => {
            result = useWorkflowTransitions(app, model);
        });
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledTimes(1);
        expect(result.loading).toBe(true);

        // the user changes with the first request still in flight, so the guard skips the fetch
        userStoreMock.identityGeneration = 1;
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledTimes(1);

        // the store abandons that request rather than caching transitions fetched for the previous user
        rejectFirstFetch(new errorsJs.AuthScopeInvalidatedError("storeWorkflow.fetchWorkflowTransition", key));
        await flushPromises();

        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledTimes(2);
        expect(result.loading).toBe(false);
        expect(mockedUseLoadingErrorInstance.setError).not.toHaveBeenCalled();

        workflowStoreMock.workflowTransitions[key] = [{ code: "two", name: "Two" }];
        await flushPromises();
        expect(result.transitions).toEqual([{ code: "two", name: "Two" }]);
        es.stop();
    });

    scopedIt("loads the latest cold target after an in-flight request without publishing stale metadata", async () => {
        let resolveFirst;
        let resolveLast;
        workflowStoreMock.fetchWorkflowTransition
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
        const result = useWorkflowTransitions(app, model);
        await flushPromises();
        model.value = "intermediate";
        await flushPromises();
        model.value = "finalModel";
        await flushPromises();
        workflowStoreMock.workflowTransitions[getAppModelDotName({ app: app.value, model: "myModel" })] = [
            { code: "final" },
        ];
        resolveFirst();
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledTimes(2);
        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenLastCalledWith(app.value, "finalModel");
        expect(result.loading).toBe(true);
        expect(result.transitions).not.toEqual([{ code: "final" }]);
        workflowStoreMock.workflowTransitions[getAppModelDotName({ app: app.value, model: "finalModel" })] = [
            { code: "final" },
        ];
        resolveLast();
        await flushPromises();
        expect(result.transitions).toEqual([{ code: "final" }]);
        expect(result.loading).toBe(false);
    });

    scopedIt("does not fetch if isActive is false", async () => {
        const isActive = ref(false);
        const result = useWorkflowTransitions(app, model, isActive);
        expect(isReactive(result)).toBe(true);
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).not.toHaveBeenCalled();
    });

    scopedIt("does not fetch if key is falsy", async () => {
        const app = ref("");
        const model = ref("someModel");
        const result = useWorkflowTransitions(app, model);
        expect(isReactive(result)).toBe(true);
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).not.toHaveBeenCalled();
    });
});
