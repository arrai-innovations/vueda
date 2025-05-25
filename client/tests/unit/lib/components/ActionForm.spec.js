import { mockLifecycle, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { defineComponent, h } from "vue";

// Stubs
const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "error-display", ...attrs }, slots.default ? slots.default() : null);
    },
});
const FormChoresStub = defineComponent({
    name: "FormChoresStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-chores" }, slots.default ? slots.default() : null);
    },
});
const FieldStringStub = defineComponent({
    name: "FieldStringStub",
    props: ["fieldValue", "label", "name"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "field-string" }, slots.default ? slots.default() : null);
    },
});
const WidgetReadOnlyStub = defineComponent({
    name: "WidgetReadOnlyStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "widget-read-only" }, slots.default ? slots.default() : null);
    },
});
const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label", "loading"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "prime-button",
                    "data-label": props.label,
                    "data-loading": String(props.loading),
                    onClick: () => emit("click"),
                },
                slots.default ? slots.default() : null,
            );
    },
});

// Mocks
const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig", () => ({ useModelConfig: mockedUseModelConfig }));
const mockedUseTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));
const toastAdd = vi.fn();
vi.mock("primevue/usetoast", () => ({ useToast: () => ({ add: toastAdd }) }));
const routerPush = vi.fn();
let routeQuery = { returnPath: "/back" };
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ query: routeQuery }),
}));
const getCRUDForTo = vi.fn(async () => "/list");
vi.mock("@vueda/router/getCrud.js", () => ({ getCRUDForTo }));
const getListUrl = vi.fn(({ action }) => (action ? `/list-url/${action}/` : "/list-url/"));
const getDetailUrl = vi.fn(({ pk, action }) => (action ? `/detail-url/${pk}/${action}/` : `/detail-url/${pk}/`));
vi.mock("@vueda/utils/urls.js", () => ({ getListUrl, getDetailUrl }));
const getCSRFValue = vi.fn(() => "token");
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue }));
const fetchHelper = vi.fn(() => Promise.resolve({}));
vi.mock("@vueda/utils/fetchSupport.js", async () => {
    const actual = await vi.importActual("@vueda/utils/fetchSupport.js");
    return { __esModule: true, ...actual, fetchHelper };
});
const defaultOnSubmissionError = vi.fn(async () => false);
vi.mock("@vueda/use/useObjectForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObjectForm.js");
    return { __esModule: true, ...actual, defaultOnSubmissionError };
});
vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/FormChores.vue", () => ({ default: FormChoresStub }));
vi.mock("@vueda/fields/FieldString.vue", () => ({ default: FieldStringStub }));
vi.mock("@vueda/widgets/WidgetReadOnly.vue", () => ({ default: WidgetReadOnlyStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));

// Lifecycle mocks
const lifecycle = mockLifecycle(vi);
const { mockedOnDeactivated, runDeactivatedHooks, clearDeactivated } = lifecycle;

let ActionForm, vue;

function mountWithContext(options = {}) {
    const formContext = {
        state: vue.reactive({ anyError: false, submittingValues: {} }),
        setAllTouched: vi.fn(),
    };
    const modelConfig = vue.reactive({
        info: { verboseName: "Person", verboseNamePlural: "People" },
        config: { defaultView: "detail" },
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    const runActionProp = options.runAction ?? vi.fn(() => Promise.resolve());
    const wrapper = mount(ActionForm, {
        props: {
            app: "app",
            model: "person",
            action: "activate",
            fetchState: {
                errored: false,
                error: null,
                loading: false,
                objectsInOrder: [{ id: 1 }, { id: 2 }],
                objects: { 1: {}, 2: {} },
            },
            runAction: runActionProp,
            ...(options.props || {}),
        },
        slots: options.slots,
        global: {
            provide: { [FormContextSymbol]: formContext },
            ...(options.global || {}),
        },
    });
    return { wrapper, runAction: runActionProp, formContext, modelConfig };
}

describe("lib/components/ActionForm.vue", () => {
    beforeEach(async () => {
        vi.doMock("vue", async () => {
            const actual = await vi.importActual("vue");
            return { __esModule: true, ...actual, onDeactivated: mockedOnDeactivated };
        });
        vue = await import("vue");
        ActionForm = (await import("@vueda/components/ActionForm.vue")).default;
        // only mock the lifecycle hooks after importing our component
        vi.unmock("vue");
        mockedUseModelConfig.mockReset();
        mockedUseTheme.mockClear();
        toastAdd.mockClear();
        routerPush.mockClear();
        defaultOnSubmissionError.mockClear();
        getListUrl.mockClear();
        getDetailUrl.mockClear();
        getCSRFValue.mockClear();
        routeQuery = { returnPath: "/back" };
        fetchHelper.mockClear();
        clearDeactivated();
    });

    describe("Rendering & slot fall-backs", () => {
        scopedIt("renders selected objects and confirm message", () => {
            const { wrapper } = mountWithContext();
            const items = wrapper.findAll('[data-qa="action-form-list-item"]');
            expect(items).toHaveLength(2);
            const message = wrapper.find('[data-qa="action-form-message"]').text();
            expect(message).toContain("Are you sure you want to activate the selected People?");
            expect(mockedUseTheme).toHaveBeenCalledWith("ActionForm", expect.any(Object));
        });

        scopedIt("shows loading placeholder when fetchState.loading", () => {
            const { wrapper } = mountWithContext({
                props: { fetchState: { loading: true, objectsInOrder: [{ id: 1 }], objects: { 1: {} } } },
            });
            const listItems = wrapper.findAll('[data-qa="action-form-list-item"]');
            expect(listItems).toHaveLength(0);
            expect(wrapper.text()).toContain("Loading objects...");
        });

        scopedIt("passes error to ErrorDisplay", () => {
            const error = new Error("oops");
            const { wrapper } = mountWithContext({
                props: {
                    fetchState: {
                        errored: true,
                        error,
                        loading: false,
                        objectsInOrder: [{ id: 1 }],
                        objects: { 1: {} },
                    },
                },
            });
            const err = wrapper.get('[data-qa="error-display"]');
            expect(err.attributes("errored")).toBe("true");
            expect(err.attributes("error")).toBeDefined();
        });

        scopedIt("custom slots override default markup", () => {
            const { wrapper } = mountWithContext({
                slots: {
                    "selected-objects": '<div data-qa="custom-selected">x</div>',
                    "confirm-message": '<p data-qa="custom-message">hello</p>',
                    "link-item": '<span data-qa="custom-link">L</span>',
                },
            });
            expect(wrapper.find('[data-qa="custom-selected"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="action-form-list-item"]').exists()).toBe(false);
            const msg = wrapper.get('[data-qa="action-form-message"]');
            expect(msg.text()).toBe("hello");
        });
    });

    describe("Computed copy & i18n helpers", () => {
        scopedIt("actionSuccessSummary fall-back", async () => {
            const { wrapper: single } = mountWithContext({
                props: {
                    fetchState: {
                        loading: false,
                        errored: false,
                        error: null,
                        objectsInOrder: [{ id: 1 }],
                        objects: { 1: {} },
                    },
                },
            });
            await single.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ summary: "Activate Person Successful" }));

            toastAdd.mockClear();
            const { wrapper: plural } = mountWithContext();
            await plural.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ summary: "Activate People Successful" }));
        });

        scopedIt("actionErrorSummary fall-back", async () => {
            const error = new Error("bad");
            const runAction = vi.fn(() => Promise.reject(error));
            const { wrapper } = mountWithContext({
                runAction,
                props: { fetchState: { objectsInOrder: [{ id: 1 }], objects: { 1: {} } } },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(toastAdd).toHaveBeenCalledWith(
                expect.objectContaining({ severity: "error", summary: "Failed to activate person " }),
            );
        });

        scopedIt("prop actionSuccessSummary overrides computed", async () => {
            const { wrapper } = mountWithContext({ props: { actionSuccessSummary: "Yay" } });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(wrapper.vm.actionSuccessSummary).toBe("Yay");
            expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ summary: "Yay" }));
        });

        scopedIt("prop actionErrorSummary overrides computed", async () => {
            const runAction = vi.fn(() => Promise.reject(new Error("x")));
            const { wrapper } = mountWithContext({
                runAction,
                props: { actionErrorSummary: "Nope", fetchState: { objectsInOrder: [{ id: 1 }], objects: { 1: {} } } },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(wrapper.vm.actionErrorSummary).toBe("Nope");
            expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ summary: "Nope" }));
        });

        scopedIt("actionVerboseName prop influences computedActionVerboseNameLowerCase", () => {
            const { wrapper } = mountWithContext({ props: { actionVerboseName: "Deactivate" } });
            expect(wrapper.vm.computedActionVerboseNameLowerCase).toBe("Deactivate");
        });

        scopedIt("modelConfig cache miss uses fallbacks", () => {
            const { wrapper, modelConfig } = mountWithContext();
            modelConfig.info.verboseName = undefined;
            modelConfig.info.verboseNamePlural = undefined;
            expect(wrapper.vm.computedConfirmMessage).toContain("the selected people");
        });
    });

    describe("Confirm flow", () => {
        scopedIt("validation short-circuit", async () => {
            const { wrapper, runAction, formContext } = mountWithContext();
            formContext.state.anyError = true;
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(runAction).not.toHaveBeenCalled();
            expect(toastAdd).not.toHaveBeenCalled();
        });

        scopedIt("toast on failure sets errored", async () => {
            const error = new Error("fail");
            const runAction = vi.fn(() => Promise.reject(error));
            const { wrapper } = mountWithContext({
                runAction,
                props: { fetchState: { objectsInOrder: [{ id: 1 }], objects: { 1: {} } } },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(wrapper.vm.actionState.errored).toBe(true);
            expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: "error" }));
        });

        scopedIt("handled errors skip toast", async () => {
            defaultOnSubmissionError.mockResolvedValue(true);
            const error = new Error("bad");
            const runAction = vi.fn(() => Promise.reject(error));
            const { wrapper } = mountWithContext({
                runAction,
                props: { fetchState: { objectsInOrder: [{ id: 1 }], objects: { 1: {} } } },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(wrapper.vm.actionState.errored).toBe(false);
            expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ severity: "error" }));
        });
    });

    describe("Cancel flow", () => {
        scopedIt("return-path precedence", async () => {
            const { wrapper } = mountWithContext();
            await wrapper.findAll('[data-qa="prime-button"]')[1].trigger("click");
            expect(routerPush).toHaveBeenCalledWith("/back");
        });

        scopedIt("default fall-backs", async () => {
            routeQuery = {};
            const { wrapper: bulk } = mountWithContext();
            routerPush.mockClear();
            await bulk.findAll('[data-qa="prime-button"]')[1].trigger("click");
            expect(routerPush).toHaveBeenCalledWith({
                name: LIST_VIEW_CRUD_NAME,
                params: { app: "app", model: "person", action: "list" },
            });

            routeQuery = {};
            const { wrapper: single } = mountWithContext({
                props: { fetchState: { objectsInOrder: [{ id: 1 }], objects: { 1: {} } } },
            });
            routerPush.mockClear();
            await single.findAll('[data-qa="prime-button"]')[1].trigger("click");
            expect(routerPush).toHaveBeenCalledWith({
                name: DETAIL_VIEW_CRUD_NAME,
                params: { app: "app", model: "person", action: "detail", pk: 1 },
            });
        });

        scopedIt("handleCancelClick stops event", async () => {
            const { wrapper } = mountWithContext();
            const evt = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
            await wrapper.vm.handleCancelClick(evt);
            expect(evt.preventDefault).toHaveBeenCalled();
            expect(evt.stopPropagation).toHaveBeenCalled();
        });
    });

    describe("defaultRunAction request construction", () => {
        scopedIt("method inference and url resolution", async () => {
            fetchHelper.mockImplementation((...args) => {
                expect(args[0]).toBe("/list-url/");
                expect(args[1].method).toBe("DELETE");
                return Promise.resolve(JSON.stringify({ ok: true }), { status: 200 });
            });
            const { wrapper } = mountWithContext({ props: { runAction: undefined, action: "destroy" } });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(fetchHelper).toHaveBeenCalledWith(
                "/list-url/destroy/",
                expect.objectContaining({ method: "DELETE" }),
                expect.any(String),
                expect.any(Function),
            );

            const wrapper2 = mountWithContext({
                props: {
                    runAction: undefined,
                    fetchState: {
                        objectsInOrder: [{ id: 1 }],
                        objects: { 1: {} },
                        loading: false,
                        errored: false,
                        error: null,
                    },
                },
            }).wrapper;
            await wrapper2.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(fetchHelper).toHaveBeenCalledWith(
                "/detail-url/1/activate/",
                expect.objectContaining({ method: "PUT" }),
                expect.any(String),
                expect.any(Function),
            );
        });

        scopedIt("body shape with submitFormValues", async () => {
            fetchHelper.mockImplementation((...args) => {
                expect(args[0]).toBe("/list-url/");
                expect(args[1].method).toBe("DELETE");
                return Promise.resolve(JSON.stringify({ ok: true }), { status: 200 });
            });
            const submitFormValues = vi.fn(() => ({ extra: true }));
            const { wrapper } = mountWithContext({
                props: { runAction: undefined, submitFormValues },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(fetchHelper.mock.calls[0][1].body).toEqual(JSON.stringify({ pks: [1, 2], extra: true }));

            const { wrapper: single } = mountWithContext({
                props: {
                    runAction: undefined,
                    submitFormValues,
                    fetchState: {
                        objectsInOrder: [{ id: 1 }],
                        objects: { 1: {} },
                        loading: false,
                        errored: false,
                        error: null,
                    },
                },
            });
            await single.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            expect(fetchHelper.mock.calls[1][1].body).toEqual(JSON.stringify({ extra: true }));
        });

        scopedIt("response handler returns typed errors", async () => {
            let resolver;
            fetchHelper.mockImplementation((url, options, msg, responseResolver) => {
                resolver = responseResolver;
                return Promise.resolve();
            });
            const { wrapper } = mountWithContext({ props: { runAction: undefined } });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await flushPromises();
            const err1 = resolver({ status: 400 }, {});
            expect(err1).toBeInstanceOf(FormValidationError);
            const err2 = resolver({ status: 500 }, {});
            expect(err2).toBeInstanceOf(FetchError);
        });
    });

    describe("Reactive state & loaders", () => {
        scopedIt("combinedLoading combines both sources", async () => {
            const pending = new Promise(() => {});
            const runAction = vi.fn(() => pending);
            const { wrapper } = mountWithContext({ runAction });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await vue.nextTick();
            expect(wrapper.findAll('[data-qa="prime-button"]')[0].attributes("data-loading")).toBe("true");
            expect(wrapper.findAll('[data-qa="prime-button"]')[1].attributes("data-loading")).toBe("true");
        });
    });

    describe("Lifecycle clean-up", () => {
        scopedIt("calls cancel() on actionPromise when unmounted", async () => {
            const cancelSpy = vi.fn();
            fetchHelper.mockReturnValue(Object.assign(new Promise(() => {}), { cancel: cancelSpy }));

            const { wrapper } = mountWithContext({ props: { runAction: undefined } });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await vue.nextTick();
            wrapper.unmount();
            expect(cancelSpy).toHaveBeenCalled();
        });

        scopedIt("cancels inflight action on deactivation", async () => {
            const cancelSpy = vi.fn();
            fetchHelper.mockReturnValue(Object.assign(new Promise(() => {}), { cancel: cancelSpy }));
            const { wrapper } = mountWithContext({ props: { runAction: undefined } });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            await vue.nextTick();
            runDeactivatedHooks();
            expect(cancelSpy).toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("handles deactivation without inflight", () => {
            mountWithContext();
            expect(() => runDeactivatedHooks()).not.toThrow();
        });
    });

    describe("Theme helper", () => {
        scopedIt("useTheme receives component name and props", () => {
            mountWithContext({ props: { themeOverride: { foo: "bar" } } });
            expect(mockedUseTheme).toHaveBeenCalledWith("ActionForm", expect.any(Object));
        });
    });
});
