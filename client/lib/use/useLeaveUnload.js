import { useIsActive } from "@vueda/use/useIsActive.js";
import { onMounted, onUnmounted } from "vue";
import { onBeforeRouteLeave } from "vue-router";

export function useLeaveUnload(state) {
    const isActive = useIsActive();

    const beforeRouteLeaveListener = () => {
        if (isActive.value && state.isModified && !state.submitting) {
            const answer = window.confirm("You have unsaved changes, are you sure to leave?");
            // cancel the navigation and stay on the same page
            if (!answer) {
                return false;
            }
        }
    };
    const beforeUnloadListener = (event) => {
        if (isActive.value && state.isModified && !state.submitting) {
            if (import.meta.env.DEV) {
                // these tend to stack up in auto reloading dev, which is annoying
                console.log("unload unsaved changes would have fired");
                return;
            }
            event.preventDefault();
            event.returnValue = "You have unsaved changes, are you sure to leave?";
        }
    };
    onBeforeRouteLeave(beforeRouteLeaveListener);
    onMounted(() => {
        window.addEventListener("beforeunload", beforeUnloadListener);
    });
    onUnmounted(() => {
        window.removeEventListener("beforeunload", beforeUnloadListener);
    });
}
