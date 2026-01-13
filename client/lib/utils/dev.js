import { watch } from "vue";

export const watchIfDev = (source, cb, options) => {
    if (import.meta.env.DEV) {
        return watch(source, cb, options);
    }
    return () => {};
};
