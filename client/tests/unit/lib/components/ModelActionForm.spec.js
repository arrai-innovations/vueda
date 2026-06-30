import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { ConfirmationRequiredError, FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h } from "vue";

const ActionFormStub = defineComponent({
    name: "ActionFormStub",
    props: ["fetchState", "runAction", "redirectTo", "actionSuccessSummary", "actionErrorSummary", "readyToDryRun"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "action-form-stub",
                    "data-success": props.actionSuccessSummary,
                    "data-error": props.actionErrorSummary,
                },
                [
                    slots["action-form-inner"]
                        ? slots["action-form-inner"]({ combinedLoading: props.fetchState?.loading ?? false })
                        : null,
                    h(
                        "div",
                        { "data-qa": "action-form-stub-confirm-slot" },
                        slots["confirm-button"]
                            ? slots["confirm-button"]({
                                  label: "Yes, continue",
                                  loading: props.fetchState?.loading ?? false,
                                  verb: "confirm",
                                  type: "submit",
                                  disabled: false,
                              })
                            : null,
                    ),
                    slots.default ? slots.default() : null,
                ],
            );
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["type", "disabled", "tone", "emphasis"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "button",
                {
                    type: props.type,
                    disabled: props.disabled || undefined,
                    "data-qa": "button-stub",
                    "data-tone": props.tone,
                    "data-emphasis": props.emphasis,
                    ...attrs,
                },
                slots.default ? slots.default() : null,
            );
    },
});

const LoadingSpinnerInlineStub = defineComponent({
    name: "LoadingSpinnerInlineStub",
    setup() {
        return () => h("span", { "data-qa": "spinner-inline" });
    },
});

const FormFieldStub = defineComponent({
    name: "FormFieldStub",
    props: ["fieldValue", "label", "name", "readOnly"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-field" }, slots.default ? slots.default() : null);
    },
});

const WidgetReadOnlyStub = defineComponent({
    name: "WidgetReadOnlyStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "widget-read-only" }, slots.default ? slots.default() : null);
    },
});

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "theme" });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

const modelConfig = {
    info: { verboseName: "Person", verboseNamePlural: "People" },
    config: { actionRedirects: { default: "detail" } },
};
const mockedUseModelConfig = vi.fn(() => modelConfig);
vi.mock("@vueda/use/useModelConfig", () => ({ useModelConfig: mockedUseModelConfig }));

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("vue-sonner", () => ({ toast: toastMock }));

let routeQuery = {};
const routerPush = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ query: routeQuery }),
}));

const getListUrl = vi.fn(({ action }) => `/list-url/${action || ""}`);
const getDetailUrl = vi.fn(({ pk, action }) => `/detail-url/${pk}/${action || ""}`);
vi.mock("@vueda/utils/urls.js", () => ({ getListUrl, getDetailUrl }));

const getCSRFValue = vi.fn(() => "token");
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue }));

const fetchHelper = vi.fn((url, options, message, errorResolver) => {
    if (fetchHelper.shouldReject) {
        const response = fetchHelper.response || new Response(null, { status: 500 });
        const data = fetchHelper.responseData;
        const error = errorResolver(message, response, data);
        return Promise.reject(error);
    }
    return Promise.resolve(fetchHelper.responseData);
});
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));

vi.mock("@vueda/components/ActionForm.vue", () => ({ default: ActionFormStub }));
vi.mock("@vueda/components/LoadingSpinnerInline.vue", () => ({ default: LoadingSpinnerInlineStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/fields/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetReadOnly.vue", () => ({ default: WidgetReadOnlyStub }));

let ModelActionForm, vue;

function createFetchState(overrides = {}) {
    const objectsInOrder = overrides.objectsInOrder ?? [{ id: 1 }, { id: 2 }];
    const objectsMap = overrides.objectsMap ?? new Map(objectsInOrder.map((obj) => [String(obj.id ?? obj), obj]));
    return {
        errored: false,
        error: null,
        loading: false,
        objectsInOrder,
        objectsMap,
        ...overrides,
    };
}

function mountModelActionForm(options = {}) {
    const formContext = {
        state: vue.reactive({ submittingValues: { foo: "bar" } }),
    };
    const wrapper = mount(ModelActionForm, {
        props: {
            app: "app",
            model: "person",
            action: "activate",
            fetchState: createFetchState(options.fetchState),
            actionVerboseName: options.actionVerboseName,
            actionSuccessSummary: options.actionSuccessSummary,
            actionErrorSummary: options.actionErrorSummary,
            transformSubmitDataFn: options.transformSubmitDataFn,
            requestMethod: options.requestMethod,
            enableDryRun: options.enableDryRun,
            confirmText: options.confirmText,
        },
        slots: options.slots,
        global: {
            provide: { [FormContextSymbol]: formContext },
        },
    });
    return { wrapper, formContext };
}

describe("lib/components/ModelActionForm.vue", () => {
    beforeEach(async () => {
        vue = await import("vue");
        ModelActionForm = (await import("@vueda/components/ModelActionForm.vue")).default;
        mockedUseModelConfig.mockClear();
        mockedUseTheme.mockClear();
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        getListUrl.mockClear();
        getDetailUrl.mockClear();
        getCSRFValue.mockClear();
        fetchHelper.mockClear();
        fetchHelper.shouldReject = false;
        fetchHelper.responseData = undefined;
        fetchHelper.response = undefined;
        routeQuery = {};
        modelConfig.info = { verboseName: "Person", verboseNamePlural: "People" };
        modelConfig.config = { actionRedirects: { default: "detail" } };
    });

    describe("Rendering", () => {
        scopedIt("renders selected objects and confirm message", () => {
            const { wrapper } = mountModelActionForm();
            const items = wrapper.findAll('[data-qa="action-form-list-item"]');
            expect(items).toHaveLength(2);
            const message = wrapper.get('[data-qa="action-form-message"]').text();
            expect(message).toContain("Are you sure you want to activate the selected People?");
            expect(mockedUseTheme).toHaveBeenCalledWith("ModelActionForm", expect.any(Object));
        });

        scopedIt("tags the selected-objects container with neutral tone and renders pk chips", () => {
            const { wrapper } = mountModelActionForm();
            const container = wrapper.get('[data-qa="action-form-selected-objects"]');
            expect(container.attributes("data-tone")).toBe("neutral");
            const pkChips = wrapper.findAll('[data-qa="action-form-list-item-pk"]');
            expect(pkChips).toHaveLength(2);
            expect(pkChips[0].text()).toBe("1");
            expect(pkChips[1].text()).toBe("2");
        });

        scopedIt("shows loading placeholder when fetchState.loading", () => {
            const { wrapper } = mountModelActionForm({ fetchState: { loading: true, objectsInOrder: [{ id: 1 }] } });
            expect(wrapper.findAll('[data-qa="action-form-list-item"]').length).toBe(0);
            expect(wrapper.text()).toContain("Loading objects...");
        });

        scopedIt("custom slots override defaults", () => {
            const { wrapper } = mountModelActionForm({
                slots: {
                    "selected-objects": '<div data-qa="custom-selected">x</div>',
                    "confirm-message": '<p data-qa="custom-message">hello</p>',
                    "link-item": '<span data-qa="custom-link">L</span>',
                },
            });
            expect(wrapper.find('[data-qa="custom-selected"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="action-form-list-item"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="custom-message"]').exists()).toBe(true);
        });
    });

    describe("Computed summaries", () => {
        scopedIt("provides default summaries to ActionForm", () => {
            const { wrapper } = mountModelActionForm();
            const stub = wrapper.getComponent(ActionFormStub);
            expect(stub.props("actionSuccessSummary")).toBe("Activate People Successful");
            expect(stub.props("actionErrorSummary")).toBe("Failed to activate person ");
        });

        scopedIt("uses prop summaries when provided", () => {
            const { wrapper } = mountModelActionForm({
                actionSuccessSummary: "Great job",
                actionErrorSummary: "Uh oh",
            });
            const stub = wrapper.getComponent(ActionFormStub);
            expect(stub.props("actionSuccessSummary")).toBe("Great job");
            expect(stub.props("actionErrorSummary")).toBe("Uh oh");
        });

        scopedIt("actionVerboseName influences confirm copy", () => {
            const { wrapper } = mountModelActionForm({ actionVerboseName: "Deactivate" });
            expect(wrapper.text()).toContain("Deactivate the selected People");
        });
    });

    describe("Dry run readiness", () => {
        scopedIt("enables dry run when required props and primary keys are ready", () => {
            const { wrapper } = mountModelActionForm();
            const stub = wrapper.getComponent(ActionFormStub);
            expect(stub.props("readyToDryRun")).toBe(true);
        });

        scopedIt("disables dry run when enableDryRun is false", () => {
            const { wrapper } = mountModelActionForm({ enableDryRun: false });
            const stub = wrapper.getComponent(ActionFormStub);
            expect(stub.props("readyToDryRun")).toBe(false);
        });
    });

    describe("defaultRunAction", () => {
        scopedIt("constructs bulk destroy request", async () => {
            fetchHelper.responseData = { ok: true };
            const { wrapper } = mountModelActionForm({
                fetchState: { objectsInOrder: [{ id: 1 }, { id: 2 }] },
                requestMethod: "PATCH",
            });
            const runAction = wrapper.getComponent(ActionFormStub).props("runAction");
            await runAction({});
            expect(getListUrl).toHaveBeenCalledWith({ app: "app", model: "person", action: "activate" });
            expect(fetchHelper).toHaveBeenCalledWith(
                "/list-url/activate",
                expect.objectContaining({ method: "PATCH" }),
                "Failed to execute action",
                expect.any(Function),
            );
            const body = JSON.parse(fetchHelper.mock.calls[0][1].body);
            expect(body.pks).toEqual([1, 2]);
        });

        scopedIt("constructs detail request for single object", async () => {
            fetchHelper.responseData = { ok: true };
            const { wrapper } = mountModelActionForm({
                fetchState: { objectsInOrder: [{ id: 5 }] },
                requestMethod: "POST",
            });
            const runAction = wrapper.getComponent(ActionFormStub).props("runAction");
            await runAction({});
            expect(getDetailUrl).toHaveBeenCalledWith({ app: "app", model: "person", pk: 5, action: "activate" });
            const opts = fetchHelper.mock.calls[0][1];
            expect(opts.method).toBe("POST");
            expect(opts.body).toBeUndefined();
        });

        scopedIt("includes transformed submit data", async () => {
            fetchHelper.responseData = { ok: true };
            const transformSubmitDataFn = vi.fn(() => ({ custom: true }));
            const { wrapper } = mountModelActionForm({
                fetchState: { objectsInOrder: [{ id: 9 }, { id: 10 }] },
                transformSubmitDataFn,
            });
            const runAction = wrapper.getComponent(ActionFormStub).props("runAction");
            await runAction({});
            const body = JSON.parse(fetchHelper.mock.calls[0][1].body);
            expect(body).toEqual({ pks: [9, 10], custom: true });
            expect(transformSubmitDataFn).toHaveBeenCalled();
        });

        scopedIt("returns FormValidationError for 400 responses", async () => {
            fetchHelper.shouldReject = true;
            fetchHelper.response = new Response(JSON.stringify({ field: ["bad"] }), { status: 400 });
            fetchHelper.responseData = { field: ["bad"] };
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 9 }] } });
            const runAction = wrapper.getComponent(ActionFormStub).props("runAction");
            await expect(runAction({})).rejects.toBeInstanceOf(FormValidationError);
        });

        scopedIt("returns ConfirmationRequiredError for 409 responses", async () => {
            fetchHelper.shouldReject = true;
            const responseData = { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } };
            fetchHelper.response = new Response(JSON.stringify(responseData), { status: 409 });
            fetchHelper.responseData = responseData;
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 9 }] } });
            const runAction = wrapper.getComponent(ActionFormStub).props("runAction");
            const error = await runAction({}).catch((e) => e);
            expect(error).toBeInstanceOf(ConfirmationRequiredError);
            expect(error.digest).toBe("d1");
            expect(error.messages).toEqual({ count: ["unusual"] });
        });

        scopedIt("returns FetchError for other failures", async () => {
            fetchHelper.shouldReject = true;
            fetchHelper.response = new Response(null, { status: 500 });
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 9 }] } });
            const runAction = wrapper.getComponent(ActionFormStub).props("runAction");
            await expect(runAction({})).rejects.toBeInstanceOf(FetchError);
        });

        scopedIt("adds Dry-Run header when performing dry run", async () => {
            fetchHelper.responseData = { ok: true };
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 11 }] } });

            await wrapper.vm.defaultRunAction({ dryRun: true, formValues: {} });

            const options = fetchHelper.mock.calls[0][1];
            expect(options.headers["Dry-Run"]).toBe("true");
        });

        scopedIt("adds Acknowledge-Warnings header when a digest is acknowledged", async () => {
            fetchHelper.responseData = { ok: true };
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 11 }] } });

            await wrapper.vm.defaultRunAction({ formValues: {}, acknowledgeWarnings: "d1" });

            const options = fetchHelper.mock.calls[0][1];
            expect(options.headers["Acknowledge-Warnings"]).toBe("d1");
        });

        scopedIt("omits Acknowledge-Warnings header when no digest is acknowledged", async () => {
            fetchHelper.responseData = { ok: true };
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 11 }] } });

            await wrapper.vm.defaultRunAction({ formValues: {} });

            const options = fetchHelper.mock.calls[0][1];
            expect(options.headers["Acknowledge-Warnings"]).toBeUndefined();
        });
    });

    describe("redirectTo", () => {
        scopedIt("uses returnPath when provided", async () => {
            routeQuery = { returnPath: "/back" };
            const { wrapper } = mountModelActionForm();
            const redirectTo = wrapper.getComponent(ActionFormStub).props("redirectTo");
            await redirectTo("success");
            expect(routerPush).toHaveBeenCalledWith("/back");
        });

        scopedIt("redirects to detail when configured", async () => {
            routeQuery = {};
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 3 }] } });
            const redirectTo = wrapper.getComponent(ActionFormStub).props("redirectTo");
            await redirectTo("success");
            expect(routerPush).toHaveBeenCalledWith({
                name: DETAIL_VIEW_CRUD_NAME,
                params: { app: "app", model: "person", action: "detail", pk: 3 },
            });
        });

        scopedIt("redirects to list for bulk actions", async () => {
            modelConfig.config.actionRedirects = {};
            const { wrapper } = mountModelActionForm({ fetchState: { objectsInOrder: [{ id: 1 }, { id: 2 }] } });
            const redirectTo = wrapper.getComponent(ActionFormStub).props("redirectTo");
            await redirectTo("success");
            expect(routerPush).toHaveBeenCalledWith({
                name: LIST_VIEW_CRUD_NAME,
                params: { app: "app", model: "person", action: "list" },
            });
        });
    });

    describe("Typed-confirm gating", () => {
        scopedIt("omits the TypedConfirmField when confirmText is not set", () => {
            const { wrapper } = mountModelActionForm();
            expect(wrapper.find('[data-slot="typed-confirm-field"]').exists()).toBe(false);
        });

        scopedIt("renders the TypedConfirmField when confirmText is set", () => {
            const { wrapper } = mountModelActionForm({ confirmText: "delete 2 people" });
            const field = wrapper.get('[data-slot="typed-confirm-field"]');
            expect(field.attributes("data-match")).toBe("false");
            expect(wrapper.get('[data-qa="typed-confirm-field-chip"]').text()).toBe("delete 2 people");
        });

        scopedIt("keeps the default confirm button disabled until the typed value matches", async () => {
            const { wrapper } = mountModelActionForm({ confirmText: "delete 2 people" });
            const button = wrapper.get('[data-qa="action-form-stub-confirm-slot"] [data-qa="button-stub"]');
            expect(button.attributes("disabled")).toBeDefined();

            const input = wrapper.get('[data-qa="typed-confirm-field-input"]');
            await input.setValue("delete");
            expect(button.attributes("disabled")).toBeDefined();

            await input.setValue("delete 2 people");
            expect(button.attributes("disabled")).toBeUndefined();
            expect(wrapper.get('[data-slot="typed-confirm-field"]').attributes("data-match")).toBe("true");
        });

        scopedIt("re-disables when the typed value drifts back out of match", async () => {
            const { wrapper } = mountModelActionForm({ confirmText: "delete 2 people" });
            const input = wrapper.get('[data-qa="typed-confirm-field-input"]');
            const button = wrapper.get('[data-qa="action-form-stub-confirm-slot"] [data-qa="button-stub"]');

            await input.setValue("delete 2 people");
            expect(button.attributes("disabled")).toBeUndefined();

            await input.setValue("delete 2 peopl");
            expect(button.attributes("disabled")).toBeDefined();
        });

        scopedIt("forwards a parent confirm-button slot with augmented disabled", async () => {
            const { wrapper } = mountModelActionForm({
                confirmText: "yes",
                slots: {
                    "confirm-button": `<template #confirm-button="{ disabled, label }">
                        <button data-qa="custom-confirm" :disabled="disabled || undefined">{{ label }}</button>
                    </template>`,
                },
            });
            const custom = wrapper.get('[data-qa="custom-confirm"]');
            expect(custom.text()).toBe("Yes, continue");
            expect(custom.attributes("disabled")).toBeDefined();

            await wrapper.get('[data-qa="typed-confirm-field-input"]').setValue("yes");
            expect(custom.attributes("disabled")).toBeUndefined();
        });
    });
});
