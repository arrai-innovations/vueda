import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useModelAction } from "@vueda/use/useModelAction.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { FetchError } from "@vueda/utils/errors.js";
import { reactive } from "vue";

const mocks = vi.hoisted(() => {
    const modelConfig = {
        info: { verboseName: "person", verboseNamePlural: "people" },
        config: { actionRedirects: { default: "detail" } },
    };
    return {
        modelConfig,
        routerPush: vi.fn(),
        routeQuery: {},
        // Assigned in beforeEach; the composable calls these factories during setup.
        fallbackList: null,
        instanceObject: null,
        useListInstanceCalls: vi.fn(),
    };
});

const { modelConfig, routerPush } = mocks;
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => mocks.modelConfig }));
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: mocks.routerPush }),
    useRoute: () => ({ query: mocks.routeQuery }),
}));
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useListInstance: (...args) => {
            mocks.useListInstanceCalls(...args);
            return mocks.fallbackList;
        },
        useObjectInstance: () => mocks.instanceObject,
    };
});

/**
 * A stand-in for a reactive-helpers instance: enough state for the composable's readiness gate and
 * error hand-off, with the action verbs spied.
 *
 * @returns {object} The instance stub.
 */
function createInstanceStub() {
    const state = reactive({ loading: false, errored: false, error: null });
    const stub = {
        state,
        clearError: vi.fn(() => {
            state.errored = false;
            state.error = null;
        }),
        bulkDelete: vi.fn(() => Promise.resolve(true)),
        delete: vi.fn(() => Promise.resolve(true)),
        executeAction: vi.fn(() => Promise.resolve({ ok: true })),
    };
    return stub;
}

/**
 * @param {object[]} [objectsInOrder] - The selected objects.
 * @returns {object} A fetch-state stand-in.
 */
function createFetchState(objectsInOrder = [{ id: 1 }, { id: 2 }]) {
    return reactive({
        objectsInOrder,
        objectsMap: new Map(objectsInOrder.map((obj) => [String(obj.id), obj])),
    });
}

describe("lib/use/useModelAction.js", () => {
    beforeEach(() => {
        modelConfig.info = { verboseName: "person", verboseNamePlural: "people" };
        modelConfig.config = { actionRedirects: { default: "detail" } };
        mocks.fallbackList = createInstanceStub();
        mocks.instanceObject = createInstanceStub();
        mocks.useListInstanceCalls.mockClear();
        routerPush.mockClear();
        mocks.routeQuery = {};
    });

    scopedIt("derives target state from fetchState and falls back to pk", async () => {
        const fromFetchState = await withSetup(() =>
            useModelAction(
                reactive({
                    app: "app",
                    model: "person",
                    action: "archive",
                    pk: ["fallback"],
                    fetchState: createFetchState([{ id: 4 }, { id: 7 }]),
                }),
            ),
        );
        expect(fromFetchState.state.pks.value).toEqual([4, 7]);
        expect(fromFetchState.state.pksAsString.value).toEqual(["4", "7"]);
        expect(fromFetchState.state.bulk.value).toBe(true);
        expect(fromFetchState.state.pkCount.value).toBe(2);

        const fromPk = await withSetup(() =>
            useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
        );
        expect(fromPk.state.pks.value).toEqual(["9"]);
        expect(fromPk.state.pksAsString.value).toEqual(["9"]);
        expect(fromPk.state.bulk.value).toBe(false);
    });

    describe("Transport instances", () => {
        scopedIt("creates a transport-only list when the caller supplies none", async () => {
            await withSetup(() => useModelAction(reactive({ app: "app", model: "person", action: "archive" })));
            expect(mocks.useListInstanceCalls).toHaveBeenCalledTimes(1);
        });

        scopedIt("uses the caller's list instead of creating one", async () => {
            const instanceList = createInstanceStub();
            await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", instanceList })),
            );
            expect(mocks.useListInstanceCalls).not.toHaveBeenCalled();
        });
    });

    describe("runAction", () => {
        scopedIt("routes a bulk action through the list's executeAction", async () => {
            const instanceList = createInstanceStub();
            const transformSubmitDataFn = vi.fn(() => ({ reason: "stale" }));
            const modelAction = await withSetup(() =>
                useModelAction(
                    reactive({
                        app: "app",
                        model: "person",
                        action: "archive",
                        requestMethod: "PATCH",
                        instanceList,
                        fetchState: createFetchState([{ id: 4 }, { id: 7 }]),
                        transformSubmitDataFn,
                    }),
                ),
            );

            const result = await modelAction.runAction({
                formValues: { raw: true },
                dryRun: true,
                acknowledgeWarnings: "d1",
            });

            expect(instanceList.executeAction).toHaveBeenCalledWith({
                action: "archive",
                pks: [4, 7],
                requestMethod: "PATCH",
                formData: { reason: "stale" },
                dryRun: true,
                acknowledgeWarnings: "d1",
            });
            expect(transformSubmitDataFn).toHaveBeenCalledWith({ raw: true });
            expect(result).toEqual({ ok: true });
        });

        scopedIt("routes a single action through the object's executeAction", async () => {
            const modelAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
            );

            await modelAction.runAction({ formValues: {} });

            expect(mocks.instanceObject.executeAction).toHaveBeenCalledWith({
                action: "archive",
                requestMethod: undefined,
                formData: undefined,
                dryRun: false,
                acknowledgeWarnings: undefined,
            });
        });

        scopedIt("routes a bulk destroy through bulkDelete, keeping rows only on a dry run", async () => {
            const instanceList = createInstanceStub();
            const modelAction = await withSetup(() =>
                useModelAction(
                    reactive({ app: "app", model: "person", action: "destroy", pk: ["4", "7"], instanceList }),
                ),
            );

            await modelAction.runAction({ dryRun: true });
            expect(instanceList.bulkDelete).toHaveBeenLastCalledWith(
                expect.objectContaining({ pks: ["4", "7"], dryRun: true, keepObjects: true }),
            );

            await modelAction.runAction({});
            expect(instanceList.bulkDelete).toHaveBeenLastCalledWith(
                expect.objectContaining({ pks: ["4", "7"], dryRun: false, keepObjects: false }),
            );
            expect(instanceList.executeAction).not.toHaveBeenCalled();
        });

        scopedIt("routes a single destroy through the object's delete, keeping state only on a dry run", async () => {
            const modelAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "destroy", pk: "9" })),
            );

            await modelAction.runAction({ dryRun: true });
            expect(mocks.instanceObject.delete).toHaveBeenLastCalledWith(
                expect.objectContaining({ dryRun: true, keepObject: true }),
            );

            await modelAction.runAction({});
            expect(mocks.instanceObject.delete).toHaveBeenLastCalledWith(
                expect.objectContaining({ dryRun: false, keepObject: false }),
            );
        });

        scopedIt("rethrows the instance's stored error and clears it from the instance", async () => {
            const failure = new FetchError("nope", new Response(null, { status: 500 }), {});
            mocks.instanceObject.executeAction.mockImplementation(() => {
                mocks.instanceObject.state.errored = true;
                mocks.instanceObject.state.error = failure;
                return Promise.resolve(null);
            });
            const modelAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
            );

            await expect(modelAction.runAction({})).rejects.toBe(failure);
            // The views hand the same state to the form as `fetchState`; left in place the error would
            // also render as a fetch-failure banner beside whatever useActionForm reports.
            expect(mocks.instanceObject.clearError).toHaveBeenCalled();
        });
    });

    describe("readyToDryRun", () => {
        scopedIt("waits for the instance to finish loading", async () => {
            const instanceList = createInstanceStub();
            instanceList.state.loading = true;
            const modelAction = await withSetup(() =>
                useModelAction(
                    reactive({ app: "app", model: "person", action: "archive", pk: ["4", "7"], instanceList }),
                ),
            );

            expect(modelAction.state.readyToDryRun.value).toBe(false);
            instanceList.state.loading = false;
            expect(modelAction.state.readyToDryRun.value).toBe(true);
        });

        scopedIt("carries no latch of its own: stays true across a dry-run call for the same target", async () => {
            // The per-target latch lives in `useActionForm`, keyed off `dryRunTarget` below -- `readyToDryRun`
            // only reports whether a dry run could run right now, so it recomputes to `true` again as soon as
            // the (stubbed, always-idle) action instance settles back down after the call.
            const fetchState = createFetchState([{ id: 4 }]);
            const modelAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", fetchState })),
            );

            expect(modelAction.state.readyToDryRun.value).toBe(true);
            await modelAction.runAction({ dryRun: true });
            expect(modelAction.state.readyToDryRun.value).toBe(true);
        });

        scopedIt("stays false when dry runs are disabled", async () => {
            const modelAction = await withSetup(() =>
                useModelAction(
                    reactive({ app: "app", model: "person", action: "archive", pk: "9", enableDryRun: false }),
                ),
            );
            expect(modelAction.state.readyToDryRun.value).toBe(false);
        });
    });

    describe("dryRunTarget", () => {
        scopedIt("identifies the current target and changes when the selection changes", async () => {
            const fetchState = createFetchState([{ id: 4 }, { id: 7 }]);
            const modelAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", fetchState })),
            );

            expect(modelAction.state.dryRunTarget.value).toBe("4,7");
            fetchState.objectsInOrder = [{ id: 5 }];
            expect(modelAction.state.dryRunTarget.value).toBe("5");
        });
    });

    describe("redirectTo", () => {
        scopedIt("redirects through returnPath, list, and detail targets", async () => {
            mocks.routeQuery = { returnPath: "/back" };
            const returnPathAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
            );
            await returnPathAction.redirectTo("success");
            expect(routerPush).toHaveBeenLastCalledWith("/back");

            mocks.routeQuery = {};
            const detailAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: "9" })),
            );
            await detailAction.redirectTo("success");
            expect(routerPush).toHaveBeenLastCalledWith({
                name: DETAIL_VIEW_CRUD_NAME,
                params: { app: "app", model: "person", action: "detail", pk: "9" },
            });

            const bulkAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "archive", pk: ["4", "7"] })),
            );
            await bulkAction.redirectTo("success");
            expect(routerPush).toHaveBeenLastCalledWith({
                name: LIST_VIEW_CRUD_NAME,
                params: { app: "app", model: "person", action: "list" },
            });
        });

        scopedIt("still redirects to the list after a bulk destroy emptied it", async () => {
            const instanceList = createInstanceStub();
            const fetchState = createFetchState([{ id: 4 }, { id: 7 }]);
            // A real bulk delete removes the deleted rows, so `pks` is empty by the time the redirect runs.
            instanceList.bulkDelete.mockImplementation(() => {
                fetchState.objectsInOrder = [];
                fetchState.objectsMap = new Map();
                return Promise.resolve(true);
            });
            const modelAction = await withSetup(() =>
                useModelAction(reactive({ app: "app", model: "person", action: "destroy", instanceList, fetchState })),
            );

            await modelAction.runAction({});
            await modelAction.redirectTo("success");

            expect(routerPush).toHaveBeenLastCalledWith({
                name: LIST_VIEW_CRUD_NAME,
                params: { app: "app", model: "person", action: "list" },
            });
        });
    });
});
