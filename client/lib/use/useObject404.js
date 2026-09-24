/**
 * @module use/useObject404
 * @description Watches an object instance for 404 errors and converts them into user-friendly error objects with a list-view redirect.
 */
import { memoizedStartCase } from "@vueda/utils/case.js";
import { LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { watch } from "vue";

/**
 * A composable function for handling a 404 error on an ObjectInstance, given the props and model config, and updating
 *  a passed error ref.
 *
 * @param {import("vue").UnwrapNestedRefs<{
 *     pk: string,
 * }>} yourProps - The props object.
 * @param {import("@arrai-innovations/reactive-helpers").ObjectInstance} yourInstanceObject - The object instance.
 * @param {import("@vueda/use/useModelConfig.js").ModelConfigState} yourModelConfig - The model config.
 * @param {import("vue").Ref<Error|null>} yourErrorRef - The error ref.
 * @returns {void}
 */
export function useObject404(yourProps, yourInstanceObject, yourModelConfig, yourErrorRef) {
    watch([() => yourProps.app, () => yourProps.model, () => yourProps.pk], () => {
        yourErrorRef.value = null;
    });
    watch(
        () => yourInstanceObject.state.loading,
        (loading) => {
            if (loading) {
                yourErrorRef.value = null;
            }
        },
    );
    watch(
        () => yourInstanceObject.state.error,
        async (error) => {
            //  we should show indicate that no object was found.
            if (error?.response?.status === 404) {
                // we will handle this in the error display component
                yourInstanceObject.clearError();
                const modelTitle = memoizedStartCase(yourModelConfig.info.verbose_name);
                const newE = new Error(`No ${modelTitle} found with id: ` + yourProps.pk);
                newE.name = ""; // delete will just show the default Error.prototype.name
                delete newE.stack;
                newE.redirectParams = {
                    name: LIST_VIEW_CRUD_NAME,
                };
                newE.redirectTitle = `Return to the ${modelTitle} list view.`;
                yourErrorRef.value = newE;
            }
        },
        { immediate: true },
    );
}
