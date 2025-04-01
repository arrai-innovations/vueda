import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import flushPromises from "flush-promises";
import { effectScope, isReactive, reactive, readonly, ref, unref } from "vue";

const workflowStoreFnMocks = {
    getUsingVuedaWorkFlow: vi.fn(() => true),
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

describe("lib/use/useWorkflowTransitions.js", () => {
    const app = ref("myApp");
    const model = ref("myModel");
    let useWorkflowTransitions;
    beforeEach(async () => {
        useWorkflowTransitions = (await import("@vueda/use/useWorkflowTransitions.js")).useWorkflowTransitions;
    });
    afterEach(() => {
        vi.clearAllMocks();
        workflowStoreMock.workflowTransitions = {};
        workflowStoreFnMocks.getUsingVuedaWorkFlow.mockReturnValue(true);
        app.value = "myApp";
        model.value = "myModel";
    });

    it("returns inert state when getUsingVuedaWorkFlow is false", () => {
        workflowStoreFnMocks.getUsingVuedaWorkFlow.mockReturnValue(false);
        const result = useWorkflowTransitions(app, model);
        expect(isReactive(result)).toBe(true);
        expect(result.transitions).toEqual([]);
        expect(result.loading).toBe(false);
        expect(result.error).toBe(null);
    });

    it("fetches transitions on mount when active", async () => {
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

    it("updates transitions reactively", async () => {
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

    it("sets error state if fetch throws", async () => {
        const error = new Error("fetch failed");
        workflowStoreMock.fetchWorkflowTransition.mockRejectedValue(error);

        const result = useWorkflowTransitions(ref("badApp"), ref("badModel"));
        expect(isReactive(result)).toBe(true);
        await flushPromises();
        expect(mockedUseLoadingErrorInstance.setError).toHaveBeenCalledWith(error);
    });

    it("does not fetch if isActive is false", async () => {
        const isActive = ref(false);
        const result = useWorkflowTransitions(app, model, isActive);
        expect(isReactive(result)).toBe(true);
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).not.toHaveBeenCalled();
    });

    it("does not fetch if key is falsy", async () => {
        const app = ref("");
        const model = ref("someModel");
        const result = useWorkflowTransitions(app, model);
        expect(isReactive(result)).toBe(true);
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).not.toHaveBeenCalled();
    });
});
