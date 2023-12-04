import semvarGT from "semver/functions/gt";
import { computed, onBeforeUnmount, readonly, ref, watch } from "vue";

import { useToasts } from "@/use/toasts";
import dispatcher from "@/utils/dispatcher";

const VITE_PACKAGE_VERSION = import.meta.env.VITE_PACKAGE_VERSION;

const myVersion = VITE_PACKAGE_VERSION;
const serverVersion = ref("");
const clientVersion = ref("");
const newClientAvailable = computed(() => clientVersion.value && myVersion && semvarGT(clientVersion.value, myVersion));

const onVersion = (event) => {
    const data = event.detail;
    if (data.server_version && serverVersion.value !== data.server_version) {
        serverVersion.value = data.server_version;
    }
    if (data.client_version && clientVersion.value !== data.client_version) {
        clientVersion.value = data.client_version;
    }
};

let toastId = null;

export function useVersions() {
    const toasts = useToasts();
    dispatcher.addEventListener("version", onVersion);
    onBeforeUnmount(() => {
        dispatcher.removeEventListener("version", onVersion);
    });
    watch(newClientAvailable, (newClientAvailable) => {
        if (newClientAvailable && !toastId) {
            toastId = toasts.addToast({
                message: "A new version of the client is available. Please refresh the page to update.",
                variant: "info",
                dismissible: false,
            });
        }
        if (!newClientAvailable && toastId) {
            toasts.removeToast(toastId);
            toastId = null;
        }
    });
    return readonly({
        serverVersion,
        clientVersion,
        myVersion,
        newClientAvailable,
    });
}
