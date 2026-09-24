import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useActionForm } from "@vueda/use/useActionForm.js";
import { ConfirmationRequiredError, ServerFeedbackError } from "@vueda/utils/errors.js";
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
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));

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

    const makeConfirmationError = (digest = "d1", warnings = { count: ["unusual"] }, bulk = false) =>
        new ConfirmationRequiredError({ confirmation_required: true, digest, warnings }, {}, { bulk });

    // runAction that 409s until the digest is acknowledged, then succeeds.
    const makeGatedRunAction = (error) =>
        vi.fn(({ acknowledgeWarnings }) =>
            acknowledgeWarnings === error.digest ? Promise.resolve("ok") : Promise.reject(error),
        );

    scopedIt("ingests custom server feedback errors from action handlers", async () => {
        class CustomServerFeedbackError extends ServerFeedbackError {
            constructor() {
                super("Custom validation failed", { errors: { name: ["Use a different name."] } });
                this.name = "CustomServerFeedbackError";
            }
        }

        const formContext = createFormContext();
        formContext.handleServerFormValidationError.mockImplementation((error) => {
            for (const [name, message] of Object.entries(error.errors)) {
                formContext.state.errors[name] = { server: message };
            }
        });
        const error = new CustomServerFeedbackError();
        const runAction = vi.fn(() => Promise.reject(error));
        const props = reactive({ runAction });
        const actionForm = await withSetup(() => useActionForm(formContext, props));

        await actionForm.handleConfirm();
        await flushPromises();

        expect(formContext.handleServerFormValidationError).toHaveBeenCalledWith(error);
        expect(formContext.state.errors).toEqual({ name: { server: ["Use a different name."] } });
        expect(actionForm.combinedError.value).toBe(null);
        expect(actionForm.combinedErrored.value).toBe(false);
        expect(toastMock.error).not.toHaveBeenCalled();
    });

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
            expect(actionForm.confirmation.bulk).toBe(false);
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
            // The success redirect navigated away, so the form stays locked until it unmounts.
            expect(actionForm.combinedLoading.value).toBe(true);
        });

        scopedIt(
            "carries bulk:true from a custom bulk run-action's response even when it targets one object",
            async () => {
                const formContext = createFormContext();
                // Mirrors a custom bulk runner (e.g. a workflow-transition action) that always issues
                // a bulk request and gets back the per-object warnings shape, even for one target.
                const error = makeConfirmationError("d1", { 9: { count: ["unusual"] } }, true);
                const runAction = makeGatedRunAction(error);
                const props = reactive({ runAction });
                const actionForm = await withSetup(() => useActionForm(formContext, props));
                actionForm.confirmation.register();

                const submitPromise = actionForm.handleConfirm();
                await flushPromises();

                expect(actionForm.confirmation.messages).toEqual({ 9: { count: ["unusual"] } });
                expect(actionForm.confirmation.bulk).toBe(true);

                actionForm.confirmation.cancel();
                await submitPromise;
            },
        );

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
            expect(formContext.handleServerFormValidationError).not.toHaveBeenCalled();
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
                if (acknowledgeWarnings === "d2") {
                    return Promise.resolve("ok");
                }
                if (acknowledgeWarnings === "d1") {
                    return Promise.reject(round2);
                }
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

    describe("Dry-run pre-flight latching", () => {
        scopedIt("fires once per dryRunTarget and does not refire while readyToDryRun merely toggles", async () => {
            const formContext = createFormContext();
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const props = reactive({ runAction, readyToDryRun: false, dryRunTarget: "4" });
            await withSetup(() => useActionForm(formContext, props));
            await flushPromises();
            expect(runAction).not.toHaveBeenCalled();

            props.readyToDryRun = true;
            await flushPromises();
            expect(runAction).toHaveBeenCalledTimes(1);
            expect(runAction).toHaveBeenLastCalledWith(expect.objectContaining({ dryRun: true }));

            // The dry run itself can toggle readiness off and back on for the same target (e.g. an
            // action-instance loading flip); the latch must not mistake that for a new target.
            props.readyToDryRun = false;
            await flushPromises();
            props.readyToDryRun = true;
            await flushPromises();
            expect(runAction).toHaveBeenCalledTimes(1);
        });

        scopedIt("fires again when dryRunTarget changes while readyToDryRun stays true", async () => {
            const formContext = createFormContext();
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const props = reactive({ runAction, readyToDryRun: true, dryRunTarget: "4" });
            await withSetup(() => useActionForm(formContext, props));
            await flushPromises();
            expect(runAction).toHaveBeenCalledTimes(1);

            props.dryRunTarget = "9";
            await flushPromises();
            expect(runAction).toHaveBeenCalledTimes(2);
        });

        scopedIt("fires at most once, ever, when the caller supplies no dryRunTarget", async () => {
            const formContext = createFormContext();
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const props = reactive({ runAction, readyToDryRun: true });
            await withSetup(() => useActionForm(formContext, props));
            await flushPromises();
            expect(runAction).toHaveBeenCalledTimes(1);

            props.readyToDryRun = false;
            await flushPromises();
            props.readyToDryRun = true;
            await flushPromises();
            expect(runAction).toHaveBeenCalledTimes(1);
        });
    });

    scopedIt("ignores an old completion while the new target's action is still pending", async () => {
        const resolvers = [];
        const promises = [];
        const runAction = vi.fn(() => {
            const promise = new Promise((resolve) => {
                resolvers.push(resolve);
            });
            promise.cancel = vi.fn();
            promises.push(promise);
            return promise;
        });
        // Reports no navigation, so the form unlocks once the current target's action settles.
        const redirectTo = vi.fn(async () => false);
        const props = reactive({ runAction, redirectTo, dryRunTarget: "first" });
        const actionForm = await withSetup(() => useActionForm(createFormContext(), props));
        const first = actionForm.handleConfirm();
        props.dryRunTarget = "second";
        await flushPromises();
        const second = actionForm.handleConfirm();
        resolvers[0](false);
        await first;
        expect(promises[0].cancel).toHaveBeenCalled();
        expect(redirectTo).not.toHaveBeenCalled();
        expect(actionForm.combinedLoading.value).toBe(true);
        resolvers[1]({});
        await second;
        expect(redirectTo).toHaveBeenCalledTimes(1);
        expect(actionForm.combinedLoading.value).toBe(false);
    });

    scopedIt("closes old warning confirmation without retrying against the new target", async () => {
        const runAction = makeGatedRunAction(makeConfirmationError());
        const props = reactive({ runAction, dryRunTarget: "first" });
        const actionForm = await withSetup(() => useActionForm(createFormContext(), props));
        actionForm.confirmation.register();
        const first = actionForm.handleConfirm();
        await flushPromises();
        expect(actionForm.confirmation.open).toBe(true);
        props.dryRunTarget = "second";
        await flushPromises();
        await first;
        expect(actionForm.confirmation.open).toBe(false);
        expect(runAction).toHaveBeenCalledTimes(1);
        expect(toastMock.success).not.toHaveBeenCalled();
    });

    describe("Success redirect lock", () => {
        // The router keeps the submitting view mounted until the destination is ready, so a redirect
        // that resolves leaves the form on screen for a while.
        const setupRedirecting = async (redirectResult) => {
            const formContext = createFormContext();
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const redirectTo = vi.fn(async (reason) => (reason === "success" ? redirectResult : undefined));
            const props = reactive({ runAction, redirectTo, dryRunTarget: "first" });
            const actionForm = await withSetup(() => useActionForm(formContext, props));
            return { formContext, runAction, redirectTo, props, actionForm };
        };

        scopedIt("stays locked after a success redirect navigates away while the form stays mounted", async () => {
            const { runAction, redirectTo, actionForm } = await setupRedirecting(undefined);

            await actionForm.handleConfirm();

            expect(redirectTo).toHaveBeenCalledWith("success");
            expect(actionForm.combinedLoading.value).toBe(true);
            expect(actionForm.confirmDisabled.value).toBe(true);
            expect(actionForm.cancelDisabled.value).toBe(true);

            await actionForm.handleConfirm();
            await actionForm.handleCancelClick();

            expect(runAction).toHaveBeenCalledTimes(1);
            expect(redirectTo).toHaveBeenCalledTimes(1);
        });

        scopedIt("unlocks when the success redirect resolves false", async () => {
            const { runAction, actionForm } = await setupRedirecting(false);

            await actionForm.handleConfirm();

            expect(actionForm.combinedLoading.value).toBe(false);
            expect(actionForm.confirmDisabled.value).toBe(false);
            expect(actionForm.cancelDisabled.value).toBe(false);

            await actionForm.handleConfirm();
            expect(runAction).toHaveBeenCalledTimes(2);
        });

        scopedIt("unlocks when the target changes after the redirect", async () => {
            const { runAction, props, actionForm } = await setupRedirecting(true);

            await actionForm.handleConfirm();
            expect(actionForm.combinedLoading.value).toBe(true);

            props.dryRunTarget = "second";
            await flushPromises();

            expect(actionForm.combinedLoading.value).toBe(false);
            await actionForm.handleConfirm();
            expect(runAction).toHaveBeenCalledTimes(2);
        });

        scopedIt("keeps a form with a custom success handler submittable", async () => {
            const runAction = vi.fn(() => Promise.resolve("ok"));
            const redirectTo = vi.fn();
            const onSubmissionSuccessHandler = vi.fn();
            const props = reactive({ runAction, redirectTo, onSubmissionSuccessHandler });
            const actionForm = await withSetup(() => useActionForm(createFormContext(), props));

            await actionForm.handleConfirm();
            expect(actionForm.combinedLoading.value).toBe(false);
            await actionForm.handleConfirm();

            expect(onSubmissionSuccessHandler).toHaveBeenCalledTimes(2);
            expect(runAction).toHaveBeenCalledTimes(2);
            expect(redirectTo).not.toHaveBeenCalled();
        });

        scopedIt("keeps the form submittable after a failed submit", async () => {
            const runAction = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
            const redirectTo = vi.fn();
            const props = reactive({ runAction, redirectTo });
            const actionForm = await withSetup(() => useActionForm(createFormContext(), props));

            await actionForm.handleConfirm();
            expect(actionForm.combinedLoading.value).toBe(false);
            expect(actionForm.confirmDisabled.value).toBe(false);
            await actionForm.handleConfirm();

            expect(runAction).toHaveBeenCalledTimes(2);
            expect(redirectTo).toHaveBeenCalledWith("success");
        });
    });

    describe("Re-entry", () => {
        scopedIt("ignores confirm and cancel while an action is in flight", async () => {
            let settle;
            const runAction = vi.fn(() => new Promise((resolve) => (settle = resolve)));
            const redirectTo = vi.fn(async () => false);
            const props = reactive({ runAction, redirectTo });
            const actionForm = await withSetup(() => useActionForm(createFormContext(), props));

            const first = actionForm.handleConfirm();
            await actionForm.handleConfirm();
            await actionForm.handleCancelClick();

            expect(runAction).toHaveBeenCalledTimes(1);
            expect(redirectTo).not.toHaveBeenCalled();

            settle("ok");
            await first;
            expect(redirectTo).toHaveBeenCalledTimes(1);
            expect(redirectTo).toHaveBeenCalledWith("success");
        });

        scopedIt("disables confirm while the form has errors, but not cancel", async () => {
            const formContext = createFormContext();
            formContext.state.anyError = true;
            const actionForm = await withSetup(() => useActionForm(formContext, reactive({ runAction: vi.fn() })));

            expect(actionForm.confirmDisabled.value).toBe(true);
            expect(actionForm.cancelDisabled.value).toBe(false);
        });
    });

    describe("Teardown", () => {
        scopedIt("ignores a run that settles after the shell tore down", async () => {
            const formContext = createFormContext();
            let settleRun;
            const runPromise = new Promise((resolve) => {
                settleRun = resolve;
            });
            runPromise.cancel = vi.fn();
            const runAction = vi.fn(() => runPromise);
            const redirectTo = vi.fn();
            const props = reactive({ runAction, redirectTo });
            let actionForm;
            const wrapper = mount({
                setup() {
                    actionForm = useActionForm(formContext, props);
                    return () => null;
                },
            });

            const submitPromise = actionForm.handleConfirm();
            await flushPromises();
            wrapper.unmount();
            // reactive-helpers resolves a cancelled run rather than rejecting it (`false`, or `null`
            // for executeAction, with no stored error), so the outcome alone cannot tell the two
            // apart and an unguarded teardown would toast success on its way out.
            settleRun(false);
            await submitPromise;

            expect(runPromise.cancel).toHaveBeenCalled();
            expect(toastMock.success).not.toHaveBeenCalled();
            expect(redirectTo).not.toHaveBeenCalled();
        });
    });
});
