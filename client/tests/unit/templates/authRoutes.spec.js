import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { createApp } from "vue";

vi.mock("@/views/ViewWelcome.vue", () => ({ default: { render: () => null } }));

const templates = [
    ["integrator-monorepo", () => import("../../../../templates/integrator-monorepo/client/src/router/index.js")],
    ["integrator-monorepo-dx", () => import("../../../../templates/integrator-monorepo-dx/client/src/router/index.js")],
];

describe("templates/*/client/src/router/index.js", () => {
    describe.each(templates)("%s auth routes", (_name, loadRouter) => {
        let router;
        let userStore;
        let pinia;

        beforeEach(async () => {
            window.history.replaceState({}, "", "/");
            pinia = createPinia();
            setActivePinia(pinia);
            userStore = storeUser(pinia);
            userStore.currentUserRequestStatus.loading = false;
            userStore.currentUserRequestStatus.errored = false;
            const { getRouter } = await loadRouter();
            router = getRouter(createApp({}), pinia);
        });

        afterEach(() => {
            router?.options.history.destroy();
            vi.restoreAllMocks();
        });

        scopedIt("lets a pending two-factor sign-in reach the code page", async () => {
            userStore.loggedIn = false;
            userStore.authPendingFlow = "mfa_authenticate";
            await router.push({ name: "2fa", query: { redirect: "/welcome/?from=sign-in" } });

            expect(router.currentRoute.value.name).toBe("2fa");
            expect(router.currentRoute.value.query.redirect).toBe("/welcome/?from=sign-in");
            expect(router.currentRoute.value.matched[0].components.default).toBe(
                (await import("@vueda/views/ViewTwoFactorAuth.vue")).default,
            );
        });

        scopedIt.each(["reauthenticate", "mfa_reauthenticate"])("lets a signed-in user confirm %s", async (flow) => {
            userStore.loggedIn = true;
            userStore.authPendingFlow = flow;
            await router.push({ name: "reauthenticate", query: { redirect: "/welcome/?from=account" } });

            expect(router.currentRoute.value.name).toBe("reauthenticate");
            expect(router.currentRoute.value.query.redirect).toBe("/welcome/?from=account");
            expect(router.currentRoute.value.matched[0].components.default).toBe(
                (await import("@vueda/views/ViewReauthenticate.vue")).default,
            );
        });

        scopedIt("sends a signed-out reauthentication visitor to sign-in with a return path", async () => {
            userStore.loggedIn = false;
            const destination = router.resolve({
                name: "reauthenticate",
                query: { redirect: "/welcome/?from=account" },
            });
            await router.push(destination);

            expect(router.currentRoute.value.name).toBe("sign-in");
            expect(router.currentRoute.value.query.redirect).toBe(destination.fullPath);
        });

        scopedIt("sends an already signed-in visitor away from the two-factor sign-in page", async () => {
            userStore.loggedIn = true;
            await router.push({ name: "2fa" });

            expect(router.currentRoute.value.name).toBe("welcome");
        });

        scopedIt.each([
            ["2fa", "mfa_authenticate", "twoFactorAuthenticate", { code: "123456" }],
            ["reauthenticate", "reauthenticate", "reauthenticate", { password: "password" }],
            ["reauthenticate", "mfa_reauthenticate", "twoFactorReauthenticate", { code: "123456" }],
        ])("returns from %s after completing %s", async (name, flow, action, formValues) => {
            userStore.loggedIn = name === "reauthenticate";
            userStore.authPendingFlow = flow;
            vi.spyOn(userStore, "getTwoFactorAuthMethod").mockResolvedValue({ methods: ["app"] });
            const submit = vi.spyOn(userStore, action).mockResolvedValue(undefined);
            const destination = "/welcome/?from=account#security";
            await router.push({ name, query: { redirect: destination } });
            const record = router.currentRoute.value.matched[0];
            const wrapper = mount(record.components.default, {
                props: record.props.default,
                global: { plugins: [pinia, router] },
            });
            onTestFinished(() => wrapper.unmount());
            await flushPromises();

            expect(router.currentRoute.value.name).toBe(name);
            await wrapper.findComponent(AuthorizingForm).props("runAction")({ formValues });
            expect(submit).toHaveBeenCalledWith(formValues);
            // The response alone does not finish the flow. The user store must confirm it has cleared.
            expect(router.currentRoute.value.name).toBe(name);
            userStore.loggedIn = true;
            userStore.authPendingFlow = null;
            await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(destination));
        });

        scopedIt("sends an expired two-factor sign-in back to sign-in with its destination", async () => {
            userStore.loggedIn = false;
            userStore.authPendingFlow = null;
            await router.push({ name: "2fa", query: { redirect: "/welcome/?from=account" } });
            const record = router.currentRoute.value.matched[0];
            const wrapper = mount(record.components.default, {
                props: record.props.default,
                global: { plugins: [pinia, router] },
            });
            onTestFinished(() => wrapper.unmount());

            await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("sign-in"));
            expect(router.currentRoute.value.query.redirect).toBe("/welcome/?from=account");
        });
    });
});
