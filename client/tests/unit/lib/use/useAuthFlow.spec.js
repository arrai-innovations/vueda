import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { reactive } from "vue";

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
let routeQuery = {};
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ fullPath: "/current", query: routeQuery }),
}));

const UnauthorizedError = class extends Error {};
const storeState = reactive({ pendingFlow: null });
vi.mock("@vueda/stores/storeUser.js", () => ({
    UnauthorizedError,
    storeUser: () => storeState,
}));

const formContext = { state: { values: {} } };
vi.mock("@vueda/use/useForm.js", () => ({ useForm: () => formContext }));

const defaultOnSubmissionError = vi.fn(async () => false);
vi.mock("@vueda/use/useObjectForm.js", () => ({ defaultOnSubmissionError }));

describe("lib/use/useAuthFlow.js", () => {
    let useAuthFlow;

    beforeEach(async () => {
        ({ useAuthFlow } = await import("@vueda/use/useAuthFlow.js"));
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        defaultOnSubmissionError.mockClear();
        storeState.pendingFlow = null;
        routeQuery = {};
    });

    scopedIt("returns formContext, onSubmissionErrorHandler, and redirectTo", () => {
        const result = useAuthFlow({ formProps: {} });
        expect(result.formContext).toBe(formContext);
        expect(typeof result.onSubmissionErrorHandler).toBe("function");
        expect(typeof result.redirectTo).toBe("function");
    });

    describe("redirectTo", () => {
        scopedIt("pushes returnPath when present in query", async () => {
            routeQuery = { returnPath: "/back" };
            const { redirectTo } = useAuthFlow({ formProps: {} });
            await redirectTo();
            expect(routerPush).toHaveBeenCalledWith("/back");
        });

        scopedIt("is a no-op when no returnPath in query", async () => {
            const { redirectTo } = useAuthFlow({ formProps: {} });
            await redirectTo();
            expect(routerPush).not.toHaveBeenCalled();
        });
    });

    describe("onSubmissionErrorHandler", () => {
        scopedIt("handles UnauthorizedError by redirecting to reauthenticate", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            const result = await onSubmissionErrorHandler({
                error: new UnauthorizedError("nope"),
                formContext: {},
                toast: toastMock,
            });
            expect(result).toBe(true);
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
            expect(toastMock.warning).toHaveBeenCalledWith(expect.stringContaining("verify"), expect.any(Object));
        });

        scopedIt("falls back to defaultOnSubmissionError for other errors", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            const error = new Error("bad");
            await onSubmissionErrorHandler({ error, formContext: {}, toast: toastMock });
            expect(defaultOnSubmissionError).toHaveBeenCalledWith({ error, formContext: {}, toast: toastMock });
        });
    });

    describe("pendingFlow watch", () => {
        scopedIt("redirects to reauthenticate on mfa_reauthenticate flow", async () => {
            useAuthFlow({ formProps: {} });
            storeState.pendingFlow = { id: "mfa_reauthenticate" };
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
        });

        scopedIt("redirects to reauthenticate on reauthenticate flow", async () => {
            useAuthFlow({ formProps: {} });
            storeState.pendingFlow = { id: "reauthenticate" };
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
        });

        scopedIt("ignores unrelated pending flow ids", async () => {
            useAuthFlow({ formProps: {} });
            storeState.pendingFlow = { id: "some_other_flow" };
            await flushPromises();
            expect(routerPush).not.toHaveBeenCalled();
        });
    });
});
