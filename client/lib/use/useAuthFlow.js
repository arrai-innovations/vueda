/**
 * @module use/useAuthFlow
 * @description Sets up reauthentication routing, UnauthorizedError interception, and a
 * form context for forms that gate access behind prior authentication.
 */
import { toast } from "@arrai-innovations/vue-sonner";
import { UnauthorizedError, storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { defaultOnSubmissionError } from "@vueda/use/useObjectForm.js";
import { toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * @typedef {object} AuthFlowOptions
 * @property {{ [key: string]: any }} [formProps] - Props forwarded to `useForm`.
 */

/**
 * @typedef {object} AuthFlowContext
 * @property {import('@vueda/use/useForm.js').FormContext} formContext - The form context.
 * @property {(args: { error: Error, formContext: import('@vueda/use/useForm.js').FormContext, toast: any }) => Promise<boolean>} onSubmissionErrorHandler -
 *  Intercepts `UnauthorizedError` and redirects to the reauthenticate route; falls back
 *  to `defaultOnSubmissionError` for all other errors.
 * @property {() => Promise<void>} redirectTo - Pushes to `route.query.returnPath` if
 *  present; no-op otherwise.
 */

/**
 * Registers reauthentication routing behaviour, produces a submission error handler, and
 * provides a form context.
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

    const doReauthenticate = async () => {
        toast.warning("Please verify your account again before proceeding", {
            duration: 10000,
        });
        await router.push({ name: "reauthenticate", query: { redirect: route.fullPath } });
    };

    watch(toRef(userStore, "pendingFlow"), async (newPendingFlow) => {
        if (newPendingFlow) {
            if (newPendingFlow.id === "mfa_reauthenticate" || newPendingFlow.id === "reauthenticate") {
                await doReauthenticate();
            }
        }
    });

    const onSubmissionErrorHandler = async ({ error, formContext: ctx, toast: t }) => {
        if (error instanceof UnauthorizedError) {
            await doReauthenticate();
            return true;
        }
        return await defaultOnSubmissionError({ error, formContext: ctx, toast: t });
    };

    const redirectTo = async () => {
        const returnPath = route.query?.returnPath;
        if (returnPath) {
            await router.push(returnPath);
        }
    };

    return { formContext, onSubmissionErrorHandler, redirectTo };
}
