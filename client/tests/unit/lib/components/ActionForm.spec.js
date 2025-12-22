import { mockLifecycle, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { defineComponent, h } from "vue";

const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    props: ["error", "errored"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "error-display",
                "data-error": props.error ? "true" : "false",
                "data-errored": String(props.errored),
            });
    },
});

const FormChoresStub = defineComponent({
    name: "FormChoresStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-chores" }, slots.default ? slots.default() : null);
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
                    onClick: (event) => emit("click", event),
                },
                slots.default ? slots.default() : null,
            );
    },
});

const mockedUseTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));
const mockedUseModelConfig = vi.fn(() => ({ config: { actionRedirects: {} } }));
vi.mock("@vueda/use/useModelConfig", () => ({ useModelConfig: mockedUseModelConfig }));

const toastAdd = vi.fn();
vi.mock("primevue/usetoast", () => ({ useToast: () => ({ add: toastAdd }) }));

const routerPush = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
}));

const defaultOnSubmissionError = vi.fn(async () => false);
const defaultOnSubmitNotAnyModified = vi.fn(async () => undefined);
vi.mock("@vueda/use/useObjectForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObjectForm.js");
    return {
        __esModule: true,
        ...actual,
        defaultOnSubmissionError,
        defaultOnSubmitNotAnyModified,
    };
});

vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/FormChores.vue", () => ({ default: FormChoresStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));

const lifecycle = mockLifecycle(vi);
const { mockedOnDeactivated, runDeactivatedHooks, clearDeactivated } = lifecycle;

let ActionForm, vue;

function createFormContext(overrides = {}) {
    const state = vue.reactive({
        anyError: false,
        errors: {},
        submittingValues: {},
        anyModified: overrides.anyModified ?? true,
        ...overrides.state,
    });
    return {
        state,
        setAllTouched: vi.fn(),
        ...overrides.methods,
    };
}

function mountActionForm(options = {}) {
    const formContext = createFormContext(options.formContext || {});
    const wrapper = mount(ActionForm, {
        props: {
            runAction: options.runAction,
            actionState: options.actionState,
            redirectTo: options.redirectTo,
            hasInput: options.hasInput,
            onSubmissionSuccessHandler: options.onSubmissionSuccessHandler,
            onSubmissionErrorHandler: options.onSubmissionErrorHandler,
            actionSuccessSummary: options.actionSuccessSummary,
            actionErrorSummary: options.actionErrorSummary,
            app: "app",
            model: "model",
            action: "activate",
        },
        slots: options.slots,
        global: {
            provide: { [FormContextSymbol]: formContext },
        },
    });
    return { wrapper, formContext };
}

describe("lib/components/ActionForm.vue", () => {
    beforeEach(async () => {
        vi.doMock("vue", async () => {
            const actual = await vi.importActual("vue");
            return { __esModule: true, ...actual, onDeactivated: mockedOnDeactivated };
        });
        vue = await import("vue");
        ActionForm = (await import("@vueda/components/ActionForm.vue")).default;
        vi.unmock("vue");
        toastAdd.mockClear();
        routerPush.mockClear();
        defaultOnSubmissionError.mockClear();
        defaultOnSubmitNotAnyModified.mockClear();
        mockedUseTheme.mockClear();
        mockedUseModelConfig.mockClear();
        clearDeactivated();
    });

    describe("Rendering", () => {
        scopedIt("renders error display and default buttons", () => {
            const { wrapper } = mountActionForm({
                actionState: { error: new Error("boom"), loading: true },
            });
            const root = wrapper.get('[data-qa="action-form-root"]');
            expect(root.exists()).toBe(true);
            const display = wrapper.get('[data-qa="error-display"]');
            expect(display.attributes("data-error")).toBe("true");
            expect(display.attributes("data-errored")).toBe("true");
            const buttons = wrapper.findAll('[data-qa="prime-button"]');
            expect(buttons).toHaveLength(2);
            expect(buttons[0].text()).toContain("Yes, continue");
        });

        scopedIt("renders slot overrides for action bar", async () => {
            const { wrapper } = mountActionForm({
                slots: {
                    "action-bar": ({ handleConfirm, handleCancelClick }) =>
                        h("div", { "data-qa": "custom-bar" }, [
                            h(
                                "button",
                                {
                                    id: "confirm",
                                    onClick: () => handleConfirm(),
                                },
                                "confirm",
                            ),
                            h(
                                "button",
                                {
                                    id: "cancel",
                                    onClick: (e) => handleCancelClick(e),
                                },
                                "cancel",
                            ),
                        ]),
                },
            });
            await wrapper.find("#confirm").trigger("click");
            await flushPromises();
            await wrapper.find("#cancel").trigger("click");
            expect(wrapper.find('[data-qa="custom-bar"]').exists()).toBe(true);
        });
    });

    describe("Confirm flow", () => {
        scopedIt("runs action and redirects on success", async () => {
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const redirectTo = vi.fn();
            const { wrapper } = mountActionForm({ runAction, redirectTo });
            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();
            expect(runAction).toHaveBeenCalledWith({ dryRun: false, formValues: {} });
            expect(redirectTo).toHaveBeenCalledWith("success");
            expect(toastAdd).toHaveBeenCalledWith(
                expect.objectContaining({ severity: "success", summary: "Action Succeeded" }),
            );
        });

        scopedIt("uses onSubmissionSuccessHandler when provided", async () => {
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const handler = vi.fn();
            const redirectTo = vi.fn();
            const { wrapper } = mountActionForm({
                runAction,
                redirectTo,
                onSubmissionSuccessHandler: handler,
            });
            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();
            expect(handler).toHaveBeenCalledWith("ok");
            expect(redirectTo).not.toHaveBeenCalled();
            expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ severity: "success" }));
        });

        scopedIt("performs dry run automatically when ready", async () => {
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const onSubmissionSuccessHandler = vi.fn();
            const redirectTo = vi.fn();
            const { wrapper } = mountActionForm({
                runAction,
                redirectTo,
                onSubmissionSuccessHandler,
            });

            await wrapper.setProps({ readyToDryRun: true });
            await flushPromises();

            expect(runAction).toHaveBeenCalledWith({ dryRun: true, formValues: {} });
            expect(onSubmissionSuccessHandler).not.toHaveBeenCalled();
            expect(toastAdd).not.toHaveBeenCalled();
            expect(redirectTo).not.toHaveBeenCalled();
        });

        scopedIt("handles default error flow", async () => {
            const error = new Error("bad");
            const runAction = vi.fn(() => Promise.reject(error));
            const { wrapper } = mountActionForm({ runAction });
            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();
            expect(defaultOnSubmissionError).toHaveBeenCalledWith({
                error,
                formContext: expect.any(Object),
                toast: expect.any(Object),
            });
            expect(wrapper.find('[data-qa="error-display"]').attributes("data-error")).toBe("true");
            expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: "error" }));
        });

        scopedIt("respects custom error handler", async () => {
            const error = new Error("bad");
            const runAction = vi.fn(() => Promise.reject(error));
            const handler = vi.fn(async () => true);
            const { wrapper } = mountActionForm({ runAction, onSubmissionErrorHandler: handler });
            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();
            expect(handler).toHaveBeenCalled();
            expect(wrapper.find('[data-qa="error-display"]').attributes("data-error")).toBe("false");
            expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ severity: "error" }));
        });
    });

    describe("Input validation", () => {
        scopedIt("prevents submission when no changes with input", async () => {
            const runAction = vi.fn();
            const { wrapper, formContext } = mountActionForm({
                hasInput: true,
                runAction,
                formContext: { state: { anyModified: false } },
            });
            const originalState = globalThis.state;
            globalThis.state = formContext.state;
            try {
                await wrapper.find("form").trigger("submit.prevent");
                await flushPromises();
            } finally {
                if (originalState === undefined) {
                    delete globalThis.state;
                } else {
                    globalThis.state = originalState;
                }
            }
            expect(formContext.setAllTouched).toHaveBeenCalled();
            expect(defaultOnSubmitNotAnyModified).toHaveBeenCalledWith({ toast: expect.any(Object) });
            expect(runAction).not.toHaveBeenCalled();
        });

        scopedIt("blocks submission when client validation errors exist", async () => {
            const runAction = vi.fn();
            const { wrapper, formContext } = mountActionForm({
                hasInput: true,
                runAction,
                formContext: {
                    state: {
                        anyModified: true,
                        anyError: true,
                        errors: { field: { client: "invalid" } },
                    },
                },
            });
            const originalState = globalThis.state;
            globalThis.state = formContext.state;
            try {
                await wrapper.find("form").trigger("submit.prevent");
                await flushPromises();
            } finally {
                if (originalState === undefined) {
                    delete globalThis.state;
                } else {
                    globalThis.state = originalState;
                }
            }
            expect(formContext.setAllTouched).toHaveBeenCalled();
            expect(runAction).not.toHaveBeenCalled();
            expect(toastAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: "warn",
                    summary: "Submission Blocked",
                }),
            );
        });
    });

    describe("Cancel flow", () => {
        scopedIt("calls redirectTo on cancel", async () => {
            const redirectTo = vi.fn();
            const { wrapper } = mountActionForm({ redirectTo });
            await wrapper.find('[data-qa="prime-button"][data-label="Cancel, go back"]').trigger("click");
            expect(redirectTo).toHaveBeenCalledWith("cancel");
        });
    });

    describe("Lifecycle", () => {
        scopedIt("cancels inflight promise on deactivate", async () => {
            const cancel = vi.fn();
            const runAction = vi.fn(() => ({ then: vi.fn(), catch: vi.fn(), finally: vi.fn(), cancel }));
            const { wrapper } = mountActionForm({ runAction });
            await wrapper.find("form").trigger("submit.prevent");
            runDeactivatedHooks();
            expect(cancel).toHaveBeenCalled();
        });
    });
});
