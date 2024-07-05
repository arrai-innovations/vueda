import { readonly, ref } from "vue";

/**
 * @typedef {object} LoadingError
 * @property {Readonly<import('vue').Ref<boolean>>} loading - True if the model config is loading.
 * @property {Readonly<import('vue').Ref<Error>>} error - The error that occurred while loading the model config.
 * @property {Readonly<import('vue').Ref<boolean>>} errored - True if an error occurred while loading the model config.
 * @property {()=>void} clearError - Clear the error.
 * @property {()=>void} clearLoading - Clear the loading state.
 * @property {(e: Error) => void} setError - Set the error.
 * @property {()=>void} setLoading - Set the loading state.
 */

/**
 * This composable provides a reactive loading state and error state.
 *
 * @return {LoadingError} The loading and error.
 */
export default function useLoadingError() {
    const loading = ref(false);
    const error = ref(null);
    const errored = ref(false);
    // this is meant to be used in other composable functions
    // be ready to be included in their reactive return objects
    return {
        loading: readonly(loading),
        error: readonly(error),
        errored: readonly(errored),
        setLoading: () => {
            loading.value = true;
        },
        clearLoading: () => {
            loading.value = false;
        },
        setError: (e) => {
            error.value = e;
            errored.value = true;
        },
        clearError: () => {
            error.value = null;
            errored.value = false;
        },
    };
}
