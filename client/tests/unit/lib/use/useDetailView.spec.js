import { useObject } from "@arrai-innovations/reactive-helpers";
import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { FIELDS_PARAM } from "@vueda/utils/constants.js";
import { objectStreamsEnabled } from "@vueda/utils/objectStreams.js";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

vi.mock("@vueda/use/useLeaveUnload.js", () => ({ useLeaveUnload: vi.fn() }));
vi.mock("vue-router", async () => ({ ...(await vi.importActual("vue-router")), useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@vueda/use/useModelConfig.js", async () => {
    const actual = await vi.importActual("@vueda/use/useModelConfig.js");
    return { ...actual, useModelConfig: vi.fn() };
});
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useObject: vi.fn() };
});
vi.mock("@vueda/use/useIsActive.js", async () => {
    const actual = await vi.importActual("@vueda/use/useIsActive.js");
    return { ...actual, useIsActive: vi.fn() };
});
vi.mock("@vueda/use/useFilteredActions.js", async () => {
    const actual = await vi.importActual("@vueda/use/useFilteredActions.js");
    return { ...actual, useFilteredActions: vi.fn() };
});
vi.mock("@vueda/utils/objectStreams.js", () => ({ objectStreamsEnabled: vi.fn(() => false) }));
vi.mock("@vueda/use/useObject404.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObject404.js");
    return { ...actual, useObject404: vi.fn() };
});

describe("lib/use/useDetailView.js", () => {
    let props, formInitialValue, mockModelConfig, mockInstanceObject, mockFilteredActions;

    beforeEach(() => {
        // The composables under test resolve their pinia stores during setup, so one has to exist.
        setActivePinia(createPinia());

        props = reactive({
            app: "testApp",
            model: "testModel",
            viewName: "read",
            pk: "42",
            relatedObjectRules: {},
            calculatedObjectRules: {},
        });

        formInitialValue = reactive({});

        mockModelConfig = reactive({
            info: { pk: "id", verboseName: "widget" },
            config: {
                fetchFields: ["id", "name"],
                verboseName: "widget",
                expand: [],
                formProps: {},
                actionDetails: {},
            },
            loading: false,
            error: null,
        });

        mockInstanceObject = {
            state: reactive({
                object: { id: "42", name: "Test Widget", available_actions: [] },
                loading: false,
                error: null,
                relatedObjects: {},
                calculatedObjects: {},
                calculatedObject: {},
            }),
            clear: vi.fn(),
        };

        mockFilteredActions = reactive({ actions: [] });

        useModelConfig.mockReturnValue(mockModelConfig);
        useObject.mockReturnValue(mockInstanceObject);
        useIsActive.mockReturnValue(ref(true));
        useFilteredActions.mockReturnValue(mockFilteredActions);
        useObject404.mockReturnValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("retrieves the next record after a missing record and a failed form submission", async () => {
        const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");
        const { useObject404: realUseObject404 } = await vi.importActual("@vueda/use/useObject404.js");
        const { useObjectForm } = await import("@vueda/use/useObjectForm.js");
        const { default: flushPromises } = await import("flush-promises");
        const retrieve = vi.fn(async ({ pk }) => {
            if (pk === "42") {
                throw Object.assign(new Error("Missing"), { response: { status: 404 } });
            }
            return { id: pk, name: `Record ${pk}` };
        });
        useObject.mockImplementationOnce((options) => realUseObject({ ...options, handlers: { retrieve } }));
        useObject404.mockImplementationOnce(realUseObject404);
        const detail = await withSetup(() => {
            const detail = useDetailView(props, formInitialValue);
            props.objectForm = useObjectForm({
                props,
                formContext: { state: {}, reset: vi.fn() },
                instanceObject: detail.instanceObject,
            });
            return detail;
        });
        await flushPromises();
        expect(detail.instance.combinedError?.message).toContain("42");
        props.pk = "43";
        await flushPromises();
        expect(detail.instance.combinedError).toBeNull();
        expect(formInitialValue).toEqual({ id: "43", name: "Record 43" });
        props.objectForm.state.submitErrored = true;
        await nextTick();
        props.pk = "44";
        await flushPromises();
        expect(props.objectForm.state.submitErrored).toBe(false);
        expect(retrieve).toHaveBeenLastCalledWith(expect.objectContaining({ pk: "44" }));
        expect(formInitialValue).toEqual({ id: "44", name: "Record 44" });
    });

    describe("Live updates", () => {
        /** Mounts the view on the real useObject, with a subscribe handler that hands back its callback. */
        async function mountWithSubscribe(record = (pk) => ({ id: pk, name: "Fetched" })) {
            const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");
            const { default: flushPromises } = await import("flush-promises");
            const retrieve = vi.fn(async ({ pk }) => record(pk));
            // A subscribe handler resolves once it has subscribed, and stays cancellable.
            const cancels = [];
            const subscribe = vi.fn(() => {
                const cancel = vi.fn(async () => {});
                cancels.push(cancel);
                return Object.assign(Promise.resolve(), { cancel });
            });
            useObject.mockImplementationOnce((options) =>
                realUseObject({ ...options, handlers: { retrieve, subscribe } }),
            );
            const detail = await withSetup(() => useDetailView(props, formInitialValue));
            await flushPromises();
            return { detail, subscribe, cancels, flushPromises };
        }

        scopedIt("subscribes a view that asks to, once live updates are set up", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;

            const { detail, subscribe } = await mountWithSubscribe();

            expect(detail.instance.pageLoading).toBe(false);
            expect(formInitialValue).toEqual({ id: "42", name: "Fetched" });
            expect(subscribe).toHaveBeenCalledWith(
                expect.objectContaining({ pk: "42", target: { app: "testApp", model: "testModel", recordPk: "42" } }),
            );
        });

        scopedIt("subscribes a custom-lookup record by the primary key that the loaded record carries", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            props.pk = "C-1";
            mockModelConfig.info.lookupField = "code";
            const ids = { "C-1": 9, "C-2": 10 };

            const { subscribe, cancels, flushPromises } = await mountWithSubscribe((pk) => ({
                id: ids[pk],
                code: pk,
                name: "Fetched",
            }));

            expect(subscribe).toHaveBeenCalledTimes(1);
            expect(subscribe).toHaveBeenCalledWith(
                expect.objectContaining({ pk: "C-1", target: expect.objectContaining({ recordPk: 9 }) }),
            );

            props.pk = "C-2";
            await flushPromises();

            expect(cancels[0]).toHaveBeenCalled();
            expect(subscribe).toHaveBeenLastCalledWith(
                expect.objectContaining({ pk: "C-2", target: expect.objectContaining({ recordPk: 10 }) }),
            );
            // No subscription names the previous record while the next one loads.
            for (const [args] of subscribe.mock.calls) {
                expect(ids[args.pk]).toBe(args.target.recordPk);
            }
        });

        /**
         * Mounts a custom-lookup view on `C-1`. A retrieve of a lookup value in `held` waits until the test calls
         * `releases[value]()`. Each subscription is logged as it was at call time, and each cancel after it.
         */
        async function mountWithHeldLoads(ids, held) {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            props.pk = "C-1";
            mockModelConfig.info.lookupField = "code";
            const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");
            const { default: flushPromises } = await import("flush-promises");
            const releases = {};
            const retrieve = vi.fn(({ pk }) => {
                const record = { id: ids[pk], code: pk, name: "Invoice" };
                if (!held.includes(pk)) {
                    return Promise.resolve(record);
                }
                return new Promise((resolve) => {
                    releases[pk] = () => resolve(record);
                });
            });
            const events = [];
            const subscribe = vi.fn((args) => {
                events.push(`subscribe ${args.pk} recordPk=${args.target.recordPk}`);
                return Object.assign(Promise.resolve(), {
                    cancel: vi.fn(async () => {
                        events.push("cancel");
                    }),
                });
            });
            useObject.mockImplementationOnce((options) =>
                realUseObject({ ...options, handlers: { retrieve, subscribe } }),
            );
            await withSetup(() => useDetailView(props, formInitialValue));
            await flushPromises();
            return { releases, events, flushPromises };
        }

        scopedIt("subscribes once a slow first load delivers the record", async () => {
            const { releases, events, flushPromises } = await mountWithHeldLoads({ "C-1": 9 }, ["C-1"]);

            expect(events).toEqual([]);

            releases["C-1"]();
            await flushPromises();

            expect(events).toEqual(["subscribe C-1 recordPk=9"]);
        });

        scopedIt("waits for a slow load of the next object before it subscribes to that object", async () => {
            const { releases, events, flushPromises } = await mountWithHeldLoads({ "C-1": 9, "C-2": 10 }, ["C-2"]);

            props.pk = "C-2";
            await flushPromises();

            // The previous record is still on screen, so nothing subscribes until the next one arrives.
            expect(events).toEqual(["subscribe C-1 recordPk=9", "cancel"]);

            releases["C-2"]();
            await flushPromises();

            expect(events).toEqual(["subscribe C-1 recordPk=9", "cancel", "subscribe C-2 recordPk=10"]);
        });

        scopedIt("does not subscribe when the next object of the same model fails to load", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            props.pk = "C-1";
            mockModelConfig.info.lookupField = "code";
            const { subscribe, cancels, flushPromises } = await mountWithSubscribe((pk) => {
                if (pk === "C-2") {
                    throw new Error("Not found");
                }
                return { id: 9, code: pk, name: "Fetched" };
            });

            props.pk = "C-2";
            await flushPromises();

            // The previous record stays on screen, but it does not hold `C-2`, so it supplies no key.
            expect(subscribe).toHaveBeenCalledTimes(1);
            expect(cancels[0]).toHaveBeenCalled();
        });

        scopedIt("stops the subscription when the held record no longer holds the route's lookup value", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            props.pk = "C-1";
            mockModelConfig.info.lookupField = "code";

            const { subscribe, cancels, flushPromises } = await mountWithSubscribe((pk) => ({
                id: 9,
                code: pk,
                name: "Fetched",
            }));
            subscribe.mock.calls[0][0].callback({ id: 9, code: "C-9", name: "Renamed" }, "update");
            await flushPromises();

            expect(subscribe).toHaveBeenCalledTimes(1);
            expect(cancels[0]).toHaveBeenCalled();
        });

        /**
         * Mounts a custom-lookup view whose `otherModel` retrieve waits for `release` and then runs `otherRecord`.
         * `testModel` retrieves run `testRetrieve`. Each subscription is logged as it was at call time.
         */
        async function mountTwoModels(
            otherRecord,
            testRetrieve = (pk) => Promise.resolve({ id: 9, code: pk, name: "Invoice" }),
        ) {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            props.pk = "C-1";
            mockModelConfig.info.lookupField = "code";
            const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");
            const { default: flushPromises } = await import("flush-promises");
            let release;
            const released = new Promise((resolve) => {
                release = resolve;
            });
            const retrieve = vi.fn(({ target, pk }) =>
                target.model === "otherModel" ? released.then(() => otherRecord(pk)) : testRetrieve(pk),
            );
            const subscriptions = [];
            const subscribe = vi.fn((args) => {
                subscriptions.push({ model: args.target.model, pk: args.pk, recordPk: args.target.recordPk });
                return Object.assign(Promise.resolve(), { cancel: vi.fn(async () => {}) });
            });
            useObject.mockImplementationOnce((options) =>
                realUseObject({ ...options, handlers: { retrieve, subscribe } }),
            );
            await withSetup(() => useDetailView(props, formInitialValue));
            await flushPromises();
            // A model change reloads the model config, which pauses and then restarts the retrieve.
            const switchModel = async (model, pk = props.pk) => {
                mockModelConfig.loading = true;
                props.model = model;
                props.pk = pk;
                await flushPromises();
                mockModelConfig.loading = false;
                await flushPromises();
            };
            return { release, subscriptions, switchModel, flushPromises };
        }

        scopedIt("subscribes another model's record by its own key when the lookup value stays the same", async () => {
            const { release, subscriptions, switchModel, flushPromises } = await mountTwoModels((pk) => ({
                id: 20,
                code: pk,
                name: "Payment",
            }));

            await switchModel("otherModel");
            release();
            await flushPromises();

            expect(subscriptions).toEqual([
                { model: "testModel", pk: "C-1", recordPk: 9 },
                { model: "otherModel", pk: "C-1", recordPk: 20 },
            ]);
        });

        scopedIt("does not subscribe when the next route's record fails to load", async () => {
            const { release, subscriptions, switchModel, flushPromises } = await mountTwoModels(() => {
                throw new Error("Not found");
            });

            await switchModel("otherModel");
            release();
            await flushPromises();

            expect(subscriptions).toEqual([{ model: "testModel", pk: "C-1", recordPk: 9 }]);
        });

        scopedIt("does not take the key from the previous record when a pending load is cancelled", async () => {
            // Loading `C-2` stays pending until a model change cancels it.
            const testRetrieve = (pk) => {
                if (pk !== "C-2") {
                    return Promise.resolve({ id: 9, code: pk, name: "Invoice" });
                }
                let rejectPending;
                const pending = new Promise((_resolve, reject) => {
                    rejectPending = reject;
                });
                return Object.assign(pending, {
                    cancel: async (reason) => rejectPending(reason ?? new Error("Cancelled")),
                });
            };
            const { release, subscriptions, switchModel, flushPromises } = await mountTwoModels(
                (pk) => ({ id: 20, code: pk, name: "Payment" }),
                testRetrieve,
            );

            props.pk = "C-2";
            await flushPromises();
            await switchModel("otherModel", "C-1");
            release();
            await flushPromises();

            expect(subscriptions.filter(({ model }) => model === "otherModel")).toEqual([
                { model: "otherModel", pk: "C-1", recordPk: 20 },
            ]);
        });

        scopedIt("does not take the key from a previous load that finishes as the model changes", async () => {
            // The first load resolves at once. The reload waits for `finishReload`.
            let finishReload;
            let loads = 0;
            const testRetrieve = (pk) => {
                loads += 1;
                const record = { id: 9, code: pk, name: "Invoice" };
                return loads === 1
                    ? Promise.resolve(record)
                    : new Promise((resolve) => {
                          finishReload = () => resolve(record);
                      });
            };
            const { release, subscriptions, flushPromises } = await mountTwoModels(
                (pk) => ({ id: 20, code: pk, name: "Payment" }),
                testRetrieve,
            );
            // A model config reload pauses and restarts the retrieve, so the same record loads again.
            mockModelConfig.loading = true;
            await flushPromises();
            mockModelConfig.loading = false;
            await flushPromises();

            finishReload();
            mockModelConfig.loading = true;
            props.model = "otherModel";
            await flushPromises();
            mockModelConfig.loading = false;
            await flushPromises();
            release();
            await flushPromises();

            expect(subscriptions.filter(({ model }) => model === "otherModel")).toEqual([
                { model: "otherModel", pk: "C-1", recordPk: 20 },
            ]);
        });

        scopedIt("keeps the primary key when its own save moves the route to a new lookup value", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            props.pk = "C-1";
            mockModelConfig.info.lookupField = "code";
            const { subscribe, flushPromises } = await mountWithSubscribe((pk) => ({
                id: 9,
                code: pk,
                name: "Fetched",
            }));

            // The saved record arrives with its new lookup value, then the route follows it.
            subscribe.mock.calls[0][0].callback({ id: 9, code: "C-2", name: "Fetched" }, "update");
            await flushPromises();
            props.pk = "C-2";
            await flushPromises();

            expect(subscribe).toHaveBeenLastCalledWith(
                expect.objectContaining({ pk: "C-2", target: expect.objectContaining({ recordPk: 9 }) }),
            );
        });

        scopedIt("moves the subscription to the next record when the primary key changes", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            const { subscribe, cancels, flushPromises } = await mountWithSubscribe();

            props.pk = "43";
            await flushPromises();

            expect(cancels[0]).toHaveBeenCalled();
            expect(subscribe).toHaveBeenLastCalledWith(expect.objectContaining({ pk: "43" }));
        });

        scopedIt("does not subscribe before live updates are set up", async () => {
            objectStreamsEnabled.mockReturnValue(false);
            props.subscribe = true;

            const { subscribe } = await mountWithSubscribe();

            expect(subscribe).not.toHaveBeenCalled();
        });

        scopedIt("does not subscribe a view that does not ask to", async () => {
            objectStreamsEnabled.mockReturnValue(true);

            const { subscribe } = await mountWithSubscribe();

            expect(subscribe).not.toHaveBeenCalled();
        });

        scopedIt("shows a pushed change in the form values", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            const { subscribe, flushPromises } = await mountWithSubscribe();
            expect(formInitialValue).toEqual({ id: "42", name: "Fetched" });

            subscribe.mock.calls[0][0].callback({ id: "42", name: "Pushed" }, "update");
            await flushPromises();

            expect(formInitialValue).toEqual({ id: "42", name: "Pushed" });
        });

        scopedIt("keeps the last values on screen when the record is deleted", async () => {
            objectStreamsEnabled.mockReturnValue(true);
            props.subscribe = true;
            const { subscribe, flushPromises } = await mountWithSubscribe();

            subscribe.mock.calls[0][0].callback({}, "delete");
            await flushPromises();

            expect(formInitialValue).toEqual({ id: "42", name: "Fetched" });
        });
    });

    describe("Change notice in an update view", () => {
        async function mountUpdateView() {
            const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");
            const { default: flushPromises } = await import("flush-promises");
            const retrieve = vi.fn(async ({ pk }) => ({ id: pk, name: "Fetched", available_actions: ["update"] }));
            const subscribe = vi.fn(() => Object.assign(Promise.resolve(), { cancel: vi.fn(async () => {}) }));
            useObject.mockImplementationOnce((options) =>
                realUseObject({ ...options, handlers: { retrieve, subscribe } }),
            );
            objectStreamsEnabled.mockReturnValue(true);
            props.viewName = "update";
            props.noticeChanges = true;
            const detail = await withSetup(() => useDetailView(props, formInitialValue));
            await flushPromises();
            const push = async (data, action = "update") => {
                subscribe.mock.calls.at(-1)[0].callback(data, action);
                await flushPromises();
            };
            return { detail, subscribe, push };
        }

        scopedIt("subscribes through the object subscription", async () => {
            const { subscribe } = await mountUpdateView();

            expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ pk: "42" }));
        });

        scopedIt("keeps the form values and reports a change that someone else saves", async () => {
            const { detail, push } = await mountUpdateView();
            expect(detail.changeNotice.changed).toBe(false);

            await push({ id: "42", name: "Saved elsewhere", available_actions: ["update"] });

            expect(formInitialValue).toEqual({ id: "42", name: "Fetched" });
            expect(detail.changeNotice.changed).toBe(true);
        });

        scopedIt("ignores a change to the record's actions alone", async () => {
            const { detail, push } = await mountUpdateView();

            await push({ id: "42", name: "Fetched", available_actions: ["update", "delete"] });

            expect(detail.changeNotice.changed).toBe(false);
        });

        scopedIt("loads the saved record into the form on reload, without a fetch", async () => {
            const { detail, push } = await mountUpdateView();
            await push({ id: "42", name: "Saved elsewhere", available_actions: ["update"] });

            detail.changeNotice.reload();
            await nextTick();

            expect(formInitialValue).toEqual({ id: "42", name: "Saved elsewhere" });
            expect(detail.changeNotice.changed).toBe(false);
        });

        scopedIt("keeps the form when a pushed change no longer allows editing", async () => {
            const { detail, push } = await mountUpdateView();

            await push({ id: "42", name: "Locked", available_actions: [] });

            expect(detail.instance.currentActionAvailable).toBe(true);
            expect(detail.changeNotice.changed).toBe(true);

            detail.changeNotice.reload();
            await nextTick();
            expect(detail.instance.currentActionAvailable).toBe(false);
        });

        scopedIt("reports a deleted record and keeps the form values", async () => {
            const { detail, push } = await mountUpdateView();

            await push({}, "delete");

            expect(detail.changeNotice.deleted).toBe(true);
            expect(detail.changeNotice.changed).toBe(false);
            expect(formInitialValue).toEqual({ id: "42", name: "Fetched" });
        });
    });

    describe("return shape", () => {
        scopedIt("returns modelConfig, instanceObject, instance group, and actions group", async () => {
            const result = await withSetup(() => useDetailView(props, formInitialValue));

            expect(result).toHaveProperty("modelConfig");
            expect(result).toHaveProperty("instanceObject");
            expect(result).toHaveProperty("instance");
            expect(result).toHaveProperty("actions");
        });

        scopedIt("instance group contains expected keys", async () => {
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));

            expect(instance).not.toHaveProperty("instanceObject");
            expect(instance).toHaveProperty("validAndActive");
            expect(instance).toHaveProperty("titleStr");
            expect(instance).toHaveProperty("pageLoading");
            expect(instance).toHaveProperty("formId");
            expect(instance).toHaveProperty("combinedError");
            expect(instance).toHaveProperty("combinedErrored");
            expect(instance).toHaveProperty("combinedWhileText");
            expect(instance).toHaveProperty("combinedFormProps");
            expect(instance).toHaveProperty("currentActionAvailable");
            expect(instance).toHaveProperty("recordName");
            expect(instance).toHaveProperty("recordNamePending");
        });

        scopedIt("actions group contains expected keys", async () => {
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));

            expect(actions).toHaveProperty("nonDetailActions");
            expect(actions).toHaveProperty("detailActions");
            expect(actions).toHaveProperty("availableTransitions");
            expect(actions).toHaveProperty("primaryActions");
        });
    });

    describe("validAndActive", () => {
        scopedIt("is true when active, all required props present, and model config loaded", async () => {
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.validAndActive).toBe(true);
        });

        scopedIt("is false when isActive is false", async () => {
            useIsActive.mockReturnValue(ref(false));
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.validAndActive).toBe(false);
        });

        scopedIt("is false when pk is missing", async () => {
            props.pk = "";
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.validAndActive).toBe(false);
        });

        scopedIt("is false when model config is still loading", async () => {
            mockModelConfig.loading = true;
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.validAndActive).toBe(false);
        });

        scopedIt("is false when model config has no fetchFields", async () => {
            mockModelConfig.config.fetchFields = undefined;
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.validAndActive).toBe(false);
        });
    });

    describe("titleStr", () => {
        scopedIt("combines capitalized viewName with model verbose name", async () => {
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.titleStr).toBe("Read Widget");
        });

        scopedIt("uses update viewName correctly", async () => {
            props.viewName = "update";
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.titleStr).toBe("Update Widget");
        });

        scopedIt("is empty until the model verbose name is known", async () => {
            mockModelConfig.config.verboseName = "";
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.titleStr).toBe("");

            mockModelConfig.config.verboseName = "widget";
            await nextTick();
            expect(instance.titleStr).toBe("Read Widget");
        });
    });

    describe("formId", () => {
        scopedIt("is built from app, model, pk, and viewName", async () => {
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.formId).toBe("testApp-testModel-42-read");
        });

        scopedIt("updates reactively when pk changes", async () => {
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            props.pk = "99";
            await nextTick();
            expect(instance.formId).toBe("testApp-testModel-99-read");
        });
    });

    describe("error combination", () => {
        scopedIt("combinedErrored is false when no errors are present", async () => {
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.combinedErrored).toBe(false);
            expect(instance.combinedError).toBeFalsy();
        });

        scopedIt("surfaces model config error", async () => {
            const err = new Error("config error");
            mockModelConfig.error = err;
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.combinedError).toBe(err);
            expect(instance.combinedErrored).toBe(true);
            expect(instance.combinedWhileText).toBe("getting model information");
        });

        scopedIt("surfaces instance fetch error", async () => {
            const err = new Error("fetch error");
            mockInstanceObject.state.error = err;
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.combinedError).toBe(err);
            expect(instance.combinedWhileText).toBe("fetching object data");
        });

        scopedIt("surfaces objectForm submit error", async () => {
            const err = new Error("submit error");
            props.objectForm = { state: reactive({ loading: false, submitErrored: false, error: err }) };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.combinedError).toBe(err);
            expect(instance.combinedWhileText).toBe("submitting form");
        });
    });

    describe("combinedFormProps", () => {
        scopedIt("merges model config formProps with explicit formProps override", async () => {
            mockModelConfig.config.formProps = { layout: "stacked" };
            props.formProps = { layout: "inline", dense: true };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.combinedFormProps).toEqual({
                layout: "inline",
                dense: true,
                app: props.app,
                model: props.model,
                view: props.viewName,
            });
        });
    });

    describe("actions", () => {
        scopedIt("nonDetailActions excludes the current view action and detail actions", async () => {
            // viewName is "read", getActionName("read") returns "retrieve"
            // so "retrieve" is excluded as the current-view action; "destroy" is detail-level
            mockModelConfig.config.actionDetails = {
                create: { detail: false },
                retrieve: { detail: false },
                destroy: { detail: true },
            };
            mockFilteredActions.actions = ["create", "retrieve", "destroy"];
            mockInstanceObject.state.object = {
                id: "42",
                available_actions: ["retrieve", "destroy"],
            };
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.nonDetailActions).toContain("create");
            expect(actions.nonDetailActions).not.toContain("retrieve");
            expect(actions.nonDetailActions).not.toContain("destroy");
        });

        scopedIt("nonDetailActions includes model-level create on an update view", async () => {
            // The server never lists `create` in an object's available_actions; the update
            // view still offers it so a user can start the next record from the page title.
            props.viewName = "update";
            mockModelConfig.config.actionDetails = {
                list: { detail: false },
                create: { detail: false },
                update: { detail: true },
            };
            mockFilteredActions.actions = ["list", "create", "update"];
            mockInstanceObject.state.object = {
                id: "42",
                available_actions: ["list", "update"],
            };
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.nonDetailActions).toEqual(["list", "create"]);
        });

        scopedIt("detailActions excludes the current view and non-detail actions", async () => {
            mockModelConfig.config.actionDetails = {
                create: { detail: false },
                delete: { detail: true },
            };
            mockFilteredActions.actions = ["create", "delete"];
            mockInstanceObject.state.object = {
                id: "42",
                available_actions: ["create", "delete"],
            };
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.detailActions).toContain("delete");
            expect(actions.detailActions).not.toContain("create");
        });

        scopedIt("availableTransitions maps transition codes from the object's valid_transitions", async () => {
            mockInstanceObject.state.object.valid_transitions = [{ code: "approve" }, { code: "reject" }];
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.availableTransitions).toEqual(["approve", "reject"]);
        });

        scopedIt("availableTransitions is undefined when valid_transitions is undefined", async () => {
            mockInstanceObject.state.object.valid_transitions = undefined;
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.availableTransitions).toBeUndefined();
        });
    });

    describe("currentActionAvailable", () => {
        scopedIt(
            "is true while the object is loading, then false once the loaded object excludes the current view's action",
            async () => {
                props.viewName = "update";
                mockInstanceObject.state.object = null;
                const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
                expect(instance.currentActionAvailable).toBe(true);
                mockInstanceObject.state.object = { id: "42", available_actions: ["retrieve"] };
                await nextTick();
                expect(instance.currentActionAvailable).toBe(false);
            },
        );

        scopedIt("is true when the loaded object has no available_actions field", async () => {
            mockInstanceObject.state.object = { id: "42" };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.currentActionAvailable).toBe(true);
        });

        scopedIt("is true when the object's available_actions includes the current view's action", async () => {
            props.viewName = "update";
            mockInstanceObject.state.object = { id: "42", available_actions: ["retrieve", "update"] };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.currentActionAvailable).toBe(true);
        });

        scopedIt("maps the 'read' viewName to the 'retrieve' action name", async () => {
            props.viewName = "read";
            mockInstanceObject.state.object = { id: "42", available_actions: ["retrieve"] };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.currentActionAvailable).toBe(true);
        });

        scopedIt("updates reactively when fresh object data changes available_actions", async () => {
            props.viewName = "update";
            mockInstanceObject.state.object = { id: "42", available_actions: ["retrieve", "update"] };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.currentActionAvailable).toBe(true);
            mockInstanceObject.state.object = { id: "42", available_actions: ["retrieve"] };
            await nextTick();
            expect(instance.currentActionAvailable).toBe(false);
        });
    });

    describe("record name", () => {
        scopedIt("requests formatted_name when the model info declares it and fetchFields leaves it out", async () => {
            mockModelConfig.info.fields = { name: {}, formatted_name: { hidden: true } };
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            expect(objectProps.params[FIELDS_PARAM]).toContain("formatted_name");
        });

        scopedIt("requests formatted_name once when fetchFields already names it", async () => {
            mockModelConfig.info.fields = { name: {}, formatted_name: {} };
            mockModelConfig.config.fetchFields = ["id", "name", "formatted_name"];
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            const requested = objectProps.params[FIELDS_PARAM].flat();
            expect(requested.filter((field) => field === "formatted_name")).toHaveLength(1);
        });

        scopedIt("does not request formatted_name when the model info does not declare it", async () => {
            mockModelConfig.info.fields = { name: {} };
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            expect(objectProps.params[FIELDS_PARAM].flat()).not.toContain("formatted_name");
        });

        scopedIt("keeps a formatted_name fetched only for the heading out of the form values", async () => {
            mockModelConfig.info.fields = { name: {}, formatted_name: { hidden: true } };
            mockInstanceObject.state.object = { id: "42", name: "Test Widget", formatted_name: "Widget 42" };
            await withSetup(() => useDetailView(props, formInitialValue));
            expect(formInitialValue).toEqual({ id: "42", name: "Test Widget" });
        });

        scopedIt("keeps formatted_name in the form values when fetchFields names it", async () => {
            mockModelConfig.info.fields = { name: {}, formatted_name: {} };
            mockModelConfig.config.fetchFields = ["id", "name", "formatted_name"];
            mockInstanceObject.state.object = { id: "42", name: "Test Widget", formatted_name: "Widget 42" };
            await withSetup(() => useDetailView(props, formInitialValue));
            expect(formInitialValue).toEqual({ id: "42", name: "Test Widget", formatted_name: "Widget 42" });
        });

        scopedIt("names the record from the fetched object's formatted_name", async () => {
            mockModelConfig.info.fields = { formatted_name: { hidden: true } };
            mockInstanceObject.state.object = { id: "42", formatted_name: "Widget 42" };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.recordName).toBe("Widget 42");
            expect(instance.recordNamePending).toBe(false);
        });

        scopedIt("is pending while the object loads", async () => {
            mockModelConfig.info.fields = { formatted_name: { hidden: true } };
            mockInstanceObject.state.object = null;
            mockInstanceObject.state.loading = true;
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.recordName).toBe("");
            expect(instance.recordNamePending).toBe(true);
        });

        scopedIt("is empty and not pending when the loaded name is blank", async () => {
            mockModelConfig.info.fields = { formatted_name: { hidden: true } };
            mockInstanceObject.state.object = { id: "42", formatted_name: null };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.recordName).toBe("");
            expect(instance.recordNamePending).toBe(false);
        });

        scopedIt("is never pending for a model without a formatted name", async () => {
            mockModelConfig.info.fields = { name: {} };
            mockInstanceObject.state.object = null;
            mockInstanceObject.state.loading = true;
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.recordNamePending).toBe(false);
        });
    });

    describe("useObject setup", () => {
        scopedIt("calls useObject with correct target, pk, and pkKey", async () => {
            await withSetup(() => useDetailView(props, formInitialValue));
            expect(useObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    props: expect.objectContaining({
                        target: expect.objectContaining({
                            app: expect.any(String),
                            model: expect.any(String),
                        }),
                        pk: expect.any(String),
                    }),
                }),
            );
        });

        scopedIt("retrieves the record by the model's lookup field and requests both key fields", async () => {
            mockModelConfig.info.lookupField = "invoice_sage_id";
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            expect(objectProps.pkKey).toBe("invoice_sage_id");
            expect(objectProps.params[FIELDS_PARAM].flat()).toEqual(expect.arrayContaining(["id", "invoice_sage_id"]));
        });

        scopedIt("pkKey falls back to 'id' when modelConfig.info.pk is missing", async () => {
            delete mockModelConfig.info.pk;
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            expect(objectProps.pkKey).toBe("id");
        });

        scopedIt("requests valid_transitions when the model info declares it as hidden", async () => {
            mockModelConfig.info.fields = { valid_transitions: { hidden: true } };
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            expect(objectProps.params[FIELDS_PARAM]).toContain("valid_transitions");
        });

        scopedIt("omits valid_transitions when the model info does not declare the field", async () => {
            mockModelConfig.info.fields = { name: {} };
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            expect(objectProps.params[FIELDS_PARAM]).not.toContain("valid_transitions");
        });
    });
});
