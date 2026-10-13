import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";

let storeWorkflowModule, storeWorkflow, storeModelInfo, mockedFetchHelper, AuthScopeInvalidatedError;

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
        ({ storeModelInfo } = await import("@vueda/stores/storeModelInfo.js"));
        ({ AuthScopeInvalidatedError } = await import("@vueda/utils/errors.js"));
        // the store requests workflow data only for a model whose model info reports workflow
        storeModelInfo().infos[getAppModelDotName({ app: "app", model: "model" })] = { workflowEnabled: true };
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

    describe("a model whose model info does not report workflow", () => {
        beforeEach(() => {
            storeModelInfo().infos[getAppModelDotName({ app: "app", model: "model" })] = { workflowEnabled: false };
        });

        scopedIt.each([
            ["fetchWorkflowTransition", ["app", "model"]],
            ["fetchObjectHistory", ["app", "model", "1"]],
        ])("%s resolves an empty array without a request", async (action, args) => {
            const store = storeWorkflow();

            const result = await store[action](...args);

            expect(result).toEqual([]);
            expect(mockedFetchHelper).not.toHaveBeenCalled();
        });
    });

    scopedIt("fetchWorkflowTransition fetches model info first when it is not cached", async () => {
        const modelInfoStore = storeModelInfo();
        delete modelInfoStore.infos[getAppModelDotName({ app: "app", model: "model" })];
        const transitions = [{ code: "one", name: "One" }];
        const fetchModelInfo = vi.spyOn(modelInfoStore, "fetchModelInfo").mockImplementation(async (args) => {
            const info = { workflowEnabled: true };
            modelInfoStore.infos[getAppModelDotName(args)] = info;
            return info;
        });
        mockedFetchHelper.mockResolvedValue(transitions);
        const store = storeWorkflow();

        const result = await store.fetchWorkflowTransition("app", "model");

        expect(fetchModelInfo).toHaveBeenCalledWith({ app: "app", model: "model" });
        expect(mockedFetchHelper).toHaveBeenCalledTimes(1);
        expect(result).toEqual(transitions);
    });

    scopedIt("fetchWorkflowTransition makes no request when uncached model info does not report workflow", async () => {
        const modelInfoStore = storeModelInfo();
        delete modelInfoStore.infos[getAppModelDotName({ app: "app", model: "model" })];
        vi.spyOn(modelInfoStore, "fetchModelInfo").mockImplementation(async (args) => {
            const info = { workflowEnabled: false };
            modelInfoStore.infos[getAppModelDotName(args)] = info;
            return info;
        });
        const store = storeWorkflow();

        const result = await store.fetchWorkflowTransition("app", "model");

        expect(result).toEqual([]);
        expect(mockedFetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetchWorkflowTransition rejects with the model info error when model info fails", async () => {
        const modelInfoStore = storeModelInfo();
        delete modelInfoStore.infos[getAppModelDotName({ app: "app", model: "model" })];
        const error = new Error("no model info");
        vi.spyOn(modelInfoStore, "fetchModelInfo").mockRejectedValue(error);
        const store = storeWorkflow();

        await expect(store.fetchWorkflowTransition("app", "model")).rejects.toBe(error);
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

    scopedIt("fetchWorkflowTransition maps a 403 response to WorkflowPermissionDeniedError", async () => {
        mockedFetchHelper.mockRejectedValue(new Error("boom"));
        const store = storeWorkflow();

        await store.fetchWorkflowTransition("app", "model").catch(() => {});

        const errorResolver = mockedFetchHelper.mock.calls[0][6];
        const error = errorResolver({ status: 403 }, { detail: "nope" });

        expect(error.name).toBe("WorkflowPermissionDeniedError");
        expect(error.response).toEqual({ status: 403 });
        expect(error.responseData).toEqual({ detail: "nope" });
        expect(error).toBeInstanceOf(storeWorkflowModule.WorkflowError);
    });

    scopedIt("fetchWorkflowTransition maps a non-403 response to plain WorkflowError", async () => {
        mockedFetchHelper.mockRejectedValue(new Error("boom"));
        const store = storeWorkflow();

        await store.fetchWorkflowTransition("app", "model").catch(() => {});

        const errorResolver = mockedFetchHelper.mock.calls[0][6];
        const error = errorResolver({ status: 500 }, { detail: "server error" });

        expect(error.name).toBe("WorkflowError");
        expect(error).not.toBeInstanceOf(storeWorkflowModule.WorkflowPermissionDeniedError);
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

    describe("fetchObjectHistory", () => {
        const history = [
            {
                id: "vueda_workflow.ObjectState:1",
                state: "draft",
                recorded_at: "2026-01-01T00:00:00Z",
                actor: 3,
            },
            {
                id: "vueda_workflow.ObjectState:2",
                state: "approved",
                recorded_at: "2026-01-02T00:00:00Z",
                actor: null,
            },
        ];

        scopedIt("resolves to the history on a first fetch and on a cached fetch", async () => {
            mockedFetchHelper.mockResolvedValue(history);
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });

            await expect(store.fetchObjectHistory("app", "model", "1")).resolves.toEqual(history);
            expect(store.objectHistories[key]["1"]).toEqual(history);

            mockedFetchHelper.mockClear();
            await expect(store.fetchObjectHistory("app", "model", "1")).resolves.toEqual(history);
            expect(mockedFetchHelper).not.toHaveBeenCalled();
        });

        scopedIt("shares one request between concurrent calls for the same object", async () => {
            mockedFetchHelper.mockResolvedValue(history);
            const store = storeWorkflow();

            const results = await Promise.all([
                store.fetchObjectHistory("app", "model", "1"),
                store.fetchObjectHistory("app", "model", "1"),
            ]);

            expect(results).toEqual([history, history]);
            expect(mockedFetchHelper).toHaveBeenCalledTimes(1);
        });

        scopedIt("requests the server's workflow-state-history route", async () => {
            storeModelInfo().infos[getAppModelDotName({ app: "store", model: "CustomerOrder" })] = {
                workflowEnabled: true,
            };
            mockedFetchHelper.mockResolvedValue(history);
            const store = storeWorkflow();

            await store.fetchObjectHistory("store", "CustomerOrder", "7");

            // server/vueda/history/urls.py serves `vueda.history/workflow-state-history/<app_label>/<model>/<int:object_id>/`
            // inside the `routes/` path.
            const [url, options] = mockedFetchHelper.mock.calls[0];
            expect(new URL(url).pathname).toBe("/routes/vueda.history/workflow-state-history/store/customer_order/7/");
            expect(options).toEqual({ method: "GET" });
        });

        scopedIt("rejects with the WorkflowError for an object without a workflow state, and caches it", async () => {
            // the server answers `{"detail": "Object does not have a workflow state history."}` with a 404
            const error = new storeWorkflowModule.WorkflowError(
                "Failed to fetch object histories",
                { status: 404 },
                { detail: "Object does not have a workflow state history." },
            );
            mockedFetchHelper.mockRejectedValue(error);
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });

            await expect(store.fetchObjectHistory("app", "model", "1")).rejects.toBe(error);
            expect(store.objectHistories[key]["1"]).toBeUndefined();
            expect(store.errors.objectHistories[key]["1"]).toBe(error);
            expect(store.promises.objectHistories[key]["1"]).toBeUndefined();

            mockedFetchHelper.mockClear();
            await expect(store.fetchObjectHistory("app", "model", "1")).rejects.toBe(error);
            expect(mockedFetchHelper).not.toHaveBeenCalled();
        });

        scopedIt("rejects when app, model, or objectPk is missing", async () => {
            const store = storeWorkflow();

            await expect(store.fetchObjectHistory("app", "model", "")).rejects.toThrow(
                "storeWorkflow.fetchObjectHistory: app, model and objectPk must all be provided",
            );
            expect(mockedFetchHelper).not.toHaveBeenCalled();
        });

        scopedIt("initializes per-model containers on cold call", async () => {
            mockedFetchHelper.mockResolvedValue([]);
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });

            expect(store.objectHistories[key]).toBeUndefined();
            expect(store.promises.objectHistories[key]).toBeUndefined();
            expect(store.errors.objectHistories[key]).toBeUndefined();

            await expect(store.fetchObjectHistory("app", "model", "1")).resolves.toEqual([]);

            expect(store.objectHistories[key]).toBeTypeOf("object");
            expect(store.promises.objectHistories[key]).toBeTypeOf("object");
            expect(store.errors.objectHistories[key]).toBeTypeOf("object");
            expect(store.promises.objectHistories[key]["1"]).toBeUndefined();
        });

        scopedIt("fetches the history again after executeTransition runs on the object", async () => {
            mockedFetchHelper.mockResolvedValueOnce(history.slice(0, 1));
            const store = storeWorkflow();
            await store.fetchObjectHistory("app", "model", "1");

            mockedFetchHelper.mockResolvedValueOnce({
                new_state: { code: "approved", name: "Approved" },
                new_transitions: [],
            });
            await store.executeTransition("app", "model", "1", "approve");

            mockedFetchHelper.mockResolvedValueOnce(history);
            await expect(store.fetchObjectHistory("app", "model", "1")).resolves.toEqual(history);
            expect(mockedFetchHelper).toHaveBeenCalledTimes(3);
        });

        scopedIt("resolves but does not cache a history that was in flight when executeTransition ran", async () => {
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });
            let resolveEarlierFetch;
            mockedFetchHelper.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolveEarlierFetch = resolve;
                }),
            );
            const earlierFetch = store.fetchObjectHistory("app", "model", "1");

            mockedFetchHelper.mockResolvedValueOnce({
                new_state: { code: "approved", name: "Approved" },
                new_transitions: [],
            });
            await store.executeTransition("app", "model", "1", "approve");

            resolveEarlierFetch(history.slice(0, 1));
            await expect(earlierFetch).resolves.toEqual(history.slice(0, 1));
            expect(store.objectHistories[key]["1"]).toBeUndefined();
            expect(store.promises.objectHistories[key]["1"]).toBeUndefined();
        });

        scopedIt(
            "sends a new request for a call made after executeTransition while an earlier one is in flight",
            async () => {
                const store = storeWorkflow();
                const key = getAppModelDotName({ app: "app", model: "model" });
                let resolveEarlierFetch;
                mockedFetchHelper.mockReturnValueOnce(
                    new Promise((resolve) => {
                        resolveEarlierFetch = resolve;
                    }),
                );
                const earlierFetch = store.fetchObjectHistory("app", "model", "1");

                mockedFetchHelper.mockResolvedValueOnce({
                    new_state: { code: "approved", name: "Approved" },
                    new_transitions: [],
                });
                await store.executeTransition("app", "model", "1", "approve");

                mockedFetchHelper.mockResolvedValueOnce(history);
                const laterFetch = store.fetchObjectHistory("app", "model", "1");
                expect(mockedFetchHelper).toHaveBeenCalledTimes(3);
                await expect(laterFetch).resolves.toEqual(history);

                // the earlier request settles last, and the later request's history stays cached
                resolveEarlierFetch(history.slice(0, 1));
                await expect(earlierFetch).resolves.toEqual(history.slice(0, 1));
                expect(store.objectHistories[key]["1"]).toEqual(history);
            },
        );

        scopedIt("drops the cached history of every object in a bulk executeTransition", async () => {
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });
            mockedFetchHelper.mockResolvedValue(history);
            await store.fetchObjectHistory("app", "model", "1");
            await store.fetchObjectHistory("app", "model", "2");
            await store.fetchObjectHistory("app", "model", "3");

            mockedFetchHelper.mockResolvedValue({
                1: { new_state: { code: "approved", name: "Approved" }, new_transitions: [] },
                2: { new_state: { code: "approved", name: "Approved" }, new_transitions: [] },
            });
            await store.executeTransition("app", "model", ["1", "2"], "approve");

            expect(store.objectHistories[key]["1"]).toBeUndefined();
            expect(store.objectHistories[key]["2"]).toBeUndefined();
            expect(store.objectHistories[key]["3"]).toEqual(history);
        });

        scopedIt("keeps the cached history after a dry run", async () => {
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });
            mockedFetchHelper.mockResolvedValueOnce(history);
            await store.fetchObjectHistory("app", "model", "1");

            mockedFetchHelper.mockResolvedValueOnce({
                new_state: { code: "approved", name: "Approved" },
                new_transitions: [],
            });
            await store.executeTransition("app", "model", "1", "approve", undefined, undefined, true);

            expect(store.objectHistories[key]["1"]).toEqual(history);
        });
    });

    scopedIt("executeTransition resolves to the response and pushes the route for the new state", async () => {
        const response = {
            new_state: { code: "closed", name: "Closed" },
            new_transitions: [{ code: "reopen", name: "Reopen" }],
        };
        mockedFetchHelper.mockResolvedValue(response);
        const store = storeWorkflow();
        const router = { push: vi.fn() };
        const mapping = { closed: "/closed" };

        await expect(store.executeTransition("app", "model", "1", "close", router, mapping)).resolves.toEqual(response);

        expect(router.push).toHaveBeenCalledWith("/closed");
    });

    scopedIt("executeTransition adds Dry-Run header when performing dry run", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { code: "closed", name: "Closed" },
            new_transitions: [],
        });
        const store = storeWorkflow();

        await store.executeTransition("app", "model", "1", "close", undefined, undefined, true);

        const options = mockedFetchHelper.mock.calls[0][1];
        expect(options.headers["Dry-Run"]).toBe("true");
    });

    scopedIt("executeTransition leaves the route alone after a dry run", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { code: "closed", name: "Closed" },
            new_transitions: [{ code: "reopen", name: "Reopen" }],
        });
        const store = storeWorkflow();
        const router = { push: vi.fn() };

        await store.executeTransition("app", "model", "1", "close", router, { closed: "/closed" }, true);

        expect(router.push).not.toHaveBeenCalled();
    });

    scopedIt("executeTransition adds Acknowledge-Warnings header when acknowledging warnings", async () => {
        mockedFetchHelper.mockResolvedValue({
            new_state: { code: "closed", name: "Closed" },
            new_transitions: [],
        });
        const store = storeWorkflow();

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
        const router = { push: vi.fn() };

        await store.executeTransition("app", "model", "1", "close", router, { closed: "/closed" });

        expect(router.push).toHaveBeenCalledWith("/closed");
    });

    describe("clearAuthScoped", () => {
        const seedEverything = async (store) => {
            mockedFetchHelper.mockResolvedValue([{ code: "one", name: "One" }]);
            await store.fetchWorkflowTransition("app", "model");
            mockedFetchHelper.mockResolvedValue([{ id: "vueda_workflow.ObjectState:1", state: "draft" }]);
            await store.fetchObjectHistory("app", "model", "1");
        };

        scopedIt("empties every cache along with the error and promise maps", async () => {
            const store = storeWorkflow();
            const key = getAppModelDotName({ app: "app", model: "model" });
            await seedEverything(store);
            store.errors.workflowTransitions["other.model"] = new Error("cached");
            store.errors.objectHistories[key]["2"] = new Error("cached");
            store.promises.workflowTransitions["other.model"] = Promise.resolve([]);

            expect(store.workflowTransitions[key]).toBeDefined();
            expect(store.objectHistories[key]["1"]).toBeDefined();

            store.clearAuthScoped();

            expect(store.workflowTransitions).toEqual({});
            expect(store.objectHistories).toEqual({});
            for (const bucket of ["workflowTransitions", "objectHistories"]) {
                expect(store.errors[bucket]).toEqual({});
                expect(store.promises[bucket]).toEqual({});
            }
            // integrator configuration, not user data
            expect(storeWorkflowModule.getUsingVuedaWorkflow()).toBe(true);
        });

        scopedIt("writes nothing when an object-history response arrives after the clear", async () => {
            const store = storeWorkflow();
            let resolveFetch;
            mockedFetchHelper.mockReturnValue(
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
            );

            const inFlight = store.fetchObjectHistory("app", "model", "1");
            store.clearAuthScoped();
            resolveFetch([{ id: "vueda_workflow.ObjectState:1", state: "draft" }]);

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(store.objectHistories).toEqual({});
        });

        scopedIt(
            "converts an object-history error that arrives after the clear to AuthScopeInvalidatedError",
            async () => {
                const store = storeWorkflow();
                const key = getAppModelDotName({ app: "app", model: "model" });
                let rejectFetch;
                mockedFetchHelper.mockReturnValueOnce(
                    new Promise((resolve, reject) => {
                        rejectFetch = reject;
                    }),
                );

                const inFlight = store.fetchObjectHistory("app", "model", "1");
                store.clearAuthScoped();
                rejectFetch(
                    new storeWorkflowModule.WorkflowError(
                        "Failed to fetch object histories",
                        { status: 403 },
                        { detail: "nope" },
                    ),
                );

                // the rejection was determined for the principal `clearAuthScoped` just discarded
                const error = await inFlight.catch((e) => e);
                expect(error).toBeInstanceOf(AuthScopeInvalidatedError);
                expect(error).not.toBeInstanceOf(storeWorkflowModule.WorkflowError);
                expect(store.errors.objectHistories[key]?.["1"]).toBeUndefined();

                const history = [{ id: "vueda_workflow.ObjectState:1", state: "draft" }];
                mockedFetchHelper.mockResolvedValueOnce(history);
                await expect(store.fetchObjectHistory("app", "model", "1")).resolves.toEqual(history);
                expect(mockedFetchHelper).toHaveBeenCalledTimes(2);
            },
        );

        scopedIt("converts a transitions error that arrives after the clear to AuthScopeInvalidatedError", async () => {
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

            // the rejection was determined for the principal `clearAuthScoped` just discarded, so it
            // must not reach the caller as-is -- not even a permission denial for that previous user
            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(store.errors.workflowTransitions[key]).toBeUndefined();

            mockedFetchHelper.mockResolvedValueOnce([{ code: "one", name: "One" }]);
            await store.fetchWorkflowTransition("app", "model");
            expect(mockedFetchHelper).toHaveBeenCalledTimes(2);
            expect(store.workflowTransitions[key]).toEqual([{ code: "one", name: "One" }]);
        });

        scopedIt(
            "does not let a denial fetched for a replaced user surface as WorkflowPermissionDeniedError",
            async () => {
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
                rejectFetch(
                    new storeWorkflowModule.WorkflowPermissionDeniedError(
                        "Failed to fetch workflow transitions for model",
                        { status: 403 },
                        { detail: "nope" },
                    ),
                );

                const error = await inFlight.catch((e) => e);
                expect(error).toBeInstanceOf(AuthScopeInvalidatedError);
                expect(error).not.toBeInstanceOf(storeWorkflowModule.WorkflowPermissionDeniedError);
                expect(store.errors.workflowTransitions[key]).toBeUndefined();
            },
        );
    });
});
