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
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));

const routerPush = vi.fn(async () => undefined);
let routeQuery = {};
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ fullPath: "/current", query: routeQuery }),
}));

const UnauthorizedError = class extends Error {};
const storeState = reactive({ authPendingFlow: null, loggedIn: true });
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
        storeState.authPendingFlow = null;
        storeState.loggedIn = true;
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
            expect(await redirectTo()).toBe(true);
            expect(routerPush).toHaveBeenCalledWith("/back");
        });

        scopedIt("resolves false when the router reports a navigation failure", async () => {
            routeQuery = { returnPath: "/back" };
            routerPush.mockResolvedValueOnce(new Error("Navigation aborted"));
            const { redirectTo } = useAuthFlow({ formProps: {} });
            expect(await redirectTo()).toBe(false);
        });

        scopedIt("pushes the redirect option when no returnPath in query", async () => {
            const { redirectTo } = useAuthFlow({ formProps: {}, redirect: "/done" });
            expect(await redirectTo()).toBe(true);
            expect(routerPush).toHaveBeenCalledWith("/done");
        });

        scopedIt("prefers returnPath over the redirect option", async () => {
            routeQuery = { returnPath: "/back" };
            const { redirectTo } = useAuthFlow({ formProps: {}, redirect: "/done" });
            expect(await redirectTo()).toBe(true);
            expect(routerPush).toHaveBeenCalledWith("/back");
        });

        scopedIt("resolves false without navigating when no returnPath in query", async () => {
            const { redirectTo } = useAuthFlow({ formProps: {} });
            expect(await redirectTo()).toBe(false);
            expect(routerPush).not.toHaveBeenCalled();
        });
    });

    describe("onSubmissionErrorHandler", () => {
        // The store refetches the current user before it rejects with an UnauthorizedError, so the handler runs
        // with the refetched state.
        scopedIt("reuses the redirect that the watch already completed", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            storeState.authPendingFlow = "reauthenticate";
            await flushPromises();
            const result = await onSubmissionErrorHandler({
                error: new UnauthorizedError("nope"),
                formContext: {},
                toast: toastMock,
            });
            expect(result).toBe(true);
            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
            expect(toastMock.warning).toHaveBeenCalledTimes(1);
            expect(defaultOnSubmissionError).not.toHaveBeenCalled();
        });

        scopedIt("redirects once when the handler runs before the watch", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            storeState.authPendingFlow = "reauthenticate";
            const result = await onSubmissionErrorHandler({
                error: new UnauthorizedError("nope"),
                formContext: {},
                toast: toastMock,
            });
            await flushPromises();
            expect(result).toBe(true);
            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(toastMock.warning).toHaveBeenCalledTimes(1);
        });

        scopedIt("retries the redirect when an earlier redirect for the same flow failed", async () => {
            routerPush.mockResolvedValueOnce(new Error("Navigation aborted"));
            storeState.authPendingFlow = "reauthenticate";
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            await flushPromises();
            expect(routerPush).toHaveBeenCalledTimes(1);
            const result = await onSubmissionErrorHandler({
                error: new UnauthorizedError("nope"),
                formContext: {},
                toast: toastMock,
            });
            expect(result).toBe(true);
            expect(routerPush).toHaveBeenCalledTimes(2);
            expect(routerPush).toHaveBeenLastCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
            expect(defaultOnSubmissionError).not.toHaveBeenCalled();
        });

        scopedIt("retries the redirect when an earlier push for the same flow rejected", async () => {
            routerPush.mockResolvedValueOnce(new Error("Navigation aborted"));
            storeState.authPendingFlow = "reauthenticate";
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            await flushPromises();
            routerPush.mockRejectedValueOnce(new Error("Failed to load the route component"));
            await expect(
                onSubmissionErrorHandler({ error: new UnauthorizedError("nope"), formContext: {}, toast: toastMock }),
            ).rejects.toThrow("Failed to load the route component");
            const result = await onSubmissionErrorHandler({
                error: new UnauthorizedError("nope"),
                formContext: {},
                toast: toastMock,
            });
            expect(result).toBe(true);
            expect(routerPush).toHaveBeenCalledTimes(3);
        });

        scopedIt("passes the error to defaultOnSubmissionError when the redirect fails", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            routerPush.mockResolvedValueOnce(new Error("Navigation aborted"));
            storeState.authPendingFlow = "reauthenticate";
            const error = new UnauthorizedError("nope");
            const result = await onSubmissionErrorHandler({ error, formContext: {}, toast: toastMock });
            expect(result).toBe(false);
            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(defaultOnSubmissionError).toHaveBeenCalledWith({ error, formContext: {}, toast: toastMock });
        });

        scopedIt("sends a signed-out user to sign-in", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            storeState.loggedIn = false;
            const result = await onSubmissionErrorHandler({
                error: new UnauthorizedError("nope"),
                formContext: {},
                toast: toastMock,
            });
            expect(result).toBe(true);
            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(routerPush).toHaveBeenCalledWith({ name: "sign-in", query: { redirect: "/current" } });
            expect(defaultOnSubmissionError).not.toHaveBeenCalled();
        });

        scopedIt("passes an UnauthorizedError that leaves no pending flow to defaultOnSubmissionError", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            const error = new UnauthorizedError("nope");
            await onSubmissionErrorHandler({ error, formContext: {}, toast: toastMock });
            expect(routerPush).not.toHaveBeenCalled();
            expect(defaultOnSubmissionError).toHaveBeenCalledWith({ error, formContext: {}, toast: toastMock });
        });

        scopedIt("falls back to defaultOnSubmissionError for other errors", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {} });
            const error = new Error("bad");
            await onSubmissionErrorHandler({ error, formContext: {}, toast: toastMock });
            expect(defaultOnSubmissionError).toHaveBeenCalledWith({ error, formContext: {}, toast: toastMock });
        });
    });

    describe("authPendingFlow watch", () => {
        scopedIt("redirects to reauthenticate on mfa_reauthenticate flow", async () => {
            useAuthFlow({ formProps: {} });
            storeState.authPendingFlow = "mfa_reauthenticate";
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
        });

        scopedIt("redirects to reauthenticate on reauthenticate flow", async () => {
            useAuthFlow({ formProps: {} });
            storeState.authPendingFlow = "reauthenticate";
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
        });

        scopedIt("redirects to reauthenticate when the flow is already pending at setup", async () => {
            storeState.authPendingFlow = "reauthenticate";
            useAuthFlow({ formProps: {} });
            await flushPromises();
            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
        });

        scopedIt("redirects again when a new reauthentication flow follows a cleared one", async () => {
            useAuthFlow({ formProps: {} });
            storeState.authPendingFlow = "reauthenticate";
            await flushPromises();
            storeState.authPendingFlow = null;
            await flushPromises();
            storeState.authPendingFlow = "mfa_reauthenticate";
            await flushPromises();
            expect(routerPush).toHaveBeenCalledTimes(2);
            expect(toastMock.warning).toHaveBeenCalledTimes(2);
        });

        scopedIt("ignores unrelated pending flow ids", async () => {
            useAuthFlow({ formProps: {} });
            storeState.authPendingFlow = "some_other_flow";
            await flushPromises();
            expect(routerPush).not.toHaveBeenCalled();
        });
    });

    describe("requireRecentAuth: false", () => {
        scopedIt("does not redirect when a reauthentication flow becomes pending", async () => {
            useAuthFlow({ formProps: {}, requireRecentAuth: false });
            storeState.authPendingFlow = "reauthenticate";
            await flushPromises();
            expect(routerPush).not.toHaveBeenCalled();
            expect(toastMock.warning).not.toHaveBeenCalled();
        });

        scopedIt("passes an UnauthorizedError to defaultOnSubmissionError", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {}, requireRecentAuth: false });
            storeState.authPendingFlow = "reauthenticate";
            await flushPromises();
            const error = new UnauthorizedError("nope");
            await onSubmissionErrorHandler({ error, formContext: {}, toast: toastMock });
            expect(routerPush).not.toHaveBeenCalled();
            expect(defaultOnSubmissionError).toHaveBeenCalledWith({ error, formContext: {}, toast: toastMock });
        });

        scopedIt("sends a signed-out user to sign-in", async () => {
            const { onSubmissionErrorHandler } = useAuthFlow({ formProps: {}, requireRecentAuth: false });
            storeState.loggedIn = false;
            const result = await onSubmissionErrorHandler({
                error: new UnauthorizedError("nope"),
                formContext: {},
                toast: toastMock,
            });
            expect(result).toBe(true);
            expect(routerPush).toHaveBeenCalledWith({ name: "sign-in", query: { redirect: "/current" } });
            expect(defaultOnSubmissionError).not.toHaveBeenCalled();
        });

        scopedIt("redirects to reauthenticate when requireRecentAuth turns true with a flow pending", async () => {
            const options = reactive({ formProps: {}, requireRecentAuth: false });
            useAuthFlow(options);
            storeState.authPendingFlow = "reauthenticate";
            await flushPromises();
            expect(routerPush).not.toHaveBeenCalled();
            options.requireRecentAuth = true;
            await flushPromises();
            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
        });
    });
});
