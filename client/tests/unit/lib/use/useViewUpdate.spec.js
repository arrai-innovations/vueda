import { useObject } from "@arrai-innovations/reactive-helpers";
import { scopedIt } from "@tests/unit/utils.js";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useForm } from "@vueda/use/useForm.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { useWarnings } from "@vueda/use/useWarnings.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { nextTick, reactive } from "vue";

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
vi.mock("@vueda/use/useWarnings.js", async () => {
    const actual = await vi.importActual("@vueda/use/useWarnings.js");
    return { ...actual, useWarnings: vi.fn() };
});

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
        useWarnings.mockReturnValue(undefined);
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

    describe("useWarnings", () => {
        scopedIt("calls useWarnings with app, model, formContext, 'update', pk, and objectForm state", () => {
            useViewUpdate(props);
            expect(useWarnings).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                mockFormContext,
                "update",
                expect.anything(),
                mockObjectForm.state,
            );
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
});
