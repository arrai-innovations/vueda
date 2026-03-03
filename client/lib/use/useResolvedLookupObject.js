/**
 * @module use/useResolvedLookupObject
 * @description Fetches and reactively tracks a single object via the injected lookup context, cancelling in-flight requests when parameters change or the scope is disposed.
 */
import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import isEqual from "lodash-es/isEqual.js";
import { effectScope, inject, onScopeDispose, reactive, readonly, toRaw, toRef, watch } from "vue";

/**
 * @typedef {object} ResolvedLookupRawInstance
 * @property {{[prop:string]: any}} object - The resolved object.
 @property {import('vue').EffectScope} effectScope - The effect scope for the instance.
 */

/**
 * @typedef {import('vue').Reactive<(
 *     import('@arrai-innovations/reactive-helpers').LoadingErrorStatus &
 *     ResolvedLookupRawInstance
 * )>} ResolvedLookupInstance
 *
 */

/**
 *
 * @param {import('vue').Ref<string>|string} app
 * @param {import('vue').Ref<string>|string} model
 * @param {import('vue').Ref<string>|string} pk
 * @param {import('vue').Ref<string[]>|string[]} fields
 * @param {import('vue').Ref<string[]>|string[]} expand
 * @returns {ResolvedLookupInstance}
 */
export function useResolvedLookupObject(app, model, pk, fields, expand) {
    const es = effectScope();
    return es.run(() => {
        const loadingError = useLoadingError();
        const lookup = inject(LookupContextSymbol);
        const internalState = reactive({
            app,
            model,
            pk,
            fields,
            expand,
            object: {},
        });
        const returnObject = reactive({
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            object: readonly(toRef(internalState, "object")),
            effectScope: es,
        });

        let inflightRequest = null;
        let scopeDisposed = false;
        onScopeDispose(() => {
            scopeDisposed = true;
            if (inflightRequest?.cancel) {
                inflightRequest
                    .cancel("Component unmounted, cancelling request")
                    .catch((e) =>
                        console.warn(
                            "[useResolvedLookupObject] Error cancelling inflight request during scope dispose",
                            e,
                        ),
                    );
            }
        });

        const cancelInflightRequest = async () => {
            if (inflightRequest?.cancel) {
                console.debug("[cancelInflightRequest] Cancelling inflight request");
                try {
                    await inflightRequest.cancel("Parameters changed, lookup cancelled");
                } catch (err) {
                    console.warn("[useResolvedLookupObject] Error cancelling inflight request:", err);
                }
            }
        };

        watch(
            [
                () => toRaw(internalState.app),
                () => toRaw(internalState.model),
                () => toRaw(internalState.pk),
                () => toRaw(internalState.fields),
                () => toRaw(internalState.expand),
            ],
            async ([a, m, id, f, e], [, , , , oldF, oldE]) => {
                if (!a || !m || !id) {
                    await cancelInflightRequest();
                    assignReactiveObject(internalState.object, {});
                    return;
                }

                // primitive non changes won't trigger the watch, but array non-changes will
                if (isEqual(oldF, f) && isEqual(oldE, e)) {
                    return;
                }

                loadingError.setLoading();
                loadingError.clearError();
                try {
                    const p = lookup.requestObject(a, m, id, f, e);
                    inflightRequest = p;
                    const result = await p;
                    if (scopeDisposed) {
                        console.warn("[useResolvedLookupObject] Scope was disposed but promise resolved");
                        return;
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
    });
}
