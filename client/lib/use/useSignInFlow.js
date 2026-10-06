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
import { AUTH_FLOW } from "@vueda/utils/constants.js";
import { toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/** @type {{ success: Required<SignInFlowToast>, redirectFailed: Required<SignInFlowToast> }} */
const DEFAULT_TOASTS = {
    success: {
        title: "Signed In",
        description: "You are now signed in and have been redirected.",
    },
    redirectFailed: {
        title: "Signed in, but could not open the next page",
        description: "You are signed in. Use the navigation to continue.",
    },
};

/**
 * @typedef {object} SignInFlowOptions
 * @property {import('vue-router').RouteLocationRaw} [redirect] - Route to push to after
 *  a successful login. Falls back to `?redirect` query param, then `{ name: "welcome" }`.
 * @property {boolean} [requireRecentLogin] - When `true`, the post-login redirect only
 *  fires if the user also recently authenticated.
 * @property {SignInFlowToasts} [toasts] - Toast text for the redirect. Each entry replaces
 *  the matching default, field by field.
 * @property {{ [key: string]: any }} [formProps] - Props forwarded to `useForm`.
 */

/**
 * @typedef {object} SignInFlowToast
 * @property {string} [title] - The toast's heading.
 * @property {string} [description] - The line below the heading.
 */

/**
 * @typedef {object} SignInFlowToasts
 * @property {SignInFlowToast} [success] - Shown once the redirect arrives. Defaults to
 *  "Signed In".
 * @property {SignInFlowToast} [redirectFailed] - Shown when the redirect does not happen.
 *  Defaults to "Signed in, but could not open the next page".
 */

/**
 * @typedef {object} SignInFlowContext
 * @property {import('@vueda/use/useForm.js').FormContext} formContext - The form context.
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
 * @param {Required<SignInFlowToast>} failedToast - The toast to show when the navigation
 *  does not happen.
 * @returns {Promise<boolean>} Whether the navigation happened. It never rejects: a failure
 *  is reported here rather than left as an unhandled rejection, so a caller can announce
 *  arrival on the happy path without handling the failure a second time.
 */
function navigate(router, destination, failedToast) {
    let navigation;
    try {
        navigation = Promise.resolve(router.push(destination));
    } catch (error) {
        navigation = Promise.reject(error);
    }
    return navigation.then(
        () => true,
        (error) => {
            toast.error(failedToast.title, {
                description: failedToast.description,
                duration: 10000,
            });
            // The destination is a configuration detail rather than something the person
            // signing in can act on, so it goes to the console for whoever owns the routes.
            console.error("[vueda] Sign-in redirect failed for", destination, error);
            return false;
        },
    );
}

/**
 * Registers sign-in routing behaviour and provides a form context. Pass `options` as a
 * reactive object (e.g. the component's `props`) so that `redirect`,
 * `requireRecentLogin`, and `toasts` remain reactive if they can change at runtime.
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
export function useSignInFlow(options) {
    const formContext = useForm(options.formProps);
    const router = useRouter();
    const route = useRoute();
    const userStore = storeUser();
    const isActive = useIsActive();
    const toastFor = (key) => ({ ...DEFAULT_TOASTS[key], ...options.toasts?.[key] });

    watch(
        [isActive, toRef(userStore, "loggedIn"), toRef(userStore, "recentlyLoggedIn"), toRef(userStore, "pendingFlow")],
        ([newActive, newLoggedIn, recentlyLoggedIn, newPendingFlow]) => {
            if (newPendingFlow) {
                if (newPendingFlow.id === AUTH_FLOW.MFA_AUTHENTICATE) {
                    // The two-factor view signs the user in, so it needs the refused path to send
                    // them back to. A `redirect` option stays with this view; the two-factor view
                    // takes its own.
                    const redirect = route.query?.redirect;
                    router.push(redirect ? { name: "2fa", query: { redirect } } : { name: "2fa" });
                }
            }
            if (newActive && newLoggedIn && (!options.requireRecentLogin || recentlyLoggedIn)) {
                const destination = route.query?.redirect || options.redirect || { name: "welcome" };
                navigate(router, destination, toastFor("redirectFailed")).then((arrived) => {
                    if (arrived) {
                        const { title, description } = toastFor("success");
                        toast.success(title, {
                            description,
                            duration: 10000,
                        });
                    }
                });
            }
        },
    );

    return { formContext };
}
