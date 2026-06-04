/**
 * @module use/useSignInFlow
 * @description Sets up post-login routing, MFA pending-flow detection, and a form
 * context for sign-in flows. The caller owns the layout; this composable wires the
 * reactive behavior.
 */
import { storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";

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
                if (route.query?.redirect) {
                    router.push(route.query?.redirect);
                    return;
                }
                router.push(options.redirect || { name: "welcome" });
                toast.success("Signed In", {
                    description: "You are now signed in and have been redirected.",
                    duration: 10000,
                });
            }
        },
    );

    return { formContext };
}
