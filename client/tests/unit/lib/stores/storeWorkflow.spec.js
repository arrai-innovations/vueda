import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";

let storeWorkflowModule, storeWorkflow, mockedFetchHelper;

describe("lib/store/storeWorkflow.js", () => {
    beforeEach(async () => {
        setActivePinia(createPinia());
        mockedFetchHelper = vi.fn();
        vi.doMock("@vueda/utils/fetchSupport.js", async () => {
            const actual = await vi.importActual("@vueda/utils/fetchSupport.js");
            return {
                ...actual,
                fetchHelper: mockedFetchHelper,
            };
        });
        storeWorkflowModule = await import("@vueda/stores/storeWorkflow.js");
        storeWorkflow = storeWorkflowModule.storeWorkflow;
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

    scopedIt("fetchWorkflowTransition stores and caches transitions", async () => {
        const transitions = [{ code: "one", name: "One" }];
        mockedFetchHelper.mockResolvedValue(transitions);
        const store = storeWorkflow();

        const result = await store.fetchWorkflowTransition("app", "model");
        const key = getAppModelDotName({ app: "app", model: "model" });

        expect(result).toEqual(transitions);
        expect(store.workflowTransitions[key]).toEqual(transitions);

        mockedFetchHelper.mockClear();
        await store.fetchWorkflowTransition("app", "model");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchWorkflowTransition rejects when app or model missing", async () => {
        const store = storeWorkflow();

        await expect(store.fetchWorkflowTransition("", null)).rejects.toThrow(
            "storeWorkflow.fetchWorkflowTransition: app and model must be provided",
        );
    });

    scopedIt("fetchWorkflowTransition resolves empty array when workflow disabled", async () => {
        storeWorkflowModule.setUsingVuedaWorkFlow(false);
        const store = storeWorkflow();

        const result = await store.fetchWorkflowTransition("app", "model");

        expect(result).toEqual([]);
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchWorkflowTransition stores empty array when no results", async () => {
        mockedFetchHelper.mockResolvedValue({ results: [] });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });

        const result = await store.fetchWorkflowTransition("app", "model");

        expect(result).toEqual([]);
        expect(store.workflowTransitions[key]).toEqual([]);
    });

    scopedIt("fetchWorkflowTransition ignores marker responses", async () => {
        mockedFetchHelper.mockResolvedValue("marker");
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });

        const result = await store.fetchWorkflowTransition("app", "model");

        expect(result).toBeUndefined();
        expect(store.workflowTransitions[key]).toBeUndefined();
        expect(store.promises.workflowTransitions[key]).toBeUndefined();
    });

    scopedIt("caches errors for fetchWorkflowTransition", async () => {
        const error = new Error("boom");
        mockedFetchHelper.mockRejectedValue(error);
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });

        await expect(store.fetchWorkflowTransition("app", "model")).rejects.toBe(error);
        expect(store.errors.workflowTransitions[key]).toBe(error);
        expect(store.promises.workflowTransitions[key]).toBeUndefined();

        mockedFetchHelper.mockClear();
        await expect(store.fetchWorkflowTransition("app", "model")).rejects.toBe(error);
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchModelStates stores and caches states", async () => {
        const states = [{ code: "init", name: "Init" }];
        mockedFetchHelper.mockResolvedValue(states);
        const store = storeWorkflow();

        const result = await store.fetchModelStates("app", "model");
        const key = getAppModelDotName({ app: "app", model: "model" });

        expect(result).toEqual(states);
        expect(store.modelStates[key]).toEqual(states);

        mockedFetchHelper.mockClear();
        await store.fetchModelStates("app", "model");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchObjectState stores and caches state", async () => {
        const stateData = { state: { code: "draft" } };
        mockedFetchHelper.mockResolvedValue(stateData);
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        store.objectStates[key] = {};
        store.promises.objectStates[key] = {};
        store.errors.objectStates[key] = {};

        const result = await store.fetchObjectState("app", "model", "1");
        expect(result).toBeUndefined();
        expect(store.objectStates[key]["1"]).toEqual(stateData);

        mockedFetchHelper.mockClear();
        await store.fetchObjectState("app", "model", "1");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchObjectTransitions stores and caches transitions", async () => {
        const transitionData = { transitions: [{ code: "t", name: "T" }] };
        mockedFetchHelper.mockResolvedValue(transitionData);
        const store = storeWorkflow();
        store.initializeObjectTransitions("app", "model");
        const key = getAppModelDotName({ app: "app", model: "model" });
        // initializeObjectTransitions does not create this.promises.objectStates
        // but fetchObjectTransitions mistakenly deletes from it
        store.promises.objectStates[key] = {};

        const result = await store.fetchObjectTransitions("app", "model", "1");
        expect(result).toBeUndefined();
        expect(store.objectTransitions[key]["1"]).toEqual(transitionData);

        mockedFetchHelper.mockClear();
        await store.fetchObjectTransitions("app", "model", "1");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchObjectHistory stores and caches history", async () => {
        const historyData = { history: [{ code: "a" }] };
        mockedFetchHelper.mockResolvedValue(historyData);
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        store.objectHistories[key] = {};
        store.promises.objectHistories[key] = {};
        store.errors.objectHistories[key] = {};

        const result = await store.fetchObjectHistory("app", "model", "1");
        expect(result).toBeUndefined();
        expect(store.objectHistories[key]["1"]).toEqual(historyData);

        mockedFetchHelper.mockClear();
        await store.fetchObjectHistory("app", "model", "1");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("executeTransition updates state and pushes route", async () => {
        const response = {
            new_state: { state: { code: "closed" } },
            new_transitions: [{ code: "reopen", name: "Reopen" }],
        };
        mockedFetchHelper.mockResolvedValue(response);
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        store.objectStates[key] = { 1: {} };
        store.objectTransitions[key] = { 1: {} };
        const router = { push: vi.fn() };
        const mapping = { closed: "/closed" };

        await store.executeTransition("app", "model", "1", "close", router, mapping);

        expect(store.objectStates[key]["1"].state.code).toBe("closed");
        expect(store.objectTransitions[key]["1"].transitions).toEqual(response.new_transitions);
        expect(router.push).toHaveBeenCalledWith("/closed");
    });

    scopedIt("executeTransition adds Dry-Run header when performing dry run", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { state: { code: "closed" } },
            new_transitions: [],
        });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        store.objectStates[key] = { 1: {} };
        store.objectTransitions[key] = { 1: {} };

        await store.executeTransition("app", "model", "1", "close", undefined, undefined, true);

        const options = mockedFetchHelper.mock.calls[0][1];
        expect(options.headers["Dry-Run"]).toBe("true");
    });

    scopedIt("initializeObjectTransitions creates structures", () => {
        const store = storeWorkflow();
        store.initializeObjectTransitions("app", "model");
        const key = getAppModelDotName({ app: "app", model: "model" });
        expect(store.objectTransitions[key]).toEqual({});
        expect(store.promises.objectTransitions[key]).toEqual({});
        expect(store.errors.objectTransitions[key]).toEqual({});
    });
});
