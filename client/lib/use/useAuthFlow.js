/**
 * @module use/useAuthFlow
 * @description Sets up reauthentication routing, UnauthorizedError interception, and a
 * form context for forms that gate access behind prior authentication.
 */
import { toast } from "@arrai-innovations/vue-sonner";
import { UnauthorizedError, storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { defaultOnSubmissionError } from "@vueda/use/useObjectForm.js";
import { REAUTHENTICATION_FLOW_IDS } from "@vueda/utils/constants.js";
import { toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * @typedef {object} AuthFlowOptions
 * @property {{ [key: string]: any }} [formProps] - Props forwarded to `useForm`.
 * @property {string} [redirect] - Route path to push after success when the route has no `returnPath` query.
 * @property {boolean} [requireRecentAuth=true] - Whether the server requires a recent session for the form's
 *  action. When `true`, a pending reauthentication flow sends the user to the reauthenticate route, including when
 *  the form is set up. Set it to `false` for a form whose action the server accepts without a recent session, such
 *  as change-password. The user then stays on the form while the flow is pending.
 */

/**
 * @typedef {object} AuthFlowContext
 * @property {import('@vueda/use/useForm.js').FormContext} formContext - The form context.
 * @property {(args: { error: Error, formContext: import('@vueda/use/useForm.js').FormContext, toast: any }) => Promise<boolean>} onSubmissionErrorHandler -
 *  Handles an `UnauthorizedError` from the refetched `storeUser` state. A signed-out user is sent to the sign-in
 *  route. A pending reauthentication flow sends the user to the reauthenticate route. When the router reports a
 *  navigation failure, the error goes to `defaultOnSubmissionError`. Every other error goes there too.
 * @property {() => Promise<boolean>} redirectTo - Pushes to `route.query.returnPath` if
 *  present, otherwise to the `redirect` option. Resolves `false` when neither is set or the router reports a
 *  navigation failure, so `useActionForm` keeps the form usable.
 */

/**
 * Registers reauthentication routing behaviour, produces a submission error handler, and
 * provides a form context.
 *
 * By default the form's action needs a recent session. Whenever `storeUser.authPendingFlow` is a
 * reauthentication flow, including when the form is set up, the user is sent to the reauthenticate route with the
 * current path as `redirect`. Every who-is response for a signed-in user whose session is no longer recent sets
 * that flow, including the refetch after a 401 response. The redirect therefore happens as soon as the store
 * learns that the session is stale, not only after a refused request.
 *
 * The `storeUser` actions that need a recent session, such as `setupTOTPDevice` and `getRecoveryCodes`, refetch the
 * current user before they reject with an `UnauthorizedError`. The submission error handler reads that refetched
 * state. A signed-out user goes to the sign-in route. A pending reauthentication flow sends the user to the
 * reauthenticate route. An action that does not refetch leaves the state from before the request, so its
 * `UnauthorizedError` goes to `defaultOnSubmissionError`.
 *
 * The watch and the handler share one redirect for each pending flow, so the user sees one toast and one
 * navigation even when both react to the same refused request. When the router reports a navigation failure, the
 * handler passes the error to `defaultOnSubmissionError`, and the next refused submission tries the redirect again.
 *
 * With `requireRecentAuth: false`, a pending reauthentication flow does not redirect. A signed-out user still goes
 * to the sign-in route.
 *
 * @example
 * ```js
 * // In a component that owns its own layout:
 * const formProps = reactive({ initialValues: { password: "" } });
 * const { formContext, onSubmissionErrorHandler, redirectTo } = useAuthFlow({ formProps });
 * ```
 *
 * @param {AuthFlowOptions} options
 * @returns {AuthFlowContext}
 */
export function useAuthFlow(options) {
    const formContext = useForm(options.formProps);
    const router = useRouter();
    const route = useRoute();
    const userStore = storeUser();
    const requiresRecentAuth = () => options.requireRecentAuth ?? true;
    const reauthenticationPending = () => REAUTHENTICATION_FLOW_IDS.includes(userStore.authPendingFlow);

    /**
     * The redirect for the current pending flow. It resolves to the router's navigation failure, which is
     * `undefined` when the navigation succeeds.
     *
     * @type {Promise<import('vue-router').NavigationFailure|void|undefined>|null}
     */
    let reauthenticateRedirect = null;

    /**
     * Sends the user to the reauthenticate route once for each pending flow. A caller that arrives while the
     * redirect is under way, or after it succeeded, receives the same promise. A navigation failure or a rejected
     * push clears it, so the next caller tries again.
     *
     * @returns {Promise<import('vue-router').NavigationFailure|void|undefined>}
     */
    const redirectToReauthenticate = () => {
        if (!reauthenticateRedirect) {
            toast.warning("Please verify your account again before proceeding", {
                duration: 10000,
            });
            reauthenticateRedirect = router.push({ name: "reauthenticate", query: { redirect: route.fullPath } }).then(
                (failure) => {
                    if (failure) {
                        reauthenticateRedirect = null;
                    }
                    return failure;
                },
                (error) => {
                    reauthenticateRedirect = null;
                    throw error;
                },
            );
        }
        return reauthenticateRedirect;
    };

    watch(
        [toRef(userStore, "authPendingFlow"), requiresRecentAuth],
        async () => {
            if (!reauthenticationPending()) {
                reauthenticateRedirect = null;
            } else if (requiresRecentAuth()) {
                await redirectToReauthenticate();
            }
        },
        { immediate: true },
    );

    const onSubmissionErrorHandler = async ({ error, formContext: ctx, toast: t }) => {
        if (error instanceof UnauthorizedError) {
            if (!userStore.loggedIn) {
                await router.push({ name: "sign-in", query: { redirect: route.fullPath } });
                return true;
            }
            if (requiresRecentAuth() && reauthenticationPending()) {
                const failure = await redirectToReauthenticate();
                if (!failure) {
                    return true;
                }
            }
        }
        return await defaultOnSubmissionError({ error, formContext: ctx, toast: t });
    };

    const redirectTo = async () => {
        const destination = route.query?.returnPath || options.redirect;
        if (!destination) {
            return false;
        }
        // `router.push` resolves a navigation failure instead of throwing when it does not navigate.
        return !(await router.push(destination));
    };

    return { formContext, onSubmissionErrorHandler, redirectTo };
}
