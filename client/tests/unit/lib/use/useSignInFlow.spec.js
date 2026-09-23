import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { reactive, ref } from "vue";

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
let routeQuery = {};
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ query: routeQuery }),
}));

const isActiveRef = ref(false);
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => isActiveRef }));

const formContext = { state: { values: {} } };
vi.mock("@vueda/use/useForm.js", () => ({ useForm: () => formContext }));

const store = reactive({
    loggedIn: false,
    recentlyLoggedIn: false,
    pendingFlow: null,
});
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => store }));

describe("lib/use/useSignInFlow.js", () => {
    let useSignInFlow;

    beforeEach(async () => {
        ({ useSignInFlow } = await import("@vueda/use/useSignInFlow.js"));
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        Object.assign(store, { loggedIn: false, recentlyLoggedIn: false, pendingFlow: null });
        routeQuery = {};
        isActiveRef.value = false;
    });

    scopedIt("returns formContext from useForm", () => {
        const result = useSignInFlow({ formProps: {} });
        expect(result.formContext).toBe(formContext);
    });

    describe("post-login redirect", () => {
        scopedIt("redirects to redirect prop and shows toast", async () => {
            useSignInFlow({ redirect: { name: "dashboard" }, formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            store.recentlyLoggedIn = true;
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "dashboard" });
            expect(toastMock.success).toHaveBeenCalledWith("Signed In", expect.any(Object));
        });

        scopedIt("falls back to { name: 'welcome' } when no redirect prop", async () => {
            useSignInFlow({ formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "welcome" });
        });

        scopedIt("prefers route ?redirect query param over prop and skips toast", async () => {
            routeQuery = { redirect: "/home" };
            useSignInFlow({ redirect: "/dashboard", formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith("/home");
            expect(toastMock.success).not.toHaveBeenCalled();
        });

        scopedIt("reports a rejected navigation instead of announcing success", async () => {
            // The sign-in has already succeeded by here, so the form has nothing to say
            // about a redirect that does not happen. Unreported, the person reads "Signed
            // In" while the page stays on the sign-in form.
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            routerPush.mockRejectedValueOnce(new Error('No match for {"name":"welcome"}'));
            useSignInFlow({ formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            await flushPromises();
            expect(toastMock.success).not.toHaveBeenCalled();
            expect(toastMock.error).toHaveBeenCalledWith(
                "Signed in, but could not open the next page",
                expect.any(Object),
            );
            expect(consoleError).toHaveBeenCalled();
            consoleError.mockRestore();
        });

        scopedIt("reports a navigation that throws rather than rejects", async () => {
            // Vue Router resolves the destination inside push, so an unmatched route name
            // throws synchronously rather than rejecting. Both reach the same report.
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            routerPush.mockImplementationOnce(() => {
                throw new Error('No match for {"name":"welcome"}');
            });
            useSignInFlow({ formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            await flushPromises();
            expect(toastMock.success).not.toHaveBeenCalled();
            expect(toastMock.error).toHaveBeenCalled();
            consoleError.mockRestore();
        });

        scopedIt("reports a failed ?redirect navigation too", async () => {
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            routeQuery = { redirect: "/gone" };
            routerPush.mockRejectedValueOnce(new Error("No match for /gone"));
            useSignInFlow({ redirect: { name: "dashboard" }, formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith("/gone");
            expect(toastMock.error).toHaveBeenCalled();
            consoleError.mockRestore();
        });

        scopedIt("does not redirect when component is not active", async () => {
            useSignInFlow({ redirect: "/home", formProps: {} });
            isActiveRef.value = false;
            store.loggedIn = true;
            await flushPromises();
            expect(routerPush).not.toHaveBeenCalled();
        });
    });

    describe("requireRecentLogin", () => {
        scopedIt("blocks redirect until recentlyLoggedIn is true", async () => {
            useSignInFlow({ requireRecentLogin: true, redirect: { name: "welcome" }, formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            store.recentlyLoggedIn = false;
            await flushPromises();
            routerPush.mockClear();
            store.recentlyLoggedIn = true;
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "welcome" });
        });

        scopedIt("allows redirect when requireRecentLogin is false regardless of recentlyLoggedIn", async () => {
            useSignInFlow({ requireRecentLogin: false, redirect: { name: "welcome" }, formProps: {} });
            isActiveRef.value = true;
            store.loggedIn = true;
            store.recentlyLoggedIn = false;
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "welcome" });
        });
    });

    describe("MFA pending flow", () => {
        scopedIt("pushes to 2fa on mfa_authenticate pending flow", async () => {
            useSignInFlow({ formProps: {} });
            store.pendingFlow = { id: "mfa_authenticate" };
            await flushPromises();
            expect(routerPush).toHaveBeenCalledWith({ name: "2fa" });
        });

        scopedIt("ignores unrelated pending flow ids", async () => {
            useSignInFlow({ formProps: {} });
            store.pendingFlow = { id: "some_other_flow" };
            await flushPromises();
            expect(routerPush).not.toHaveBeenCalled();
        });
    });
});
