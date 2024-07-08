import { VITE_PACKAGE_VERSION } from "../utils/constants.js";
import { VersionSymbol } from "../utils/symbols.js";
import semvarGT from "semver/functions/gt.js";
import { computed, inject, provide, readonly, ref } from "vue";

/**
 * @typedef {Readonly<{
 *     serverVersion: import('vue').Ref<string>,
 *     clientVersion: import('vue').Ref<string>,
 *     myVersion: string,
 *     newClientAvailable: import('vue').ComputedRef<boolean>,
 *     toastId: import('vue').Ref<string | null>,
 * }>} VersionInstance
 */

/**
 * A composition function for tracking the server and client versions.
 *
 * @returns {VersionInstance} The version instance.
 */
export function useVersion() {
    let version = inject(VersionSymbol, null);

    if (version === null) {
        const serverVersion = ref("");
        const clientVersion = ref("");
        const newClientAvailable = computed(
            () => clientVersion.value && VITE_PACKAGE_VERSION && semvarGT(clientVersion.value, VITE_PACKAGE_VERSION),
        );
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
        version = readonly({
            serverVersion,
            clientVersion,
            myVersion: VITE_PACKAGE_VERSION,
            newClientAvailable,
        });
        provide(VersionSymbol, version);
    }

    return version;
}
