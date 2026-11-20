/**
 * @module use/useResolvedLookupObjects
 * @description Fetches and reactively tracks several objects of one model via the injected lookup context,
 * cancelling in-flight requests when parameters change or the scope is disposed.
 */
import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import isEqual from "lodash-es/isEqual.js";
import { effectScope, inject, onScopeDispose, reactive, readonly, toRaw, toRef, watch } from "vue";

/**
 * @typedef {object} ResolvedLookupObjectsRawInstance
 * @property {{[pk:string]: object}} objects - The resolved objects, keyed by the string form of each requested pk. A pk
 * that the server does not return maps to `undefined`. A pk whose request fails also maps to `undefined`.
 * @property {import('vue').EffectScope} effectScope - The effect scope for the instance.
 */

/**
 * @typedef {import('vue').Reactive<(
 *     import('@arrai-innovations/reactive-helpers').LoadingErrorStatus &
 *     ResolvedLookupObjectsRawInstance
 * )>} ResolvedLookupObjectsInstance
 */

/**
 * Resolves several objects of one model by pk via the parent lookup context, reactively tracking loading and error
 * state.
 *
 * The composable asks the lookup context for every pk together. The context combines requests for one model that arrive
 * within its wait window into one list request, so the objects arrive in one request. Objects that the context already
 * holds need no request.
 *
 * When a request fails, the composable keeps the objects that resolved and maps the failed pk to `undefined`. It sets
 * `error` to the first failure.
 *
 * When the pks change, the composable cancels the previous requests and ignores their results. When the app, the
 * model, or the pk list becomes empty, it cancels the requests and clears `objects` and `loading`.
 *
 * @param {import('vue').Ref<string>|string} app
 * @param {import('vue').Ref<string>|string} model
 * @param {import('vue').Ref<(string|number)[]>|(string|number)[]} pks
 * @param {import('vue').Ref<string[]>|string[]} fields
 * @param {import('vue').Ref<string[]>|string[]} expand
 * @returns {ResolvedLookupObjectsInstance}
 */
export function useResolvedLookupObjects(app, model, pks, fields, expand) {
    const es = effectScope();
    return es.run(() => {
        const loadingError = useLoadingError();
        const lookup = inject(LookupContextSymbol);
        const internalState = reactive({
            app,
            model,
            pks,
            fields,
            expand,
            objects: {},
        });
        const returnObject = reactive({
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            objects: readonly(toRef(internalState, "objects")),
            effectScope: es,
        });

        let inflightRequests = [];

        const cancelInflightRequests = () => {
            const requests = inflightRequests;
            inflightRequests = [];
            for (const request of requests) {
                request.cancel?.("Parameters changed, lookup cancelled")?.catch?.((err) => {
                    console.warn("[useResolvedLookupObjects] Error cancelling inflight request:", err);
                });
            }
        };
        onScopeDispose(cancelInflightRequests);

        watch(
            [
                () => toRaw(internalState.app),
                () => toRaw(internalState.model),
                () => (toRaw(internalState.pks) || []).filter((pk) => pk !== null && pk !== undefined && pk !== ""),
                () => toRaw(internalState.fields),
                () => toRaw(internalState.expand),
            ],
            async ([a, m, ids, f, e], [oldA, oldM, oldIds, oldF, oldE] = []) => {
                // new arrays with the same contents trigger the watch; skip them only when the objects they name are
                // unchanged too
                if (a === oldA && m === oldM && isEqual(oldIds, ids) && isEqual(oldF, f) && isEqual(oldE, e)) {
                    return;
                }
                cancelInflightRequests();
                if (!a || !m || !ids.length) {
                    internalState.objects = {};
                    loadingError.clearLoading();
                    return;
                }

                const keys = ids.map((pk) => pk + "");
                const requests = keys.map((pk) => lookup.requestObject(a, m, pk, f, e));
                inflightRequests = requests;
                loadingError.setLoading();
                loadingError.clearError();
                const results = await Promise.allSettled(requests);
                if (inflightRequests !== requests) {
                    return;
                }
                internalState.objects = Object.fromEntries(
                    keys.map((pk, index) => [
                        pk,
                        results[index].status === "fulfilled" ? results[index].value : undefined,
                    ]),
                );
                const failure = results.find((result) => result.status === "rejected");
                if (failure) {
                    loadingError.setError(failure.reason);
                    console.error("[useResolvedLookupObjects] Error resolving lookup objects:", failure.reason);
                }
                inflightRequests = [];
                loadingError.clearLoading();
            },
            { immediate: true },
        );

        return returnObject;
    });
}
