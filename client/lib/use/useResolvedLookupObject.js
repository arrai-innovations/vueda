import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { inject, reactive, readonly, toRef, watch } from "vue";

/**
 * @typedef {object} ResolvedLookupObject
 * @property {{[prop:string]: any}} object - The resolved object.
 */

/**
 *
 * @param {import('vue').Ref<string>|string} app
 * @param {import('vue').Ref<string>|string} model
 * @param {import('vue').Ref<string>|string} pk
 * @param {import('vue').Ref<string[]>|string[]} fields
 * @param {import('vue').Ref<string[]>|string[]} expands
 * @returns {ResolvedLookupObject & import('@arrai-innovations/reactive-helpers').LoadingErrorStatus}
 */
export function useResolvedLookupObject(app, model, pk, fields, expands) {
    const loadingError = useLoadingError();
    const lookup = inject(LookupContextSymbol);
    const internalState = reactive({
        app,
        model,
        pk,
        fields,
        expands,
        object: {},
    });
    const returnObject = reactive({
        loading: loadingError.loading,
        error: loadingError.error,
        errored: loadingError.errored,
        clearError: loadingError.clearError,
        object: readonly(toRef(internalState, "object")),
    });

    let inflightRequest = null;

    watch(
        [
            toRef(internalState, "app"),
            toRef(internalState, "model"),
            toRef(internalState, "pk"),
            toRef(internalState, "fields"),
            toRef(internalState, "expands"),
        ],
        async ([a, m, id, f, e]) => {
            if (!a || !m || !id) {
                assignReactiveObject(internalState.object, {});
                return;
            }

            if (inflightRequest?.cancel) {
                try {
                    await inflightRequest.cancel("Parameters changed, lookup cancelled");
                } catch (e) {
                    console.warn("Error cancelling inflight request:", e);
                }
            }

            loadingError.setLoading();
            loadingError.clearError();
            try {
                let result;
                try {
                    const p = lookup.requestObject(a, m, f, e, id);
                    inflightRequest = p;
                    result = await p;
                } catch (e) {
                    loadingError.setError(e);
                    console.error("Error in requestObject:", e);
                }
                assignReactiveObject(internalState.object, result);
            } catch (e) {
                loadingError.setError(e);
                console.error("Error in useResolvedLookupObject watch:", e);
            } finally {
                loadingError.clearLoading();
            }
        },
        { immediate: true },
    );

    return returnObject;
}
