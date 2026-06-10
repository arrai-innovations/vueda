import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useActionForm } from "@vueda/use/useActionForm.js";
import { ConfirmationRequiredError } from "@vueda/utils/errors.js";
import flushPromises from "flush-promises";
import { reactive } from "vue";

const toastMock = vi.hoisted(() => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
}));
vi.mock("vue-sonner", () => ({ toast: toastMock }));

describe("lib/use/useActionForm.js", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createFormContext = () => ({
        state: reactive({
            anyModified: true,
            anyError: false,
            submittingValues: { name: "test" },
            errors: {},
        }),
        setAllTouched: vi.fn(),
        handleServerFormValidationError: vi.fn(),
        clearServerErrors: vi.fn(),
    });

    const makeConfirmationError = (digest = "d1", warnings = { count: ["unusual"] }) =>
        new ConfirmationRequiredError({ confirmation_required: true, digest, warnings }, {});

    // runAction that 409s until the digest is acknowledged, then succeeds.
    const makeGatedRunAction = (error) =>
        vi.fn(({ acknowledgeWarnings }) =>
            acknowledgeWarnings === error.digest ? Promise.resolve("ok") : Promise.reject(error),
        );

    describe("Warning confirmation", () => {
        scopedIt("opens confirmation on 409 and retries with the digest when confirmed", async () => {
            const formContext = createFormContext();
            const error = makeConfirmationError();
            const runAction = makeGatedRunAction(error);
            const redirectTo = vi.fn();
            const props = reactive({ runAction, redirectTo });
            const actionForm = await withSetup(() => useActionForm(formContext, props));
            actionForm.confirmation.register();

            const submitPromise = actionForm.handleConfirm();
            await flushPromises();

            // Warnings surfaced and the dialog is open, awaiting the user.
            expect(formContext.handleServerFormValidationError).toHaveBeenCalledWith(error);
            expect(actionForm.confirmation.open).toBe(true);
            expect(actionForm.confirmation.messages).toEqual({ count: ["unusual"] });
            expect(runAction).toHaveBeenCalledTimes(1);

            actionForm.confirmation.confirm();
            await submitPromise;

            // Retried once, acknowledging the warnings, then succeeded.
            expect(runAction).toHaveBeenCalledTimes(2);
            expect(runAction).toHaveBeenLastCalledWith({
                formValues: { name: "test" },
                dryRun: false,
                acknowledgeWarnings: "d1",
            });
            expect(actionForm.confirmation.open).toBe(false);
            expect(toastMock.success).toHaveBeenCalled();
            expect(redirectTo).toHaveBeenCalledWith("success");
            expect(actionForm.combinedErrored.value).toBe(false);
            expect(actionForm.combinedLoading.value).toBe(false);
        });

        scopedIt("settles without toast or redirect when confirmation is cancelled", async () => {
            const formContext = createFormContext();
            const error = makeConfirmationError();
            const runAction = makeGatedRunAction(error);
            const redirectTo = vi.fn();
            const props = reactive({ runAction, redirectTo });
            const actionForm = await withSetup(() => useActionForm(formContext, props));
            actionForm.confirmation.register();

            const submitPromise = actionForm.handleConfirm();
            await flushPromises();
            expect(actionForm.confirmation.open).toBe(true);

            actionForm.confirmation.cancel();
            await submitPromise;

            // No retry, no success or failure feedback; the warnings stay rendered on the form.
            expect(runAction).toHaveBeenCalledTimes(1);
            expect(actionForm.confirmation.open).toBe(false);
            expect(toastMock.success).not.toHaveBeenCalled();
            expect(toastMock.error).not.toHaveBeenCalled();
            expect(redirectTo).not.toHaveBeenCalled();
            expect(actionForm.combinedError.value).toBe(null);
            expect(actionForm.combinedErrored.value).toBe(false);
            expect(actionForm.combinedLoading.value).toBe(false);
        });

        scopedIt("fails closed when a 409 arrives with no confirmation consumer registered", async () => {
            const formContext = createFormContext();
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const error = makeConfirmationError();
            const runAction = makeGatedRunAction(error);
            const props = reactive({ runAction });
            const actionForm = await withSetup(() => useActionForm(formContext, props));

            // Settles instead of wedging: treated as a cancel, with a console pointer at the missing dialog.
            await actionForm.handleConfirm();
            await flushPromises();

            expect(runAction).toHaveBeenCalledTimes(1);
            expect(actionForm.confirmation.open).toBe(false);
            expect(actionForm.combinedLoading.value).toBe(false);
            expect(toastMock.error).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy.mock.calls[0][0]).toContain("FormConfirmDialog");
            // The warnings still render on the form, and the set is recorded for the next round's clearing.
            expect(formContext.handleServerFormValidationError).toHaveBeenCalledWith(error);
            expect(actionForm.confirmation.messages).toEqual({ count: ["unusual"] });
            warnSpy.mockRestore();
        });

        scopedIt("does not enter the confirmation loop when a 409 carries no digest", async () => {
            const formContext = createFormContext();
            const error = new ConfirmationRequiredError(
                { confirmation_required: true, warnings: { count: ["unusual"] } },
                {},
            );
            const runAction = vi.fn(() => Promise.reject(error));
            const props = reactive({ runAction });
            const actionForm = await withSetup(() => useActionForm(formContext, props));
            actionForm.confirmation.register();

            await actionForm.handleConfirm();
            await flushPromises();

            // Falls through to the error path instead of prompting/retrying forever.
            expect(runAction).toHaveBeenCalledTimes(1);
            expect(actionForm.confirmation.open).toBe(false);
            expect(actionForm.combinedError.value).toBe(error);
            expect(toastMock.error).toHaveBeenCalled();
        });

        scopedIt("silently ignores a 409 during the dry-run pre-flight", async () => {
            const formContext = createFormContext();
            const error = makeConfirmationError();
            const runAction = vi.fn(() => Promise.reject(error));
            const props = reactive({ runAction });
            const actionForm = await withSetup(() => useActionForm(formContext, props));
            actionForm.confirmation.register();

            await actionForm.handleConfirm(true);
            await flushPromises();

            // The pre-flight never prompts, renders, errors, or toasts.
            expect(runAction).toHaveBeenCalledTimes(1);
            expect(actionForm.confirmation.open).toBe(false);
            expect(formContext.handleServerFormValidationError).not.toHaveBeenCalled();
            expect(actionForm.combinedError.value).toBe(null);
            expect(toastMock.error).not.toHaveBeenCalled();
            expect(actionForm.combinedLoading.value).toBe(false);
        });

        scopedIt("re-prompts with a changed warning set instead of force-acknowledging it", async () => {
            const formContext = createFormContext();
            const round1 = makeConfirmationError("d1", { count: ["round one"] });
            const round2 = makeConfirmationError("d2", { name: ["round two"] });
            const runAction = vi.fn(({ acknowledgeWarnings }) => {
                if (acknowledgeWarnings === "d2") return Promise.resolve("ok");
                if (acknowledgeWarnings === "d1") return Promise.reject(round2);
                return Promise.reject(round1);
            });
            const props = reactive({ runAction });
            const actionForm = await withSetup(() => useActionForm(formContext, props));
            actionForm.confirmation.register();

            const submitPromise = actionForm.handleConfirm();
            await flushPromises();
            expect(actionForm.confirmation.messages).toEqual({ count: ["round one"] });

            actionForm.confirmation.confirm();
            await flushPromises();
            // Re-prompted with the new set; the previous round's field was cleared first.
            expect(formContext.clearServerErrors).toHaveBeenCalledWith("count");
            expect(actionForm.confirmation.messages).toEqual({ name: ["round two"] });

            actionForm.confirmation.confirm();
            await submitPromise;

            expect(runAction).toHaveBeenCalledTimes(3);
            expect(toastMock.success).toHaveBeenCalled();
        });

        scopedIt("uses a custom onSubmissionWarningsRequireConfirmation hook when provided", async () => {
            const formContext = createFormContext();
            const error = makeConfirmationError();
            const runAction = makeGatedRunAction(error);
            const onSubmissionWarningsRequireConfirmation = vi.fn(async () => true);
            const props = reactive({ runAction, onSubmissionWarningsRequireConfirmation });
            const actionForm = await withSetup(() => useActionForm(formContext, props));

            await actionForm.handleConfirm();
            await flushPromises();

            expect(onSubmissionWarningsRequireConfirmation).toHaveBeenCalledWith({
                error,
                formContext,
                confirmation: actionForm.confirmation,
                toast: toastMock,
            });
            // The default hook was bypassed; the custom hook confirmed, so the retry ran.
            expect(formContext.handleServerFormValidationError).not.toHaveBeenCalled();
            expect(runAction).toHaveBeenCalledTimes(2);
            expect(runAction).toHaveBeenLastCalledWith({
                formValues: { name: "test" },
                dryRun: false,
                acknowledgeWarnings: "d1",
            });
        });
    });
});
