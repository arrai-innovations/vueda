/**
 * @module use/useLeaveUnload
 * @description Warns the user via a confirmation dialog when they attempt to navigate away or close the tab while there are unsaved form changes.
 */
import { useIsActive } from "@vueda/use/useIsActive.js";
import { onMounted, onUnmounted, unref } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";

/**
 * @typedef {import('vue').Reactive} UseLeaveUnloadReactiveProps
 * @property {boolean|import('vue').Ref<boolean>} modified - Whether the form has changes to be lost.
 * @property {boolean|import('vue').Ref<boolean>} loading - Whether the form is being processed currently.
 */

/**
 * @typedef {object} UseLeaveUnloadRefsProps
 * @property {import('vue').Ref<boolean>} modified - Whether the form has changes to be lost.
 * @property {import('vue').Ref<boolean>} loading - Whether the form is being processed currently.
 */

/**
 * A hook that listens for route changes and warns the user if they have unsaved changes.
 *
 * @param {UseLeaveUnloadReactiveProps|UseLeaveUnloadRefsProps} props - The reactive state to condition the unsaved
 *  changes popup on.
 * @returns {void}
 */
export function useLeaveUnload(props) {
    const isActive = useIsActive();

    const beforeRouteLeaveListener = () => {
        if (isActive.value && unref(props.modified) && !unref(props.loading)) {
            const answer = window.confirm("You have unsaved changes, are you sure to leave?");
            // cancel the navigation and stay on the same page
            if (!answer) {
                return false;
            }
        }
    };
    const beforeUnloadListener = (event) => {
        if (isActive.value && unref(props.modified) && !unref(props.loading)) {
            if (import.meta.env.DEV) {
                // these tend to stack up in auto reloading dev, which is annoying
                return;
            }
            event.preventDefault();
            event.returnValue = "You have unsaved changes, are you sure to leave?";
        }
    };
    onBeforeRouteUpdate(beforeRouteLeaveListener);
    onBeforeRouteLeave(beforeRouteLeaveListener);
    onMounted(() => {
        window.addEventListener("beforeunload", beforeUnloadListener);
    });
    onUnmounted(() => {
        window.removeEventListener("beforeunload", beforeUnloadListener);
    });
}
