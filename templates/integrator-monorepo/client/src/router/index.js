import { requireAuth, requireCurrentUser, requireRecentAuth, requireUnauth } from "@vueda/router/guards.js";
import { makeCRUDRoutes } from "@vueda/router/makeCrud.js";
import { setCrudComponents } from "@vueda/router/routerComponent.js";
import { createRouter, createWebHistory } from "vue-router";

export function getRouter(app, pinia) {
    const crudComponents = {};
    setCrudComponents(crudComponents);

    const router = createRouter({
        history: createWebHistory(import.meta.env.BASE_URL),
        routes: [],
    });

    // Where a signed-in user belongs, for the sign-in and password pages to send them to.
    const signedInHome = { name: "welcome" };
    // Where the account pages send a user whose session is no longer recent.
    const reauthenticate = { name: "reauthenticate" };
    const routes = [
        {
            path: "/",
            name: "home",
            redirect: signedInHome,
        },
        {
            // The post-sign-in landing page. Replace ViewWelcome.vue with your application's own.
            path: "/welcome/",
            name: "welcome",
            component: () => import("@/views/ViewWelcome.vue"),
            meta: { title: "Welcome" },
            beforeEnter: (to) => requireAuth({ name: "sign-in" }, to, router, pinia),
        },
        {
            path: "/sign-in/",
            name: "sign-in",
            component: async () => (await import("@vueda/views/ViewSignIn.vue")).default,
            props: { forgotPasswordTo: { name: "forgot-password" } },
            meta: { title: "Sign In" },
            beforeEnter: () => requireUnauth(signedInHome, router, pinia),
        },
        {
            path: "/forgot-password/",
            name: "forgot-password",
            component: async () => (await import("@vueda/views/ViewForgotPassword.vue")).default,
            meta: { title: "Forgot Password" },
            beforeEnter: () => requireUnauth(signedInHome, router, pinia),
        },
        {
            // The server's FRONTEND_RESET_URL ("/reset-password" by default) emails links to this route,
            // with the account in the path and the token in the query string.
            path: "/reset-password/:pk/",
            name: "reset-password",
            component: async () => (await import("@vueda/views/ViewResetPassword.vue")).default,
            props: (route) => ({ pk: route.params.pk, token: String(route.query.token ?? "") }),
            meta: { title: "Reset Password" },
            beforeEnter: () => requireUnauth(signedInHome, router, pinia),
        },
        {
            // useSignInFlow sends a user with a two-factor device here to finish signing in. That user stays
            // signed out until the code is accepted, so the route takes signed-out users.
            path: "/2fa/",
            name: "2fa",
            component: async () => (await import("@vueda/views/ViewTwoFactorAuth.vue")).default,
            meta: { title: "Two-Factor Authentication" },
            beforeEnter: () => requireUnauth(signedInHome, router, pinia),
        },
        {
            // A form or route that needs a recent session sends the user here, with the refused path in
            // `?redirect` to return to once the user confirms their identity.
            path: "/reauthenticate/",
            name: "reauthenticate",
            component: async () => (await import("@vueda/views/ViewReauthenticate.vue")).default,
            meta: { title: "Confirm Your Identity" },
            beforeEnter: (to) => requireAuth({ name: "sign-in" }, to, router, pinia),
        },
        {
            // Link to this route from your account settings. ViewSetupDevice reads the device methods from
            // the TOTP device model's metadata, and returns to `?returnPath` once the device is active.
            path: "/setup-device/",
            name: "setup-device",
            component: async () => (await import("@vueda/views/ViewSetupDevice.vue")).default,
            props: { app: "vueda_user", model: "totpdevice" },
            meta: { title: "Set Up Two-Factor Device" },
            beforeEnter: (to) => requireRecentAuth(reauthenticate, to, router, pinia),
        },
        {
            // Link to this route from your account settings. A user without a device is offered setup-device.
            path: "/recovery-codes/",
            name: "recovery-codes",
            component: async () => (await import("@vueda/views/ViewRecoveryCodes.vue")).default,
            meta: { title: "Recovery Codes" },
            beforeEnter: (to) => requireRecentAuth(reauthenticate, to, router, pinia),
        },
        ...makeCRUDRoutes({
            component: async () => (await import("@vueda/views/ViewActionRouter.vue")).default,
            authRedirect: { name: "sign-in" },
            groupsRedirect: signedInHome,
            actionRedirect: { name: "not-found" },
            groups: [],
            vueApp: app,
            router,
            pinia,
        }),
        {
            path: "/:pathMatch(.*)*",
            name: "not-found",
            component: async () => (await import("@vueda/views/ViewNotFound.vue")).default,
            meta: {
                title: "Not Found",
                titles: {
                    view: "Not Found",
                },
            },
            beforeEnter: () => requireCurrentUser(router, pinia),
            props: (route) => {
                return {
                    ...(route.params || {}),
                    ...(route.query || {}),
                    title: route.meta.title,
                };
            },
        },
    ];

    for (const route of routes) {
        router.addRoute(route);
    }

    return router;
}
