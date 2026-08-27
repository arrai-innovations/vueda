/**
 * @module use/useModelChoices
 * @description Provides a reactive composable for fetching and tracking field-level model choices, preserving deep references across app, model, or field changes.
 */
import { keyDiff, useLoadingError, useProxyLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelChoices } from "@vueda/stores/storeModelChoices.js";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { AuthScopeInvalidatedError } from "@vueda/utils/errors.js";
import pLimit from "p-limit";
import { computed, effectScope, reactive, readonly, toRef, unref, watch } from "vue";

/**
 * The raw instance of a useModelChoices object.
 *
 * @typedef {object} UseModelChoicesRaw
 * @property {boolean} loading - True if the model choices are loading.
 * @property {Error} error - The error that occurred while loading the model choices.
 * @property {boolean} errored - True if an error occurred while loading the model choices.
 * @property {()=>void} clearError - Clear the error.
 * @property {{[fieldName:string]: object}} choices - The choices for the model field.
 * @property {import('vue').EffectScope} es - The effect scope for the useModelChoices instance.
 */

/**
 * The reactive useModelChoices instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<UseModelChoicesRaw>>} UseModelChoices
 */

/**
 * @typedef {object} ChoicesOption
 * @property {import('vue').Ref<string>|string} app - The app name for the field.
 * @property {import('vue').Ref<string>|string} model - The model name for the field.
 * @property {import('vue').Ref<boolean>|boolean} intendToFetch - Should we fetch the choices?
 * @property {import('vue').Ref<boolean>|boolean} isFilter - Is this a filter field?
 */

/**
 * @typedef {{[fieldName:string]: ChoicesOption}} ChoicesOptions
 */

/**
 * Provides a reactive object for a given app, model, and field. This composition function is designed to preserve deep references
 * within the `choices` object, preventing them from breaking when the app, model, or field changes.
 *
 * This function deeply mirrors (watches and clones) the model choices, which assumes that the choices data has low churn.
 * Frequent updates could have performance implications due to the deep cloning process.
 *
 * @param {import('vue').Reactive<ChoicesOptions>|ChoicesOptions} fields - Field name(s) to fetch choices for.
 * @param {import('@vueda/use/useIsActive.js').IsActive|undefined} [isActive] - An IsActive instance, if one can be reused.
 * @returns {UseModelChoices} An object containing reactive fields and actions for model choices.
 */
export function useModelChoices(fields, isActive) {
    const es = effectScope();
    if (!isActive) {
        isActive = es.run(() => useIsActive());
    }
    // Resolve the stores here, while the composable still runs inside its component's setup.
    // Pinia's active instance is a module global that every `app.use(pinia)` overwrites, so a
    // store resolved later, from a callback with no current component to inject from, would come
    // from whichever app booted last. The docs site puts several isolated apps on one page.
    const modelChoicesStore = storeModelChoices();
    const userStore = storeUser();
    const internalState = reactive({
        /** @type {ChoicesOptions} */
        fields,
        /** @type {{[fieldName:string]: import('@arrai-innovations/reactive-helpers').LoadingError}} */
        loadingErrors: {},
    });
    const loadingError = es.run(() => useProxyLoadingError(computed(() => Object.values(internalState.loadingErrors))));
    const returnObject = reactive(
        /** @type {UseModelChoicesRaw} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            choices: {},
            es,
            internalState,
        },
    );
    const limit = pLimit(4);
    const stopWatches = {};

    const newFieldWatch = (fieldName) => {
        internalState.loadingErrors[fieldName] = es.run(() => useLoadingError());
        stopWatches[fieldName] = es.run(() =>
            watch(
                [
                    () => unref(internalState.fields[fieldName]?.app),
                    () => unref(internalState.fields[fieldName]?.model),
                    () => unref(internalState.fields[fieldName]?.intendToFetch),
                    () => unref(internalState.fields[fieldName]?.isFilter),
                    isActive,
                    // the store drops its cache when the authenticated user changes, so refetch under
                    // the new one
                    () => userStore.identityGeneration,
                ],
                async ([app, model, intendToFetch, isFilter, isActive]) => {
                    if (!isActive) {
                        return; // we'll pick up again when the component is active
                    }
                    if (intendToFetch) {
                        const myLE = internalState.loadingErrors[fieldName];
                        if (!myLE?.loading) {
                            myLE.clearError();
                            myLE.setLoading();
                            try {
                                modelChoicesStore.initializeChoice(app, model, isFilter);
                                const choiceProps = isFilter
                                    ? modelChoicesStore.filterChoices
                                    : modelChoicesStore.choices;
                                const key = getAppModelDotName({ app, model });
                                const fetchFn = isFilter
                                    ? modelChoicesStore.fetchFilterChoices.bind(modelChoicesStore)
                                    : modelChoicesStore.fetchChoices.bind(modelChoicesStore);
                                await limit(() => fetchFn(app, model, fieldName));
                                returnObject.choices[fieldName] = toRef(choiceProps[key], fieldName);
                            } catch (e) {
                                if (!(e instanceof AuthScopeInvalidatedError)) {
                                    // the authenticated user changed mid-fetch; the identity watch refetches
                                    myLE.setError(e);
                                }
                            } finally {
                                myLE.clearLoading();
                            }
                        }
                    }
                },
                { immediate: true },
            ),
        );
    };

    watch(
        () => Object.keys(unref(internalState.fields)),
        (newFieldNames) => {
            const { addedKeys, removedKeys } = keyDiff(newFieldNames, Object.keys(stopWatches), {
                sameKeys: false,
            });

            for (const added of addedKeys) {
                newFieldWatch(added);
            }

            for (const removed of removedKeys) {
                stopWatches[removed]();
                delete stopWatches[removed];
            }
        },
        { immediate: true },
    );

    return readonly(returnObject);
}
