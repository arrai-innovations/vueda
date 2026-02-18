import { ObjectError, assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { makeSearchParamsString } from "@vueda/utils/listCrud.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import { isRef, reactive, ref, toRef, watch } from "vue";

let isUsingWarnings = true;

/**
 * Set the usingVuedaWorkflow value.
 *
 * @param {boolean} value - The value to set isUsingWarnings to.
 */
export function setUsingWarnings(value) {
    isUsingWarnings = value;
}
/**
 * @typedef {object} UseWarningRawState
 * @property {FormValidationError} formValidationErrors - The form validation errors.
 * @property {boolean} loading - True if the model config is loading.
 * @property {Error} error - The error that occurred while loading the model config.
 * @property {boolean} errored - True if an error occurred while loading the model config.
 * @param {object|string} responseData - The data returned in the response.
 *
 */

/**
 * Default implementation for OnRetrieveErrorHandler hook.
 *
 * @param {object} options
 * @param {Error} options.error - The error that occurred.
 * @param {FormContext} options.formContext - The form context.
 * @param {UseWarningRawState} state - The state of the useWarnings composable.
 * @returns {Promise<boolean>} - True if the error should be marked as handled. Otherwise it may be displayed.
 */
export const OnRetrieveErrorHandler = async ({ error, formContext, state }) => {
    if (error instanceof FormValidationError) {
        formContext.handleServerFormValidationError(error);
        assignReactiveObject(state.formValidationErrors, error);
        return true;
    }
};

/**
 * @param {string} app - The app name
 * @param {string} model - The model name
 * @param {string} action- The action to be performed
 * @param {string} [pk] - The primary key of the object
 * @param {boolean} detailed- Whether to fetch detailed warnings
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
function warningsFetch(app, model, action, pk, detailed) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const controller = new AbortController();
    const queryString = detailed ? "" : makeSearchParamsString({ pks: pk, action });
    const url = detailed
        ? getDetailUrl({ app, model, pk, action: "warnings" })
        : getListUrl({ app, model, action: "warnings", query: queryString });
    const returnPromise = fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (response.status === 200) {
            return responseData;
        }
        if (response.status === 400) {
            throw new FormValidationError(responseData, response);
        }
        throw new FetchError("Failed to update object", response, responseData);
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
}

/**
 * Fetches the warnings for a given object or list of objects.
 * Handles the returned warnings through the form context
 *
 * @param {import('vue').Ref<string>|string} app - The app name
 * @param {import('vue').Ref<string>|string} model - The model name
 * @param {import('./useForm.js').FormContext} options.formContext - The form context object.
 * @param {import('vue').Ref<string>|string} [view] - What you are doing with the model
 * @param {import('vue').Ref<string>|string | string[]} [pk] - The primary key of the object
 * @param {import('@vueda/use/useObjectForm.js').ObjectFormState|null} [objectFormState] - The reactive state of the object form.
 */
export function useWarnings(app, model, formContext, view, pk, objectFormState = null) {
    if (!isUsingWarnings) {
        return;
    }
    if (!view) {
        view = ref(null);
    } else {
        if (!isRef(view)) {
            view = ref(view);
        }
    }
    const loadingError = useLoadingError();
    const state = reactive({
        formValidationErrors: {},
        loading: loadingError.loading,
        errored: loadingError.errored,
        error: loadingError.error,
        responseData: null,
    });
    const objectFormLoadingState = objectFormState ? toRef(objectFormState, "loading") : ref(false);
    let promise = null;
    const isActive = useIsActive();
    function retrieveFn(args) {
        if (promise) {
            return promise;
        }
        if (state.loading) {
            return Promise.reject(new ObjectError("already loading.", "already-loading"));
        }
        loadingError.setLoading();
        loadingError.clearError();
        promise = warningsFetch(args.app, args.model, args.action, args.pk, args.detailed)
            .then((object) => {
                state.responseData = object;
                return Promise.resolve(true);
            })
            .catch((error) => {
                loadingError.setError(error);
                return Promise.resolve(false);
            })
            .finally(() => {
                loadingError.clearLoading();
                promise = null;
            });
        return promise;
    }

    watch(
        [isActive, app, model, view, pk, objectFormLoadingState],
        async (
            [newIsActive, newApp, newModel, newView, newPk, newFormLoading],
            [oldActive, oldApp, oldModel, oldView, oldPk, oldFormLoading],
        ) => {
            if (!newIsActive) {
                return; // we'll pick up again when the component is active
            }
            if (
                oldActive === newIsActive &&
                newApp === oldApp &&
                newModel === oldModel &&
                newView === oldView &&
                newPk === oldPk &&
                newFormLoading === oldFormLoading
            ) {
                return;
            }
            if (newApp && newModel && newView) {
                // not detailed meaning it is bulk. we don't deal with list/target less yet.
                const detailed = newView === "update";
                if (newPk) {
                    const args = { app: newApp, model: newModel, action: newView, pk: newPk, detailed };
                    await retrieveFn(args);
                    if (state.errored) {
                        const error = state.error;
                        const handled = await OnRetrieveErrorHandler({
                            error,
                            formContext,
                            state,
                        });
                        if (handled) {
                            loadingError.clearError();
                        }
                    } else {
                        state.formValidationErrors = {};
                    }
                }
            }
        },
        { immediate: true },
    );

    watch(
        toRef(formContext.state, "initialValues"),
        (initialValues) => {
            // the form is reset when initialValues changes, therefore we need to set the errors and warnings again.
            if (initialValues && Object.entries(state.formValidationErrors).length > 0) {
                formContext.handleServerFormValidationError(state.formValidationErrors);
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );
}
