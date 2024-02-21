import { useToast } from "@vueda/use/useToast.js";
import { VITE_PACKAGE_VERSION } from "@vueda/utils/index.js";
import semvarGT from "semver/functions/gt.js";
import { computed, inject, provide, readonly, ref, watch } from "vue";

// import dispatcher from "@vueda/utils/dispatcher";

export const VersionSymbol = Symbol("version");

export default function useVersion() {
    let version = inject(VersionSymbol, null);

    if (version === null) {
        const toastId = ref(null);
        const serverVersion = ref("");
        const clientVersion = ref("");
        const newClientAvailable = computed(
            () => clientVersion.value && VITE_PACKAGE_VERSION && semvarGT(clientVersion.value, VITE_PACKAGE_VERSION),
        );
        const toast = useToast();
        // todo: we have yet to decide how to implement dispatcher
        // const onVersion = (event) => {
        //     const data = event.detail;
        //     if (data.server_version && serverVersion.value !== data.server_version) {
        //         serverVersion.value = data.server_version;
        //     }
        //     if (data.client_version && clientVersion.value !== data.client_version) {
        //         clientVersion.value = data.client_version;
        //     }
        // };
        // dispatcher.addEventListener("version", onVersion);
        // onBeforeUnmount(() => {
        //     dispatcher.removeEventListener("version", onVersion);
        // });
        watch(newClientAvailable, (newClientAvailable) => {
            if (newClientAvailable && !toastId.value) {
                toastId.value = toast.addToast({
                    message: "A new version of the client is available. Please refresh the page to update.",
                    variant: "info",
                    dismissible: false,
                });
            }
            if (!newClientAvailable && toastId) {
                toast.removeToast(toastId);
                toastId.value = null;
            }
        });
        version = readonly({
            serverVersion,
            clientVersion,
            myVersion: VITE_PACKAGE_VERSION,
            newClientAvailable,
            toastId,
        });
        provide(VersionSymbol, version);
    }

    return version;
}
