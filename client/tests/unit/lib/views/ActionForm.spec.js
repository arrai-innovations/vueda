import { mockLifecycle, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { ConfirmationRequiredError } from "@vueda/utils/errors.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";

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

const FormMessageStub = defineComponent({
    name: "FormMessageStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-message" }, slots.default ? slots.default() : null);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["loading"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () => {
            const children = slots.default?.();
            const textNode = children?.find((c) => typeof c.children === "string");
            const label = textNode?.children;
            return h(
                "button",
                {
                    "data-qa": "prime-button",
                    "data-label": typeof label === "string" ? label.trim() : undefined,
                    "data-loading": String(props.loading),
                    onClick: (event) => emit("click", event),
                },
                children,
            );
        };
    },
});

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "theme" });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));
const mockedUseModelConfig = vi.fn(() => ({ config: { actionRedirects: {} } }));
vi.mock("@vueda/use/useModelConfig", () => ({ useModelConfig: mockedUseModelConfig }));

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));

const routerPush = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
}));

const defaultOnSubmitNotAnyModified = vi.fn(async () => undefined);
vi.mock("@vueda/use/useObjectForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObjectForm.js");
    return {
        __esModule: true,
        ...actual,
        defaultOnSubmitNotAnyModified,
    };
});

const FeedbackSpinnerStub = defineComponent({
    name: "FeedbackSpinnerStub",
    setup() {
        return () => h("div", { "data-qa": "feedback-spinner" });
    },
});

// Mirrors the real dialog's consumer registration so the controller's fail-closed guard stays off
// and confirm/cancel can be driven through the controller in tests. Also mirrors the real
// dialog's `warnings` scoped slot (`{ warnings }`), so ActionForm's `form-confirm-dialog-warnings`
// forwarding can be exercised the same way it works against the real FormConfirmDialog. When
// ActionForm doesn't supply a `#warnings` template at all (no `form-confirm-dialog-warnings` slot
// given), `slots.warnings` is undefined here too, mirroring how the real FormConfirmDialog's own
// default rendering shows through in that case.
const FormConfirmDialogStub = defineComponent({
    name: "FormConfirmDialogStub",
    props: ["controller"],
    setup(props, { slots }) {
        onMounted(() => props.controller.register?.());
        onBeforeUnmount(() => props.controller.unregister?.());
        return () =>
            h(
                "div",
                {
                    "data-qa": "form-confirm-dialog",
                    "data-open": String(props.controller.open),
                },
                [
                    h(
                        "div",
                        { "data-qa": "form-confirm-dialog-warnings-slot" },
                        slots.warnings
                            ? slots.warnings({ warnings: props.controller.messages })
                            : h("div", { "data-qa": "form-confirm-dialog-default-warnings" }),
                    ),
                ],
            );
    },
});

vi.mock("@vueda/display/error-display/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/form/confirm/FormConfirmDialog.vue", () => ({ default: FormConfirmDialogStub }));
vi.mock("@vueda/form/form-model/FormMessage.vue", () => ({ default: FormMessageStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: FeedbackSpinnerStub }));

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
        handleServerFormValidationError: vi.fn(),
        clearServerErrors: vi.fn(),
        ...overrides.methods,
    };
}

function mountActionForm(options = {}) {
    const formContext = createFormContext(options.formContext || {});
    const wrapper = mount(ActionForm, {
        props: {
            runAction: options.runAction,
            actionState: options.actionState,
            fetchState: options.fetchState,
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

describe("lib/views/ActionForm.vue", () => {
    beforeEach(async () => {
        vi.doMock("vue", async () => {
            const actual = await vi.importActual("vue");
            return { __esModule: true, ...actual, onDeactivated: mockedOnDeactivated };
        });
        vue = await import("vue");
        ActionForm = (await import("@vueda/views/ActionForm.vue")).default;
        vi.unmock("vue");
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        defaultOnSubmitNotAnyModified.mockClear();
        mockedUseTheme.mockClear();
        mockedUseModelConfig.mockClear();
        clearDeactivated();
    });

    describe("Rendering", () => {
        scopedIt("renders error display and default buttons", () => {
            const { wrapper } = mountActionForm({
                fetchState: { error: new Error("boom"), loading: true },
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
            expect(toastMock.success).toHaveBeenCalledWith("Action Succeeded", expect.any(Object));
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
            expect(toastMock.success).not.toHaveBeenCalled();
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
            expect(toastMock.success).not.toHaveBeenCalled();
            expect(redirectTo).not.toHaveBeenCalled();
        });

        scopedIt("handles default error flow", async () => {
            const error = new Error("bad");
            const runAction = vi.fn(() => Promise.reject(error));
            const { wrapper } = mountActionForm({ runAction });
            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();
            expect(wrapper.find('[data-qa="error-display"]').attributes("data-error")).toBe("true");
            expect(toastMock.error).toHaveBeenCalled();
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
            expect(toastMock.error).not.toHaveBeenCalled();
        });

        scopedIt("actionState error should be displayed when not handled", async () => {
            const actionState = vue.reactive({
                error: null,
                errored: false,
                loading: false,
            });
            const runAction = vi.fn(() => {
                actionState.error = new Error("auth error");
                actionState.errored = true;
                return Promise.resolve();
            });

            const { wrapper } = mountActionForm({ runAction, actionState });

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();

            const display = wrapper.get('[data-qa="error-display"]');
            expect(display.attributes("data-error")).toBe("true");
            expect(display.attributes("data-errored")).toBe("true");
        });

        scopedIt("does not display actionState error when handled", async () => {
            const actionState = vue.reactive({
                error: null,
                errored: false,
                loading: false,
            });
            const runAction = vi.fn(() => {
                actionState.error = new Error("handled error");
                actionState.errored = true;
                return Promise.resolve();
            });
            const handler = vi.fn(async () => true); // Returns true = handled

            const { wrapper } = mountActionForm({
                runAction,
                actionState,
                onSubmissionErrorHandler: handler,
            });

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();

            const display = wrapper.get('[data-qa="error-display"]');
            expect(display.attributes("data-error")).toBe("false");
            expect(display.attributes("data-errored")).toBe("false");
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
            expect(toastMock.warning).toHaveBeenCalledWith("Submission Blocked", expect.any(Object));
        });
    });

    describe("Warning confirmation", () => {
        scopedIt("mounts FormConfirmDialog wired to the confirmation controller", () => {
            const { wrapper } = mountActionForm();
            const dialog = wrapper.findComponent(FormConfirmDialogStub);
            expect(dialog.exists()).toBe(true);
            const controller = dialog.props("controller");
            expect(controller.open).toBe(false);
            // The dialog registered itself as the consumer that resolves confirmation requests.
            expect(controller.consumers).toBe(1);
        });

        scopedIt("opens the dialog on a 409 and retries with the digest when confirmed", async () => {
            const error = new ConfirmationRequiredError(
                { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } },
                {},
            );
            const runAction = vi.fn(({ acknowledgeWarnings }) =>
                acknowledgeWarnings === "d1" ? Promise.resolve("ok") : Promise.reject(error),
            );
            const redirectTo = vi.fn();
            const { wrapper } = mountActionForm({ runAction, redirectTo });
            const controller = wrapper.findComponent(FormConfirmDialogStub).props("controller");

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();
            expect(controller.open).toBe(true);
            expect(runAction).toHaveBeenCalledTimes(1);
            expect(toastMock.error).not.toHaveBeenCalled();

            controller.confirm();
            await flushPromises();

            expect(runAction).toHaveBeenCalledTimes(2);
            expect(runAction).toHaveBeenLastCalledWith({
                formValues: {},
                dryRun: false,
                acknowledgeWarnings: "d1",
            });
            expect(toastMock.success).toHaveBeenCalled();
            expect(redirectTo).toHaveBeenCalledWith("success");
        });

        scopedIt("leaves the action unrun without an error banner when cancelled", async () => {
            const error = new ConfirmationRequiredError(
                { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } },
                {},
            );
            const runAction = vi.fn(() => Promise.reject(error));
            const redirectTo = vi.fn();
            const { wrapper } = mountActionForm({ runAction, redirectTo });
            const controller = wrapper.findComponent(FormConfirmDialogStub).props("controller");

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();
            expect(controller.open).toBe(true);

            controller.cancel();
            await flushPromises();

            expect(runAction).toHaveBeenCalledTimes(1);
            expect(toastMock.success).not.toHaveBeenCalled();
            expect(toastMock.error).not.toHaveBeenCalled();
            expect(redirectTo).not.toHaveBeenCalled();
            expect(wrapper.get('[data-qa="error-display"]').attributes("data-errored")).toBe("false");
        });

        scopedIt(
            "falls through to FormConfirmDialog's own default rendering when no form-confirm-dialog-warnings slot is provided",
            async () => {
                const error = new ConfirmationRequiredError(
                    { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } },
                    {},
                );
                const runAction = vi.fn(() => Promise.reject(error));
                const { wrapper } = mountActionForm({ runAction });

                await wrapper.find("form").trigger("submit.prevent");
                await flushPromises();

                expect(wrapper.find('[data-qa="form-confirm-dialog-default-warnings"]').exists()).toBe(true);
            },
        );

        scopedIt("forwards the controller's warnings mapping to the form-confirm-dialog-warnings slot", async () => {
            const error = new ConfirmationRequiredError(
                { confirmation_required: true, digest: "d1", warnings: { count: ["A negative count is unusual."] } },
                {},
            );
            const runAction = vi.fn(() => Promise.reject(error));
            const { wrapper } = mountActionForm({
                runAction,
                slots: {
                    "form-confirm-dialog-warnings": `<template #form-confirm-dialog-warnings="{ warnings }">
                        <div data-qa="custom-warnings">{{ JSON.stringify(warnings) }}</div>
                    </template>`,
                },
            });

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();

            const custom = wrapper.get('[data-qa="custom-warnings"]');
            expect(JSON.parse(custom.text())).toEqual({ count: ["A negative count is unusual."] });
        });
    });

    describe("Cancel flow", () => {
        scopedIt("calls redirectTo on cancel", async () => {
            const redirectTo = vi.fn();
            const { wrapper } = mountActionForm({ redirectTo });
            const cancelBtn = wrapper
                .findAll('[data-qa="prime-button"]')
                .find((btn) => btn.text().includes("Cancel, go back"));
            await cancelBtn.trigger("click");
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
