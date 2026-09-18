import { useObject } from "@arrai-innovations/reactive-helpers";
import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, nextTick, reactive, ref } from "vue";

vi.mock("@vueda/use/useDetailView.js", async () => {
    const actual = await vi.importActual("@vueda/use/useDetailView.js");
    return { ...actual, useDetailView: vi.fn() };
});
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useObject: vi.fn() };
});
vi.mock("@vueda/use/useForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useForm.js");
    return { ...actual, useForm: vi.fn() };
});
vi.mock("@vueda/use/useObjectForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObjectForm.js");
    return { ...actual, useObjectForm: vi.fn() };
});

// The composables below are only exercised by the "real composition" describe block further down,
// which drives the actual useDetailView.js (rather than the useDetailView mock above) to prove
// useViewUpdate.js's own wiring — its two separate object instances — surfaces a submission failure.
// Every other test in this file mocks useDetailView wholesale, so these never get called for them.
vi.mock("@vueda/use/useLeaveUnload.js", () => ({ useLeaveUnload: vi.fn() }));
vi.mock("vue-router", async () => ({ ...(await vi.importActual("vue-router")), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@arrai-innovations/vue-sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), message: vi.fn() },
}));
vi.mock("@vueda/use/useModelConfig.js", async () => {
    const actual = await vi.importActual("@vueda/use/useModelConfig.js");
    return { ...actual, useModelConfig: vi.fn() };
});
vi.mock("@vueda/use/useIsActive.js", async () => {
    const actual = await vi.importActual("@vueda/use/useIsActive.js");
    return { ...actual, useIsActive: vi.fn() };
});
vi.mock("@vueda/use/useFilteredActions.js", async () => {
    const actual = await vi.importActual("@vueda/use/useFilteredActions.js");
    return { ...actual, useFilteredActions: vi.fn() };
});
vi.mock("@vueda/use/useObject404.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObject404.js");
    return { ...actual, useObject404: vi.fn() };
});

// Stubs for mounting the real ErrorDisplay.vue (visible-feedback assertions below): the component
// itself and formatError() run for real, only their own presentational dependencies are stubbed.
const ErrorDisplayAlertStub = defineComponent({
    name: "ErrorDisplayAlertStub",
    props: ["variant"],
    setup(props, { slots }) {
        return () => h("div", { "data-qa": "error-display-alert", "data-variant": props.variant }, slots.default?.());
    },
});
const ErrorDisplayAlertDescriptionStub = defineComponent({
    name: "ErrorDisplayAlertDescriptionStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "error-display-alert-description" }, slots.default?.());
    },
});
const ErrorDisplayAlertCloseStub = defineComponent({
    name: "ErrorDisplayAlertCloseStub",
    setup: () => () => h("button", { "data-qa": "error-display-alert-close" }),
});
vi.mock("@vueda/feedback/alert/Alert.vue", () => ({ default: ErrorDisplayAlertStub }));
vi.mock("@vueda/feedback/alert/AlertDescription.vue", () => ({ default: ErrorDisplayAlertDescriptionStub }));
vi.mock("@vueda/feedback/alert/AlertClose.vue", () => ({ default: ErrorDisplayAlertCloseStub }));
const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "cls" });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));
vi.mock("@sentry/vue", () => ({ captureException: vi.fn() }));

describe("lib/use/useViewUpdate.js", () => {
    let props, mockModelConfig, mockInstanceObject, mockDetailViewInstance, mockDetailViewActions;
    let mockFormContext, mockObjectForm;

    beforeEach(() => {
        props = reactive({
            app: "testApp",
            model: "testModel",
            pk: "42",
            submitFields: undefined,
            redirectAfter: null,
            relatedObjectRules: {},
            calculatedObjectRules: {},
        });

        mockModelConfig = reactive({
            info: { pk: "id" },
            config: {
                fetchFields: ["id", "name"],
                submitFields: ["name"],
                verboseName: "widget",
                expand: [],
                formProps: {},
                actionDetails: {},
                fieldDetails: {},
                fields: ["name"],
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

        mockDetailViewInstance = reactive({
            validAndActive: true,
            titleStr: "Update Widget",
            pageLoading: false,
            formId: "testApp-testModel-42-update",
            computedWidgetProps: {},
            combinedError: null,
            combinedErrored: false,
            combinedWhileText: "",
            combinedFormProps: {},
        });

        mockDetailViewActions = reactive({
            nonDetailActions: [],
            detailActions: [],
            availableTransitions: [],
        });

        mockFormContext = {
            state: reactive({ values: {}, anyModified: false }),
            getFirstErrorField: vi.fn(() => null),
        };

        mockObjectForm = {
            state: reactive({ loading: false, submitErrored: false, error: null }),
            submit: vi.fn(),
        };

        useDetailView.mockReturnValue({
            modelConfig: mockModelConfig,
            instanceObject: mockInstanceObject,
            instance: mockDetailViewInstance,
            actions: mockDetailViewActions,
        });
        useObject.mockReturnValue({
            state: reactive({ object: null, loading: false }),
        });
        useForm.mockReturnValue(mockFormContext);
        useObjectForm.mockReturnValue(mockObjectForm);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("return shape", () => {
        scopedIt("returns all expected keys", () => {
            const result = useViewUpdate(props);
            expect(result).toHaveProperty("formInitialValue");
            expect(result).toHaveProperty("formContext");
            expect(result).toHaveProperty("objectForm");
            expect(result).toHaveProperty("modelConfig");
            expect(result).toHaveProperty("instanceObject");
            expect(result).toHaveProperty("instance");
            expect(result).toHaveProperty("actions");
        });

        scopedIt("formContext is the useForm return value", () => {
            const { formContext } = useViewUpdate(props);
            expect(formContext).toBe(mockFormContext);
        });

        scopedIt("objectForm is the useObjectForm return value", () => {
            const { objectForm } = useViewUpdate(props);
            expect(objectForm).toBe(mockObjectForm);
        });

        scopedIt("modelConfig is passed through from useDetailView", () => {
            const { modelConfig } = useViewUpdate(props);
            expect(modelConfig).toBe(mockModelConfig);
        });

        scopedIt("instance is passed through from useDetailView", () => {
            const { instance } = useViewUpdate(props);
            expect(instance).toBe(mockDetailViewInstance);
        });

        scopedIt("actions is passed through from useDetailView", () => {
            const { actions } = useViewUpdate(props);
            expect(actions).toBe(mockDetailViewActions);
        });
    });

    describe("useDetailView wiring", () => {
        scopedIt("calls useDetailView with viewName 'update'", () => {
            useViewUpdate(props);
            const [internalOptions] = useDetailView.mock.calls[0];
            expect(internalOptions.viewName).toBe("update");
        });

        scopedIt("passes app and model through to useDetailView", () => {
            useViewUpdate(props);
            const [internalOptions] = useDetailView.mock.calls[0];
            expect(internalOptions.app).toBe("testApp");
            expect(internalOptions.model).toBe("testModel");
        });

        scopedIt("passes pk through to useDetailView", () => {
            useViewUpdate(props);
            const [internalOptions] = useDetailView.mock.calls[0];
            expect(internalOptions.pk).toBe("42");
        });

        scopedIt("internalOptions.objectForm is set to objectForm after creation", () => {
            useViewUpdate(props);
            const [internalOptions] = useDetailView.mock.calls[0];
            // reactive() wraps nested objects, so reference identity doesn't hold; check the submit fn
            expect(internalOptions.objectForm).toBeTruthy();
            expect(internalOptions.objectForm.submit).toBe(mockObjectForm.submit);
        });

        scopedIt("passes formContextProps.initialValues as formInitialValue to useDetailView", () => {
            useViewUpdate(props);
            const [, formInitialValue] = useDetailView.mock.calls[0];
            expect(formInitialValue).toBeDefined();
        });
    });

    describe("useObjectForm wiring", () => {
        scopedIt("calls useObjectForm with props, formContext, and instanceObjectForSubmit", () => {
            useViewUpdate(props);
            expect(useObjectForm).toHaveBeenCalledWith(
                expect.objectContaining({
                    props: expect.objectContaining({
                        app: expect.any(String),
                        model: expect.any(String),
                    }),
                    formContext: mockFormContext,
                    instanceObject: expect.objectContaining({ state: expect.any(Object) }),
                }),
            );
        });

        scopedIt("redirectAfter is included in objectFormProps", () => {
            props.redirectAfter = "list";
            useViewUpdate(props);
            const { props: objectFormProps } = useObjectForm.mock.calls[0][0];
            expect(objectFormProps.redirectAfter).toBe("list");
        });

        scopedIt("redirectAfter updates reactively", async () => {
            useViewUpdate(props);
            const { props: objectFormProps } = useObjectForm.mock.calls[0][0];
            expect(objectFormProps.redirectAfter).toBeNull();
            props.redirectAfter = "read";
            await nextTick();
            expect(objectFormProps.redirectAfter).toBe("read");
        });

        scopedIt("verboseName comes from modelConfig", () => {
            useViewUpdate(props);
            const { props: objectFormProps } = useObjectForm.mock.calls[0][0];
            expect(objectFormProps.verboseName).toBe("widget");
        });
    });

    describe("submit-side useObject setup", () => {
        scopedIt("calls useObject with intendToRetrieve: false", () => {
            useViewUpdate(props);
            const objectCall = useObject.mock.calls[0][0];
            expect(objectCall.props.intendToRetrieve).toBe(false);
        });

        scopedIt("FIELDS_PARAM includes pkKey", () => {
            useViewUpdate(props);
            const objectCall = useObject.mock.calls[0][0];
            const fields = objectCall.props.params[FIELDS_PARAM];
            expect(fields).toContain("id");
        });

        scopedIt("FIELDS_PARAM uses submitFields from props when provided", () => {
            props.submitFields = ["name", "status"];
            useViewUpdate(props);
            const objectCall = useObject.mock.calls[0][0];
            const fields = objectCall.props.params[FIELDS_PARAM];
            expect(fields).toContain("name");
            expect(fields).toContain("status");
        });

        scopedIt("FIELDS_PARAM falls back to modelConfig submitFields", () => {
            useViewUpdate(props);
            const objectCall = useObject.mock.calls[0][0];
            const fields = objectCall.props.params[FIELDS_PARAM];
            expect(fields).toContain("name");
        });

        scopedIt("EXPAND_PARAM filters expand fields by non-null form values", () => {
            mockModelConfig.config.expand = ["details", "tags"];
            mockFormContext.state.values = { details: { id: 1 }, tags: null };
            useViewUpdate(props);
            const objectCall = useObject.mock.calls[0][0];
            const expand = objectCall.props.params[EXPAND_PARAM];
            expect(expand).toContain("details");
            expect(expand).not.toContain("tags");
        });
    });

    describe("arrayFields and firstErrorField", () => {
        scopedIt("arrayFields filters fieldDetails by many: true", () => {
            mockModelConfig.config.fieldDetails = {
                tags: { many: true },
                name: { many: false },
            };
            useViewUpdate(props);
            const { props: objectFormProps } = useObjectForm.mock.calls[0][0];
            // firstErrorField is a lazy computed; access it to trigger evaluation
            expect(objectFormProps.firstErrorField).toBeDefined();
            const getFirstErrorFieldCall = mockFormContext.getFirstErrorField.mock.calls[0];
            expect(getFirstErrorFieldCall[1]).toContain("tags");
            expect(getFirstErrorFieldCall[1]).not.toContain("name");
        });

        scopedIt("firstErrorField uses displayFields when available", () => {
            mockModelConfig.config.displayFields = ["status", "name"];
            useViewUpdate(props);
            const { props: objectFormProps } = useObjectForm.mock.calls[0][0];
            expect(objectFormProps.firstErrorField).toBeDefined();
            const getFirstErrorFieldCall = mockFormContext.getFirstErrorField.mock.calls[0];
            expect(getFirstErrorFieldCall[0]).toEqual(["status", "name"]);
        });

        scopedIt("firstErrorField falls back to fields when displayFields is absent", () => {
            delete mockModelConfig.config.displayFields;
            mockModelConfig.config.fields = ["name", "email"];
            useViewUpdate(props);
            const { props: objectFormProps } = useObjectForm.mock.calls[0][0];
            expect(objectFormProps.firstErrorField).toBeDefined();
            const getFirstErrorFieldCall = mockFormContext.getFirstErrorField.mock.calls[0];
            expect(getFirstErrorFieldCall[0]).toEqual(["name", "email"]);
        });
    });

    describe("formInitialValue", () => {
        scopedIt("formInitialValue is the reactive initialValues object passed to useDetailView", () => {
            const { formInitialValue } = useViewUpdate(props);
            const [, detailFormInitialValue] = useDetailView.mock.calls[0];
            expect(formInitialValue).toBe(detailFormInitialValue);
        });
    });

    describe("real composition: submission failure visibility", () => {
        /**
         * Wires the real useViewUpdate() end-to-end: real useDetailView, useObjectForm, useForm, and
         * useObject — called twice, since useViewUpdate.js creates two separate object instances (one
         * for retrieval inside useDetailView, one for submission directly in useViewUpdate.js itself).
         * Only the metadata composables useDetailView.js depends on (useModelConfig, useIsActive,
         * useFilteredActions, useObject404) stay mocked with static return values, reusing the same
         * shapes the "wiring" tests above already use.
         */
        const buildRealViewUpdate = async (update) => {
            setActivePinia(createPinia());
            const { useDetailView: realUseDetailView } = await vi.importActual("@vueda/use/useDetailView.js");
            const { useObjectForm: realUseObjectForm } = await vi.importActual("@vueda/use/useObjectForm.js");
            const { useForm: realUseForm } = await vi.importActual("@vueda/use/useForm.js");
            const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");

            useModelConfig.mockReturnValue(mockModelConfig);
            useIsActive.mockReturnValue(ref(true));
            useFilteredActions.mockReturnValue(reactive({ actions: [] }));
            useObject404.mockReturnValue(undefined);
            useDetailView.mockImplementation(realUseDetailView);
            useObjectForm.mockImplementation(realUseObjectForm);
            useForm.mockImplementation(realUseForm);

            const retrieve = vi.fn().mockResolvedValue({ id: "42", name: "Test Widget" });
            let callCount = 0;
            useObject.mockImplementation((options) => {
                callCount += 1;
                // First call is useDetailView's retrieval instance; the second is useViewUpdate.js's
                // own instanceObjectForSubmit.
                return callCount === 1
                    ? realUseObject({ ...options, handlers: { retrieve } })
                    : realUseObject({ ...options, handlers: { update } });
            });

            return withSetup(() => useViewUpdate(props));
        };

        /**
         * Mounts the real ErrorDisplay.vue with the same three props ViewUpdate.vue binds it to, so a
         * test can assert on rendered, user-visible text instead of only the reactive state behind it.
         */
        const mountErrorDisplay = async (instance) => {
            const { mount } = await import("@vue/test-utils");
            const { default: ErrorDisplay } = await import("@vueda/display/error-display/ErrorDisplay.vue");
            return mount(ErrorDisplay, {
                props: {
                    error: instance.combinedError,
                    errored: instance.combinedErrored,
                    whileText: instance.combinedWhileText,
                    ignoreFormValidationErrors: true,
                },
            });
        };

        scopedIt(
            "surfaces an unhandled update failure (e.g. HTTP 403) through combinedError, without the " +
                "retrieval instance ever holding it",
            async () => {
                const { FetchError } = await import("@vueda/utils/errors.js");
                const { default: flushPromises } = await import("flush-promises");

                // Same failure the server sends for a rejected authorization check: a 403 whose body
                // identifies the refusal, not a form-validation (400) or confirmation-required (409)
                // error.
                const forbidden = new FetchError(
                    "Failed to update object",
                    { status: 403, statusText: "Forbidden" },
                    { detail: "You do not have permission to perform this action." },
                );
                const update = vi.fn(() => Promise.reject(forbidden));

                const result = await buildRealViewUpdate(update);
                await flushPromises();
                expect(result.instance.combinedErrored).toBe(false);

                // No field component is mounted here, so simulate one reporting the "name" field
                // dirty the same way useField.js does, rather than pulling in the full form-rendering
                // stack just to flip anyModified.
                result.formContext.registerIsModifiedHook("name", () => true);
                result.formContext.updateValue("name", "Edited Widget");
                await flushPromises();

                await result.objectForm.submit();
                await flushPromises();

                expect(update).toHaveBeenCalled();
                expect(result.instance.combinedError).toBe(forbidden);
                expect(result.instance.combinedErrored).toBe(true);
                expect(result.instance.combinedWhileText).toBe("submitting form");
                expect(result.objectForm.state.loading).toBe(false);
                expect(result.objectForm.state.submitErrored).toBe(true);
                // Retains the edited value instead of discarding it on a failed save.
                expect(result.formContext.state.values.name).toBe("Edited Widget");
                // The defect this guards against: the failure must not depend on the retrieval
                // instance useViewUpdate.js returns as `instanceObject`.
                expect(result.instanceObject.state.error).toBeNull();

                // Visible feedback: mount the real ErrorDisplay.vue (the component ViewUpdate.vue
                // renders, bound to these same three props) and assert the user-facing text it
                // produces, not just the reactive state that feeds it.
                const errorWrapper = await mountErrorDisplay(result.instance);
                expect(errorWrapper.find('[data-qa="error-display-alert"]').exists()).toBe(true);
                expect(errorWrapper.text()).toContain("There was an error while submitting form.");
                expect(errorWrapper.text()).toContain("You do not have permission to perform this action.");

                // A successful retry clears the failure and follows the normal successful-save
                // behavior.
                update.mockImplementationOnce(() => Promise.resolve({ id: "42", name: "Edited Widget" }));
                await result.objectForm.submit();
                await flushPromises();

                expect(result.instance.combinedError).toBeNull();
                expect(result.instance.combinedErrored).toBe(false);
                expect(result.objectForm.state.submitErrored).toBe(false);
            },
        );

        scopedIt(
            "surfaces an unhandled server failure (HTTP 500) through combinedError, same as a permission " + "refusal",
            async () => {
                const { FetchError } = await import("@vueda/utils/errors.js");
                const { default: flushPromises } = await import("flush-promises");

                // A server-side crash: no `detail` (nothing about the request was rejected on purpose),
                // only a stack trace the server includes for diagnostics. Exercises formatError's
                // `responseData.serverStack` branch, distinct from the 403 test's `detail` branch.
                const serverFailure = new FetchError(
                    "Failed to update object",
                    { status: 500, statusText: "Internal Server Error" },
                    { serverStack: "Traceback (most recent call last):\n  ZeroDivisionError" },
                );
                const update = vi.fn(() => Promise.reject(serverFailure));

                const result = await buildRealViewUpdate(update);
                await flushPromises();

                result.formContext.registerIsModifiedHook("name", () => true);
                result.formContext.updateValue("name", "Edited Widget");
                await flushPromises();

                await result.objectForm.submit();
                await flushPromises();

                expect(update).toHaveBeenCalled();
                expect(result.instance.combinedError).toBe(serverFailure);
                expect(result.instance.combinedErrored).toBe(true);
                expect(result.objectForm.state.loading).toBe(false);
                expect(result.formContext.state.values.name).toBe("Edited Widget");
                expect(result.instanceObject.state.error).toBeNull();

                const errorWrapper = await mountErrorDisplay(result.instance);
                expect(errorWrapper.find('[data-qa="error-display-alert"]').exists()).toBe(true);
                expect(errorWrapper.text()).toContain("500: Internal Server Error");
                expect(errorWrapper.text()).toContain("ZeroDivisionError");
            },
        );

        scopedIt(
            "surfaces an unhandled network failure (no response at all) through combinedError, same as an " +
                "HTTP failure",
            async () => {
                const { default: flushPromises } = await import("flush-promises");

                // What fetch() itself rejects with when the network drops: no `.response`/`.responseData`
                // at all, so it is not a FetchError and is not recognized by any error-shape-specific
                // handling (field validation, confirmation). It must still reach the visible error.
                const networkFailure = new TypeError("Failed to fetch");
                const update = vi.fn(() => Promise.reject(networkFailure));

                const result = await buildRealViewUpdate(update);
                await flushPromises();

                result.formContext.registerIsModifiedHook("name", () => true);
                result.formContext.updateValue("name", "Edited Widget");
                await flushPromises();

                await result.objectForm.submit();
                await flushPromises();

                expect(update).toHaveBeenCalled();
                expect(result.instance.combinedError).toBe(networkFailure);
                expect(result.instance.combinedErrored).toBe(true);
                expect(result.objectForm.state.loading).toBe(false);
                expect(result.instanceObject.state.error).toBeNull();

                const errorWrapper = await mountErrorDisplay(result.instance);
                expect(errorWrapper.find('[data-qa="error-display-alert"]').exists()).toBe(true);
                expect(errorWrapper.text()).toContain("Failed to fetch");
            },
        );
    });
});
