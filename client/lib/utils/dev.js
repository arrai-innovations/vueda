/**
 * @module utils/dev
 * @description Development-only utilities that are no-ops in production builds.
 */
import { watch } from "vue";

/**
 * Call `watch` only when running in development mode; returns a no-op stop handle in production.
 *
 * @param {import('vue').WatchSource|import('vue').WatchSource[]} source - The reactive source(s) to watch.
 * @param {import('vue').WatchCallback} cb - Callback invoked when the source changes.
 * @param {import('vue').WatchOptions} [options] - Options forwarded to `watch`.
 * @returns {import('vue').WatchStopHandle} A function that stops the watcher (or a no-op in production).
 */
export const watchIfDev = (source, cb, options) => {
    if (import.meta.env.DEV) {
        return watch(source, cb, options);
    }
    return () => {};
};
