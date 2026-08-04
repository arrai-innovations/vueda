import { useObject } from "@arrai-innovations/reactive-helpers";
import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useObjectsWorkflowTransitions } from "@vueda/use/useObjectsWorkflowTransitions.js";
import { nextTick, reactive, ref } from "vue";

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
vi.mock("@vueda/use/useObjectsWorkflowTransitions.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObjectsWorkflowTransitions.js");
    return { ...actual, useObjectsWorkflowTransitions: vi.fn() };
});
vi.mock("@vueda/use/useObject404.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObject404.js");
    return { ...actual, useObject404: vi.fn() };
});

describe("lib/use/useDetailView.js", () => {
    let props, formInitialValue, mockModelConfig, mockInstanceObject, mockFilteredActions, mockTransitions;

    beforeEach(() => {
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
            info: { pk: "id", verbose_name: "widget" },
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
        };

        mockFilteredActions = reactive({ actions: [] });
        mockTransitions = reactive({ transitions: [] });

        useModelConfig.mockReturnValue(mockModelConfig);
        useObject.mockReturnValue(mockInstanceObject);
        useIsActive.mockReturnValue(ref(true));
        useFilteredActions.mockReturnValue(mockFilteredActions);
        useObjectsWorkflowTransitions.mockReturnValue(mockTransitions);
        useObject404.mockReturnValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
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
            expect(instance).toHaveProperty("computedWidgetProps");
            expect(instance).toHaveProperty("combinedError");
            expect(instance).toHaveProperty("combinedErrored");
            expect(instance).toHaveProperty("combinedWhileText");
            expect(instance).toHaveProperty("combinedFormProps");
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
            expect(instance.combinedFormProps).toEqual({ layout: "inline", dense: true });
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
                available_actions: ["create", "retrieve", "destroy"],
            };
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.nonDetailActions).toContain("create");
            expect(actions.nonDetailActions).not.toContain("retrieve");
            expect(actions.nonDetailActions).not.toContain("destroy");
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

        scopedIt("availableTransitions maps transition codes from objectTransitions", async () => {
            mockTransitions.transitions = [{ code: "approve" }, { code: "reject" }];
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.availableTransitions).toEqual(["approve", "reject"]);
        });

        scopedIt("availableTransitions is undefined when transitions is undefined", async () => {
            mockTransitions.transitions = undefined;
            const { actions } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(actions.availableTransitions).toBeUndefined();
        });
    });

    describe("computedWidgetProps", () => {
        scopedIt("merges widgetProps with calculatedObject from instance state", async () => {
            props.widgetProps = { size: "sm" };
            mockInstanceObject.state.calculatedObject = { extra: "data" };
            const { instance } = await withSetup(() => useDetailView(props, formInitialValue));
            expect(instance.computedWidgetProps).toEqual({ size: "sm", extra: "data" });
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

        scopedIt("pkKey falls back to 'id' when modelConfig.info.pk is missing", async () => {
            delete mockModelConfig.info.pk;
            await withSetup(() => useDetailView(props, formInitialValue));
            const objectProps = useObject.mock.calls[0][0].props;
            expect(objectProps.pkKey).toBe("id");
        });
    });
});
