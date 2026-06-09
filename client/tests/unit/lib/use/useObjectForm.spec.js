import { scopedIt } from "@tests/unit/utils.js";
import { ConfirmationRequiredError } from "@vueda/utils/errors.js";
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
vi.mock("vue-sonner", () => ({ toast: toastMock }));

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

        const submitPromise = objectForm.submit();
        await flushPromises();

        // Warnings surfaced and the dialog is open, awaiting the user.
        expect(formContext.handleServerFormValidationError).toHaveBeenCalled();
        expect(objectForm.confirmation.open).toBe(true);
        expect(objectForm.confirmation.messages).toEqual({ count: ["unusual"] });
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
    });

    scopedIt("submit leaves the form unsaved when confirmation is cancelled", async () => {
        const { props, formContext, instanceObject } = buildConfirmationScenario();
        const objectForm = useObjectForm({ props, formContext, instanceObject });

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
        expect(routerPush).not.toHaveBeenCalled();
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
    });
});
