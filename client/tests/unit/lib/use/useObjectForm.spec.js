import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { reactive, ref } from "vue";

const mockUseLeaveUnload = vi.fn();
vi.mock("@vueda/use/useLeaveUnload.js", () => ({
    useLeaveUnload: mockUseLeaveUnload,
}));

const toastAdd = vi.fn();
vi.mock("primevue/usetoast", () => ({
    useToast: () => ({ add: toastAdd }),
}));

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
        const result = await defaultOnSubmitNotAnyModified({ toast: { add: toastAdd } });
        expect(result).toBe(true);
        expect(toastAdd).toHaveBeenCalledWith({
            severity: "info",
            summary: "No Changes Detected",
            detail: "Please modify the fields before submitting.",
            life: 15000,
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
        const result = await defaultOnSubmitAnyError({ state, formContext, toast: { add: toastAdd } });
        expect(result).toBe(false);
        expect(toastAdd).not.toHaveBeenCalled();
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
            toast: { add: toastAdd },
            router: { push: routerPush },
        });
        expect(toastAdd).toHaveBeenCalled();
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
});
