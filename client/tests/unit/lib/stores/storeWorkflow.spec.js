import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";

let storeWorkflowModule, storeWorkflow, mockedFetchHelper, AuthScopeInvalidatedError;

describe("lib/stores/storeWorkflow.js", () => {
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
        ({ AuthScopeInvalidatedError } = await import("@vueda/utils/errors.js"));
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
        storeWorkflowModule.setUsingVuedaWorkflow(false);
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

        const result = await store.fetchObjectState("app", "model", "1");
        expect(result).toBeUndefined();
        expect(store.objectStates[key]["1"]).toEqual(stateData);

        mockedFetchHelper.mockClear();
        await store.fetchObjectState("app", "model", "1");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchObjectState initializes per-model containers on cold call", async () => {
        mockedFetchHelper.mockResolvedValue({ state: { code: "draft" } });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });

        expect(store.objectStates[key]).toBeUndefined();
        expect(store.promises.objectStates[key]).toBeUndefined();
        expect(store.errors.objectStates[key]).toBeUndefined();

        await expect(store.fetchObjectState("app", "model", "1")).resolves.toBeUndefined();

        expect(store.objectStates[key]).toBeTypeOf("object");
        expect(store.promises.objectStates[key]).toBeTypeOf("object");
        expect(store.errors.objectStates[key]).toBeTypeOf("object");
        expect(store.promises.objectStates[key]["1"]).toBeUndefined();
    });

    scopedIt("fetchObjectTransitions stores and caches transitions", async () => {
        const transitionData = { transitions: [{ code: "t", name: "T" }] };
        mockedFetchHelper.mockResolvedValue(transitionData);
        const store = storeWorkflow();
        store.initializeObjectTransitions("app", "model");
        const key = getAppModelDotName({ app: "app", model: "model" });

        const result = await store.fetchObjectTransitions("app", "model", "1");
        expect(result).toBeUndefined();
        expect(store.objectTransitions[key]["1"]).toEqual(transitionData);

        mockedFetchHelper.mockClear();
        await store.fetchObjectTransitions("app", "model", "1");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchObjectTransitions clears in-flight promise entry", async () => {
        mockedFetchHelper.mockResolvedValue({ transitions: [] });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        expect(store.promises.objectTransitions[key]).toBeUndefined();

        await expect(store.fetchObjectTransitions("app", "model", "1")).resolves.toBeUndefined();
        expect(store.promises.objectTransitions[key]).toBeTypeOf("object");
        expect(store.promises.objectTransitions[key]["1"]).toBeUndefined();
    });

    scopedIt("fetchObjectHistory stores and caches history", async () => {
        const historyData = { history: [{ code: "a" }] };
        mockedFetchHelper.mockResolvedValue(historyData);
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });

        const result = await store.fetchObjectHistory("app", "model", "1");
        expect(result).toBeUndefined();
        expect(store.objectHistories[key]["1"]).toEqual(historyData);

        mockedFetchHelper.mockClear();
        await store.fetchObjectHistory("app", "model", "1");
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchObjectHistory initializes per-model containers on cold call", async () => {
        mockedFetchHelper.mockResolvedValue({ history: [] });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });

        expect(store.objectHistories[key]).toBeUndefined();
        expect(store.promises.objectHistories[key]).toBeUndefined();
        expect(store.errors.objectHistories[key]).toBeUndefined();

        await expect(store.fetchObjectHistory("app", "model", "1")).resolves.toBeUndefined();

        expect(store.objectHistories[key]).toBeTypeOf("object");
        expect(store.promises.objectHistories[key]).toBeTypeOf("object");
        expect(store.errors.objectHistories[key]).toBeTypeOf("object");
        expect(store.promises.objectHistories[key]["1"]).toBeUndefined();
    });

    scopedIt("executeTransition updates state and pushes route", async () => {
        const response = {
            new_state: { code: "closed", name: "Closed" },
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

        expect(store.objectStates[key]["1"].code).toBe("closed");
        expect(store.objectTransitions[key]["1"].transitions).toEqual(response.new_transitions);
        expect(router.push).toHaveBeenCalledWith("/closed");
    });

    scopedIt("executeTransition adds Dry-Run header when performing dry run", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { code: "closed", name: "Closed" },
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

    scopedIt("executeTransition adds Acknowledge-Warnings header when acknowledging warnings", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { code: "closed", name: "Closed" },
            new_transitions: [],
        });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        store.objectStates[key] = { 1: {} };
        store.objectTransitions[key] = { 1: {} };

        await store.executeTransition("app", "model", "1", "close", undefined, undefined, false, "digest123");

        const options = mockedFetchHelper.mock.calls[0][1];
        expect(options.headers["Acknowledge-Warnings"]).toBe("digest123");
    });

    scopedIt("executeTransition omits Acknowledge-Warnings header when not acknowledging", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { code: "closed", name: "Closed" },
            new_transitions: [],
        });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        store.objectStates[key] = { 1: {} };
        store.objectTransitions[key] = { 1: {} };

        await store.executeTransition("app", "model", "1", "close");

        const options = mockedFetchHelper.mock.calls[0][1];
        expect(options.headers["Acknowledge-Warnings"]).toBeUndefined();
    });

    scopedIt("executeTransition maps a 409 response to ConfirmationRequiredError", async () => {
        mockedFetchHelper.mockRejectedValue(new Error("boom"));
        const store = storeWorkflow();

        await store.executeTransition("app", "model", "1", "close").catch(() => {});

        const errorResolver = mockedFetchHelper.mock.calls[0][6];
        const responseData = {
            confirmation_required: true,
            digest: "abc123",
            warnings: { non_field_errors: ["This transition has consequences."] },
        };

        const error = errorResolver({ status: 409 }, responseData);

        expect(error.name).toBe("ConfirmationRequiredError");
        expect(error.digest).toBe("abc123");
        expect(error.messages).toEqual({ non_field_errors: ["This transition has consequences."] });
        expect(error.bulk).toBe(false);
    });

    scopedIt("executeTransition maps a 409 response to bulk:true when objectPk is a one-item array", async () => {
        mockedFetchHelper.mockRejectedValue(new Error("boom"));
        const store = storeWorkflow();

        await store.executeTransition("app", "model", ["9"], "close").catch(() => {});

        const errorResolver = mockedFetchHelper.mock.calls[0][6];
        const responseData = {
            confirmation_required: true,
            digest: "abc123",
            warnings: { 9: { non_field_errors: ["This transition has consequences."] } },
        };

        const error = errorResolver({ status: 409 }, responseData);

        // A one-item bulk-transition request still went through the bulk (object_ids) request
        // path, so the response is still the per-object shape -- the renderer must key its
        // shape decision on that request path, not on how many ids the array contained.
        expect(error.bulk).toBe(true);
        expect(error.messages).toEqual({ 9: { non_field_errors: ["This transition has consequences."] } });
    });

    scopedIt("executeTransition still supports legacy nested state code mapping", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { state: { code: "closed" } },
            new_transitions: [],
        });
        const store = storeWorkflow();
        const key = getAppModelDotName({ app: "app", model: "model" });
        store.objectStates[key] = { 1: {} };
        store.objectTransitions[key] = { 1: {} };
        const router = { push: vi.fn() };

        await store.executeTransition("app", "model", "1", "close", router, { closed: "/closed" });

        expect(router.push).toHaveBeenCalledWith("/closed");
    });

    scopedIt("initializeObjectTransitions creates structures", () => {
        const store = storeWorkflow();
        store.initializeObjectTransitions("app", "model");
        const key = getAppModelDotName({ app: "app", model: "model" });
        expect(store.objectTransitions[key]).toEqual({});
        expect(store.promises.objectTransitions[key]).toEqual({});
        expect(store.errors.objectTransitions[key]).toEqual({});
    });
    describe("clearAuthScoped", () => {
        const seedEverything = async (store) => {
            mockedFetchHelper.mockResolvedValue([{ code: "one", name: "One" }]);
            await store.fetchWorkflowTransition("app", "model");
            mockedFetchHelper.mockResolvedValue([{ code: "draft", name: "Draft" }]);
            await store.fetchModelStates("app", "model");
            mockedFetchHelper.mockResolvedValue({ state: { code: "draft" } });
            await store.fetchObjectState("app", "model", "1");
            mockedFetchHelper.mockResolvedValue({ transitions: [] });
            await store.fetchObjectTransitions("app", "model", "1");
            mockedFetchHelper.mockResolvedValue({ history: [] });
            await store.fetchObjectHistory("app", "model", "1");
        };

        scopedIt("empties every cache along with the error and promise maps", async () => {
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });
            await seedEverything(store);
            store.errors.workflowTransitions["other.model"] = new Error("cached");
            store.errors.objectStates[key]["2"] = new Error("cached");
            store.promises.modelStates["other.model"] = Promise.resolve([]);

            expect(store.workflowTransitions[key]).toBeDefined();
            expect(store.objectStates[key]["1"]).toBeDefined();

            store.clearAuthScoped();

            expect(store.workflowTransitions).toEqual({});
            expect(store.modelStates).toEqual({});
            expect(store.objectStates).toEqual({});
            expect(store.objectTransitions).toEqual({});
            expect(store.objectHistories).toEqual({});
            for (const bucket of [
                "workflowTransitions",
                "modelStates",
                "objectStates",
                "objectTransitions",
                "objectHistories",
            ]) {
                expect(store.errors[bucket]).toEqual({});
                expect(store.promises[bucket]).toEqual({});
            }
            // integrator configuration, not user data
            expect(storeWorkflowModule.getUsingVuedaWorkflow()).toBe(true);
        });

        scopedIt("writes nothing when an object-transitions response arrives after the clear", async () => {
            const store = storeWorkflow();
            let resolveFetch;
            mockedFetchHelper.mockReturnValue(
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
            );

            const inFlight = store.fetchObjectTransitions("app", "model", "1");
            store.clearAuthScoped();
            resolveFetch({ transitions: [{ code: "one", name: "One" }] });

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(store.objectTransitions).toEqual({});
        });

        scopedIt("does not cache a transitions error that arrives after the clear", async () => {
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });
            let rejectFetch;
            mockedFetchHelper.mockReturnValueOnce(
                new Promise((resolve, reject) => {
                    rejectFetch = reject;
                }),
            );

            const inFlight = store.fetchWorkflowTransition("app", "model");
            store.clearAuthScoped();
            rejectFetch(new Error("Forbidden"));

            await expect(inFlight).rejects.toThrow("Forbidden");
            expect(store.errors.workflowTransitions[key]).toBeUndefined();

            mockedFetchHelper.mockResolvedValueOnce([{ code: "one", name: "One" }]);
            await store.fetchWorkflowTransition("app", "model");
            expect(mockedFetchHelper).toHaveBeenCalledTimes(2);
            expect(store.workflowTransitions[key]).toEqual([{ code: "one", name: "One" }]);
        });
    });
});
