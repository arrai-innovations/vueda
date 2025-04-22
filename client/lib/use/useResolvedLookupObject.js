import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { inject, onScopeDispose, reactive, readonly, toRef, watch } from "vue";

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
    let scopeDisposed = false;
    onScopeDispose(() => {
        scopeDisposed = true;
        if (inflightRequest?.cancel) {
            inflightRequest
                .cancel("Component unmounted, cancelling request")
                .catch((e) =>
                    console.warn("[useResolvedLookupObject] Error cancelling inflight request during scope dispose", e),
                );
        }
    });

    watch(
        [
            toRef(internalState, "app"),
            toRef(internalState, "model"),
            toRef(internalState, "pk"),
            toRef(internalState, "fields"),
            toRef(internalState, "expands"),
        ],
        async ([a, m, id, f, e]) => {
            if (inflightRequest?.cancel) {
                try {
                    await inflightRequest.cancel("Parameters changed, lookup cancelled");
                } catch (err) {
                    console.warn("[useResolvedLookupObject] Error cancelling inflight request:", err);
                }
            }

            if (!a || !m || !id) {
                assignReactiveObject(internalState.object, {});
                return;
            }

            loadingError.setLoading();
            loadingError.clearError();
            try {
                let result;
                try {
                    const p = lookup.requestObject(a, m, f, e, id);
                    inflightRequest = p;
                    result = await p;
                    if (scopeDisposed) {
                        console.warn("[useResolvedLookupObject] Scope was disposed but promise resolved");
                        return;
                    }
                } catch (err) {
                    loadingError.setError(err);
                    console.error("[useResolvedLookupObject] Error in requestObject:", err);
                }
                if (result && (Array.isArray(result) || typeof result === "object")) {
                    assignReactiveObject(internalState.object, result);
                } else {
                    assignReactiveObject(internalState.object, {});
                }
            } catch (err) {
                loadingError.setError(err);
                console.error("[useResolvedLookupObject] Error in useResolvedLookupObject watch:", err);
            } finally {
                inflightRequest = null;
                loadingError.clearLoading();
            }
        },
        { immediate: true },
    );

    return returnObject;
}
