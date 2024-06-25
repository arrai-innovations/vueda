import { readonly, ref } from "vue";

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
