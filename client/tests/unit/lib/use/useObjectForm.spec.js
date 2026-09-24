import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { ConfirmationRequiredError, ServerFeedbackError } from "@vueda/utils/errors.js";
import flushPromises from "flush-promises";
import { reactive, ref } from "vue";

const mockUseLeaveUnload = vi.fn();
vi.mock("@vueda/use/useLeaveUnload.js", () => ({
    useLeaveUnload: mockUseLeaveUnload,
}));

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
vi.mock("vue-router", async () => {
    const actual = await vi.importActual("vue-router");
    return {
        ...actual,
        useRouter: () => ({ push: routerPush }),
    };
});

vi.mock("@vueda/utils/case.js", () => ({
    memoizedStartCase: () => "Verbose",
}));

const mockLoadingError = {
    loading: ref(false),
    error: ref(null),
    errored: ref(false),
    clearError: vi.fn(),
    setError: vi.fn(),
    setLoading: vi.fn(),
    clearLoading: vi.fn(),
};
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useLoadingError: () => mockLoadingError,
    };
});

describe("lib/use/useObjectForm.js", () => {
    let useObjectForm, defaultOnSubmitNotAnyModified, defaultOnSubmitAnyError, defaultOnSubmissionSuccess;

    beforeEach(async () => {
        const mod = await import("@vueda/use/useObjectForm.js");
        useObjectForm = mod.useObjectForm;
        defaultOnSubmitNotAnyModified = mod.defaultOnSubmitNotAnyModified;
        defaultOnSubmitAnyError = mod.defaultOnSubmitAnyError;
        defaultOnSubmissionSuccess = mod.defaultOnSubmissionSuccess;
        vi.clearAllMocks();
    });

    scopedIt("resets a reused form even when model defaults are equal and clears submission failure", async () => {
        const { useForm } = await import("@vueda/use/useForm.js");
        const props = reactive({ app: "catalog", model: "category" });
        const instanceObject = { state: reactive({ pk: null }), clearError: vi.fn() };
        const { formContext, objectForm } = await withSetup(() => {
            const formContext = useForm(reactive({ initialValues: { name: "" } }));
            return { formContext, objectForm: useObjectForm({ props, formContext, instanceObject }) };
        });
        formContext.updateValue("name", "old draft");
        formContext.updateError("name", "validate", "Invalid");
        expect(formContext.state.values.name).toBe("old draft");
        expect(formContext.state.errors.name).toBeDefined();
        formContext.setAllTouched();
        objectForm.state.submitErrored = true;
        props.model = "warehouse";
        await flushPromises();
        expect(objectForm.state.submitErrored).toBe(false);
        expect(formContext.state.values).toEqual({ name: "" });
        expect(formContext.state.errors).toEqual({});
        expect(formContext.state.submitted).toBe(false);
        expect(instanceObject.clearError).toHaveBeenCalled();
        objectForm.state.submitErrored = true;
        instanceObject.state.pk = "2";
        await flushPromises();
        expect(objectForm.state.submitErrored).toBe(false);
    });

    scopedIt("ignores a save completion after changing its target", async () => {
        let resolveSave;
        const request = new Promise((resolve) => {
            resolveSave = resolve;
        });
        request.cancel = vi.fn();
        const props = reactive({ app: "catalog", model: "category" });
        const formContext = {
            state: { anyModified: true, anyError: false, submittingValues: {} },
            setAllTouched: vi.fn(),
            reset: vi.fn(),
        };
        const instanceObject = {
            state: reactive({ pk: "1", pkKey: "id", object: { id: "1" } }),
            update: vi.fn(() => request),
            clearError: vi.fn(),
        };
        const objectForm = useObjectForm({ props, formContext, instanceObject });
        objectForm.onSubmissionSuccess = vi.fn();
        const submission = objectForm.submit();
        await flushPromises();
        instanceObject.state.pk = "2";
        await flushPromises();
        resolveSave();
        await submission;
        expect(request.cancel).toHaveBeenCalled();
        expect(objectForm.onSubmissionSuccess).not.toHaveBeenCalled();
    });

    scopedIt("defaultOnSubmitNotAnyModified shows toast and returns true", async () => {
        const result = await defaultOnSubmitNotAnyModified({ toast: toastMock });
        expect(result).toBe(true);
        expect(toastMock.info).toHaveBeenCalledWith("No Changes Detected", {
            description: "Please modify the fields before submitting.",
            duration: 15000,
        });
    });

    scopedIt("defaultOnSubmitAnyError ignores when only server errors", async () => {
        const formContext = {
            state: {
                anyIgnored: false,
                ignored: {},
                errors: { field: { server: "bad" } },
            },
        };
        const state = { firstErrorField: "field" };
        const result = await defaultOnSubmitAnyError({ state, formContext, toast: toastMock });
        expect(result).toBe(false);
        expect(toastMock.warning).not.toHaveBeenCalled();
    });

    scopedIt("defaultOnSubmissionSuccess pushes router", async () => {
        const state = reactive({
            redirectAfter: "list",
            verboseName: "model",
            app: "app",
            model: "model",
            pkKey: "id",
            object: { id: 1 },
        });
        await defaultOnSubmissionSuccess({
            isUpdate: false,
            state,
            toast: toastMock,
            router: { push: routerPush },
        });
        expect(toastMock.success).toHaveBeenCalled();
        expect(routerPush).toHaveBeenCalled();
    });

    scopedIt("submit calls create and success path", async () => {
        const props = reactive({
            app: "app",
            model: "model",
            verboseName: "model",
            redirectAfter: "list",
            firstErrorField: "name",
        });
        const formContext = {
            state: reactive({
                anyModified: true,
                anyError: false,
                submittingValues: { name: "test" },
                errors: {},
                anyIgnored: false,
                ignored: {},
            }),
            setAllTouched: vi.fn(),
            handleServerFormValidationError: vi.fn(),
        };
        const instanceObject = {
            state: reactive({
                pkKey: "id",
                pk: "",
                object: {},
                errored: false,
                error: null,
            }),
            create: vi.fn().mockResolvedValue(),
            update: vi.fn().mockResolvedValue(),
            clearError: vi.fn(),
        };
        const { state, submit } = useObjectForm({ props, formContext, instanceObject });
        await submit();
        await flushPromises();
        expect(formContext.setAllTouched).toHaveBeenCalled();
        expect(instanceObject.create).toHaveBeenCalledWith({ object: { name: "test" } });
        expect(mockLoadingError.setLoading).toHaveBeenCalled();
        expect(mockLoadingError.clearLoading).toHaveBeenCalled();
        expect(state.submitErrored).toBe(false);
        expect(routerPush).toHaveBeenCalled();
    });

    scopedIt("submit ingests custom server feedback errors from adapter overrides", async () => {
        class CustomServerFeedbackError extends ServerFeedbackError {
            constructor() {
                super("Custom validation failed", { errors: { name: ["Use a different name."] } });
                this.name = "CustomServerFeedbackError";
            }
        }

        const props = reactive({
            app: "app",
            model: "model",
            verboseName: "model",
            redirectAfter: "list",
            firstErrorField: "name",
        });
        const formContext = {
            state: reactive({
                anyModified: true,
                anyError: false,
                submittingValues: { name: "test" },
                errors: {},
                anyIgnored: false,
                ignored: {},
            }),
            setAllTouched: vi.fn(),
            handleServerFormValidationError: vi.fn((error) => {
                for (const [name, message] of Object.entries(error.errors)) {
                    formContext.state.errors[name] = { server: message };
                }
            }),
        };
        const error = new CustomServerFeedbackError();
        const instanceObject = {
            state: reactive({
                pkKey: "id",
                pk: "",
                object: {},
                errored: false,
                error: null,
            }),
            create: vi.fn(() => {
                instanceObject.state.errored = true;
                instanceObject.state.error = error;
                return Promise.resolve();
            }),
            update: vi.fn().mockResolvedValue(),
            clearError: vi.fn(() => {
                instanceObject.state.errored = false;
                instanceObject.state.error = null;
            }),
        };
        const { state, submit } = useObjectForm({ props, formContext, instanceObject });

        await submit();
        await flushPromises();

        expect(formContext.handleServerFormValidationError).toHaveBeenCalledWith(error);
        expect(formContext.state.errors).toEqual({ name: { server: ["Use a different name."] } });
        expect(toastMock.warning).toHaveBeenCalledWith("Save Validation Failed", {
            description: "Please review the new error displayed. You have been scrolled to the first error.",
            duration: 15000,
        });
        expect(instanceObject.clearError).toHaveBeenCalled();
        expect(state.submitErrored).toBe(true);
        expect(routerPush).not.toHaveBeenCalled();
        // A recognized, ingested error must not also become the form's generic visible error.
        expect(mockLoadingError.setError).not.toHaveBeenCalled();
    });

    scopedIt(
        "submit surfaces an error the submission hook does not recognize (e.g. a 403) as the form's visible error",
        async () => {
            class PermissionDeniedError extends Error {
                constructor() {
                    super("Failed to update object: 403 Forbidden");
                    this.name = "FetchError";
                    this.responseData = { detail: "You do not have permission to perform this action." };
                }
            }

            const props = reactive({
                app: "app",
                model: "model",
                verboseName: "model",
                redirectAfter: "list",
                firstErrorField: "name",
            });
            const formContext = {
                state: reactive({
                    anyModified: true,
                    anyError: false,
                    submittingValues: { name: "test" },
                    errors: {},
                    anyIgnored: false,
                    ignored: {},
                }),
                setAllTouched: vi.fn(),
                handleServerFormValidationError: vi.fn(),
            };
            const error = new PermissionDeniedError();
            const instanceObject = {
                state: reactive({
                    pkKey: "id",
                    pk: "7",
                    object: { id: "7" },
                    errored: false,
                    error: null,
                }),
                create: vi.fn().mockResolvedValue(),
                update: vi.fn(() => {
                    instanceObject.state.errored = true;
                    instanceObject.state.error = error;
                    return Promise.resolve();
                }),
                clearError: vi.fn(() => {
                    instanceObject.state.errored = false;
                    instanceObject.state.error = null;
                }),
            };
            const { state, submit } = useObjectForm({ props, formContext, instanceObject });

            await submit();
            await flushPromises();

            // Not a recognized form error: the default hook leaves it unhandled.
            expect(formContext.handleServerFormValidationError).not.toHaveBeenCalled();
            expect(toastMock.warning).not.toHaveBeenCalled();
            // Retains the submit instance's clean slate for the next attempt...
            expect(instanceObject.clearError).toHaveBeenCalled();
            // ...but the failure still reaches the form's own visible error state.
            expect(mockLoadingError.setError).toHaveBeenCalledWith(error);
            expect(state.submitErrored).toBe(true);
            expect(routerPush).not.toHaveBeenCalled();
        },
    );

    const buildConfirmationScenario = () => {
        const props = reactive({
            app: "app",
            model: "model",
            verboseName: "model",
            redirectAfter: "list",
            firstErrorField: "name",
        });
        const formContext = {
            state: reactive({
                anyModified: true,
                anyError: false,
                submittingValues: { name: "test" },
                errors: {},
                anyIgnored: false,
                ignored: {},
            }),
            setAllTouched: vi.fn(),
            handleServerFormValidationError: vi.fn(),
            clearServerErrors: vi.fn(),
        };
        const confirmationError = new ConfirmationRequiredError(
            { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } },
            {},
        );
        const instanceObject = {
            state: reactive({ pkKey: "id", pk: "", object: {}, errored: false, error: null }),
            create: vi.fn(({ acknowledgeWarnings }) => {
                if (acknowledgeWarnings) {
                    instanceObject.state.errored = false;
                    instanceObject.state.error = null;
                } else {
                    instanceObject.state.errored = true;
                    instanceObject.state.error = confirmationError;
                }
                return Promise.resolve();
            }),
            update: vi.fn().mockResolvedValue(),
            clearError: vi.fn(() => {
                instanceObject.state.errored = false;
                instanceObject.state.error = null;
            }),
        };
        return { props, formContext, instanceObject, confirmationError };
    };

    scopedIt("submit opens confirmation on 409 and retries with the digest when confirmed", async () => {
        const { props, formContext, instanceObject } = buildConfirmationScenario();
        const objectForm = useObjectForm({ props, formContext, instanceObject });
        objectForm.confirmation.register();

        const submitPromise = objectForm.submit();
        await flushPromises();

        // Warnings surfaced and the dialog is open, awaiting the user.
        expect(formContext.handleServerFormValidationError).toHaveBeenCalled();
        expect(objectForm.confirmation.open).toBe(true);
        expect(objectForm.confirmation.messages).toEqual({ count: ["unusual"] });
        expect(objectForm.confirmation.bulk).toBe(false);
        expect(instanceObject.create).toHaveBeenCalledTimes(1);

        objectForm.confirmation.confirm();
        await flushPromises();
        await submitPromise;

        // Retried once, acknowledging the warnings, then succeeded.
        expect(instanceObject.create).toHaveBeenCalledTimes(2);
        expect(instanceObject.create).toHaveBeenLastCalledWith({ object: { name: "test" }, acknowledgeWarnings: "d1" });
        expect(objectForm.confirmation.open).toBe(false);
        expect(objectForm.state.submitErrored).toBe(false);
        expect(routerPush).toHaveBeenCalled();
        // The warnings already rendered into the form via the confirmation dialog; no duplicate
        // generic error should also appear.
        expect(mockLoadingError.setError).not.toHaveBeenCalled();
    });

    scopedIt("submit leaves the form unsaved when confirmation is cancelled", async () => {
        const { props, formContext, instanceObject } = buildConfirmationScenario();
        const objectForm = useObjectForm({ props, formContext, instanceObject });
        objectForm.confirmation.register();

        const submitPromise = objectForm.submit();
        await flushPromises();
        expect(objectForm.confirmation.open).toBe(true);

        objectForm.confirmation.cancel();
        await flushPromises();
        await submitPromise;

        // No retry, no success redirect, form marked as not saved.
        expect(instanceObject.create).toHaveBeenCalledTimes(1);
        expect(objectForm.confirmation.open).toBe(false);
        expect(objectForm.state.submitErrored).toBe(true);
        expect(routerPush).not.toHaveBeenCalled();
        // The warnings stay visible in the dialog/form; no duplicate generic error should appear.
        expect(mockLoadingError.setError).not.toHaveBeenCalled();
    });

    scopedIt("fails closed when a 409 arrives with no confirmation consumer registered", async () => {
        const { props, formContext, instanceObject } = buildConfirmationScenario();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const objectForm = useObjectForm({ props, formContext, instanceObject });

        // Settles instead of wedging: treated as a cancel, with a console pointer at the missing dialog.
        await objectForm.submit();
        await flushPromises();

        expect(instanceObject.create).toHaveBeenCalledTimes(1);
        expect(objectForm.confirmation.open).toBe(false);
        expect(objectForm.state.submitErrored).toBe(true);
        expect(mockLoadingError.clearLoading).toHaveBeenCalled();
        expect(routerPush).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("FormConfirmDialog");
        // The warnings still render on the form, and the set is recorded for the next round's clearing.
        expect(formContext.handleServerFormValidationError).toHaveBeenCalled();
        expect(objectForm.confirmation.messages).toEqual({ count: ["unusual"] });
        // No duplicate generic error alongside the warnings already rendered on the form.
        expect(mockLoadingError.setError).not.toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    scopedIt("fails closed again once the last consumer unregisters", async () => {
        const { props, formContext, instanceObject } = buildConfirmationScenario();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const objectForm = useObjectForm({ props, formContext, instanceObject });
        objectForm.confirmation.register();
        objectForm.confirmation.unregister();

        await objectForm.submit();
        await flushPromises();

        expect(objectForm.confirmation.open).toBe(false);
        expect(objectForm.state.submitErrored).toBe(true);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        // Same "fails closed" treatment as above: no duplicate generic error.
        expect(mockLoadingError.setError).not.toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    scopedIt("does not enter the confirmation loop when a 409 carries no digest", async () => {
        const { props, formContext } = buildConfirmationScenario();
        const noDigestError = new ConfirmationRequiredError(
            { confirmation_required: true, warnings: { count: ["unusual"] } },
            {},
        );
        const instanceObject = {
            state: reactive({ pkKey: "id", pk: "", object: {}, errored: false, error: null }),
            create: vi.fn(() => {
                instanceObject.state.errored = true;
                instanceObject.state.error = noDigestError;
                return Promise.resolve();
            }),
            update: vi.fn().mockResolvedValue(),
            clearError: vi.fn(),
        };
        const objectForm = useObjectForm({ props, formContext, instanceObject });

        await objectForm.submit();
        await flushPromises();

        // Falls through to the error path instead of prompting/retrying forever.
        expect(instanceObject.create).toHaveBeenCalledTimes(1);
        expect(objectForm.confirmation.open).toBe(false);
        expect(objectForm.state.submitErrored).toBe(true);
        expect(formContext.handleServerFormValidationError).not.toHaveBeenCalled();
        expect(routerPush).not.toHaveBeenCalled();
        // No dialog and no field messages render for this fallthrough case, so it must reach the
        // form's generic visible error like any other unhandled submission failure.
        expect(mockLoadingError.setError).toHaveBeenCalledWith(noDigestError);
    });

    scopedIt("clears the previous round's warnings when a re-prompt carries a changed set", async () => {
        const { props, formContext } = buildConfirmationScenario();
        const round1 = new ConfirmationRequiredError(
            { confirmation_required: true, digest: "d1", warnings: { count: ["round one"] } },
            {},
        );
        const round2 = new ConfirmationRequiredError(
            { confirmation_required: true, digest: "d2", warnings: { name: ["round two"] } },
            {},
        );
        const instanceObject = {
            state: reactive({ pkKey: "id", pk: "", object: {}, errored: false, error: null }),
            create: vi.fn(({ acknowledgeWarnings }) => {
                if (acknowledgeWarnings === "d1") {
                    instanceObject.state.errored = true;
                    instanceObject.state.error = round2;
                } else if (acknowledgeWarnings === "d2") {
                    instanceObject.state.errored = false;
                    instanceObject.state.error = null;
                } else {
                    instanceObject.state.errored = true;
                    instanceObject.state.error = round1;
                }
                return Promise.resolve();
            }),
            update: vi.fn().mockResolvedValue(),
            clearError: vi.fn(() => {
                instanceObject.state.errored = false;
                instanceObject.state.error = null;
            }),
        };
        const objectForm = useObjectForm({ props, formContext, instanceObject });
        objectForm.confirmation.register();

        const submitPromise = objectForm.submit();
        await flushPromises();
        expect(objectForm.confirmation.messages).toEqual({ count: ["round one"] });

        objectForm.confirmation.confirm();
        await flushPromises();
        // Re-prompted with the new set; the previous round's field was cleared first.
        expect(formContext.clearServerErrors).toHaveBeenCalledWith("count");
        expect(objectForm.confirmation.messages).toEqual({ name: ["round two"] });

        objectForm.confirmation.confirm();
        await flushPromises();
        await submitPromise;

        expect(instanceObject.create).toHaveBeenCalledTimes(3);
        expect(routerPush).toHaveBeenCalled();
        // Both rounds of warnings rendered into the form; no duplicate generic error alongside them.
        expect(mockLoadingError.setError).not.toHaveBeenCalled();
    });
});
