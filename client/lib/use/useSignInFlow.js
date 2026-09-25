/**
 * @module use/useSignInFlow
 * @description Sets up post-login routing, MFA pending-flow detection, and a form
 * context for sign-in flows. The caller owns the layout; this composable wires the
 * reactive behavior.
 */
import { toast } from "@arrai-innovations/vue-sonner";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * @typedef {object} SignInFlowOptions
 * @property {import('vue-router').RouteLocationRaw} [redirect] - Route to push to after
 *  a successful login. Falls back to `?redirect` query param, then `{ name: "welcome" }`.
 * @property {boolean} [requireRecentLogin] - When `true`, the post-login redirect only
 *  fires if the user also recently authenticated.
 * @property {{ [key: string]: any }} [formProps] - Props forwarded to `useForm`.
 */

/**
 * @typedef {object} SignInFlowContext
 * @property {import('@vueda/use/useForm.js').FormContext} formContext - The form context.
 */

/**
 * Registers sign-in routing behaviour and provides a form context. Pass `options` as a
 * reactive object (e.g. the component's `props`) so that `redirect` and
 * `requireRecentLogin` remain reactive if they can change at runtime.
 *
 * @example
 * ```js
 * // In a component that owns its own layout:
 * const formProps = reactive({ initialValues: { email: "", password: "" } });
 * const { formContext } = useSignInFlow({ redirect: "/dashboard", formProps });
 * ```
 *
 * @param {SignInFlowOptions} options
 * @returns {SignInFlowContext}
 */
/**
 * Route to `destination`, reporting a navigation that does not happen.
 *
 * The sign-in has already succeeded by the time this runs, so a failure here is not a
 * failed login and the form has nothing to say about it. Left unreported, the user reads a
 * success message while the page stays where it was. The most common cause is a missing
 * route: the default destination is a route named `welcome`, which an application that
 * names its landing route something else does not have.
 *
 * A rejected promise and a thrown error both reach the same place, because Vue Router
 * resolves the destination inside `push` and an unmatched one throws synchronously, while
 * a guard that rejects does so asynchronously.
 *
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('vue-router').RouteLocationRaw} destination - Where to go.
 * @returns {Promise<boolean>} Whether the navigation happened. It never rejects: a failure
 *  is reported here rather than left as an unhandled rejection, so a caller can announce
 *  arrival on the happy path without handling the failure a second time.
 */
function navigate(router, destination) {
    let navigation;
    try {
        navigation = Promise.resolve(router.push(destination));
    } catch (error) {
        navigation = Promise.reject(error);
    }
    return navigation.then(
        () => true,
        (error) => {
            toast.error("Signed in, but could not open the next page", {
                description: "You are signed in. Use the navigation to continue.",
                duration: 10000,
            });
            // The destination is a configuration detail rather than something the person
            // signing in can act on, so it goes to the console for whoever owns the routes.
            console.error("[vueda] Sign-in redirect failed for", destination, error);
            return false;
        },
    );
}

export function useSignInFlow(options) {
    const formContext = useForm(options.formProps);
    const router = useRouter();
    const route = useRoute();
    const userStore = storeUser();
    const isActive = useIsActive();

    watch(
        [isActive, toRef(userStore, "loggedIn"), toRef(userStore, "recentlyLoggedIn"), toRef(userStore, "pendingFlow")],
        ([newActive, newLoggedIn, recentlyLoggedIn, newPendingFlow]) => {
            if (newPendingFlow) {
                if (newPendingFlow.id === "mfa_authenticate") {
                    router.push({ name: "2fa" });
                }
            }
            if (newActive && newLoggedIn && (!options.requireRecentLogin || recentlyLoggedIn)) {
                const destination = route.query?.redirect || options.redirect || { name: "welcome" };
                navigate(router, destination).then((arrived) => {
                    if (arrived) {
                        toast.success("Signed In", {
                            description: "You are now signed in and have been redirected.",
                            duration: 10000,
                        });
                    }
                });
            }
        },
    );

    return { formContext };
}
