import { getCRUDName, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { watch } from "vue";

/**
 * A composable function for handling a 404 error on an ObjectInstance, given the props and model config, and updating
 *  a passed error ref.
 *
 * @param {import("vue").UnwrapNestedRefs} yourProps - The props object.
 * @param {import("@arrai-innovations/reactive-helpers").ObjectInstance} yourInstanceObject - The object instance.
 * @param {import("@vueda/use/useModelConfig.js").ModelConfigState} yourModelConfig - The model config.
 * @param {import("vue").Ref<Error|null>} yourErrorRef - The error ref.
 * @returns {void}
 */
export function useObject404(yourProps, yourInstanceObject, yourModelConfig, yourErrorRef) {
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
                    name: getCRUDName({
                        app: yourProps.app,
                        model: yourProps.model,
                        view: "list",
                    }),
                };
                newE.redirectTitle = `Return to the ${modelTitle} list view.`;
                yourErrorRef.value = newE;
            }
        },
        { immediate: true },
    );
}
