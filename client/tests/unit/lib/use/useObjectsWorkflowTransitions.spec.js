import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { effectScope, nextTick, reactive, readonly, ref } from "vue";

const workflowStoreFnMocks = {
    getUsingVuedaWorkflow: vi.fn(() => true),
    storeWorkflow: vi.fn(() => workflowStoreMock),
};

const workflowStoreMock = reactive({
    fetchWorkflowTransition: vi.fn(),
    initializeObjectTransitions: vi.fn((app, model) => {
        const { getAppModelDotName } = caseJs;
        const key = getAppModelDotName({ app, model });
        workflowStoreMock.objectTransitions[key] = {};
    }),
    fetchObjectTransitions: vi.fn((app, model, pk) => {
        const { getAppModelDotName } = caseJs;
        const key = getAppModelDotName({ app, model });
        if (!workflowStoreMock.objectTransitions[key]) {
            workflowStoreMock.objectTransitions[key] = {};
        }
        workflowStoreMock.objectTransitions[key][pk] = [{ code: "step", name: "Step" }];
        return Promise.resolve();
    }),
    objectTransitions: reactive({}),
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

let caseJs;
let getAppModelDotName;

beforeEach(async () => {
    await vi.resetModules();
    caseJs = await import("@vueda/utils/case.js");
    getAppModelDotName = caseJs.getAppModelDotName;
});

afterEach(() => {
    vi.clearAllMocks();
    workflowStoreMock.objectTransitions = reactive({});
});

describe("lib/use/useObjectsWorkflowTransitions.js", () => {
    scopedIt("returns inert state when getUsingVuedaWorkflow is false", async () => {
        workflowStoreFnMocks.getUsingVuedaWorkflow.mockReturnValueOnce(false);
        const { useObjectsWorkflowTransitions } = await import("@vueda/use/useObjectsWorkflowTransitions.js");
        const result = useObjectsWorkflowTransitions(ref("a"), ref("b"), ref("1"));
        expect(result.loading.value).toBe(false);
        expect(result.error.value).toBe(null);
        expect(result.transitions).toBeUndefined();
    });

    scopedIt("fetches transitions on mount when active", async () => {
        const { useObjectsWorkflowTransitions } = await import("@vueda/use/useObjectsWorkflowTransitions.js");
        const app = ref("myApp");
        const model = ref("myModel");
        const pk = ref("1");
        workflowStoreMock.fetchWorkflowTransition.mockResolvedValue([{ code: "x", name: "X" }]);
        const es = effectScope();
        let result;
        es.run(() => {
            result = useObjectsWorkflowTransitions(app, model, pk);
        });
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).toHaveBeenCalledWith(app.value, model.value);
        expect(workflowStoreMock.fetchObjectTransitions).toHaveBeenCalledWith(app.value, model.value, pk.value);
        expect(result.transitions).toEqual([{ code: "step", name: "Step" }]);
        es.stop();
    });

    scopedIt("updates transitions reactively", async () => {
        const { useObjectsWorkflowTransitions } = await import("@vueda/use/useObjectsWorkflowTransitions.js");
        const app = ref("a");
        const model = ref("b");
        const pk = ref("42");
        workflowStoreMock.fetchWorkflowTransition.mockResolvedValue([{ code: "x", name: "X" }]);
        const es = effectScope();
        let result;
        es.run(() => {
            result = useObjectsWorkflowTransitions(app, model, pk);
        });
        await flushPromises();
        const key = getAppModelDotName({ app: app.value, model: model.value });
        workflowStoreMock.objectTransitions[key][pk.value] = [{ code: "new", name: "New" }];
        await nextTick();
        expect(result.transitions).toEqual([{ code: "new", name: "New" }]);
        es.stop();
    });

    scopedIt("sets error state if fetch throws", async () => {
        const { useObjectsWorkflowTransitions } = await import("@vueda/use/useObjectsWorkflowTransitions.js");
        const app = ref("errApp");
        const model = ref("errModel");
        const pk = ref("7");
        const error = new Error("fetch failed");
        workflowStoreMock.fetchWorkflowTransition.mockResolvedValue([{ code: "a", name: "A" }]);
        workflowStoreMock.fetchObjectTransitions.mockRejectedValue(error);
        useObjectsWorkflowTransitions(app, model, pk);
        await flushPromises();
        expect(mockedUseLoadingErrorInstance.setError).toHaveBeenCalledWith(error);
    });

    scopedIt("does not fetch when isActive is false", async () => {
        const { useObjectsWorkflowTransitions } = await import("@vueda/use/useObjectsWorkflowTransitions.js");
        const app = ref("app");
        const model = ref("model");
        const pk = ref("1");
        const active = ref(false);
        useObjectsWorkflowTransitions(app, model, pk, active);
        await flushPromises();
        expect(workflowStoreMock.fetchWorkflowTransition).not.toHaveBeenCalled();
        expect(workflowStoreMock.fetchObjectTransitions).not.toHaveBeenCalled();
    });
});
