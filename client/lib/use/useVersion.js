import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { VITE_PACKAGE_VERSION } from "@vueda/utils/constants.js";
import { VersionSymbol } from "@vueda/utils/symbols.js";
import { getUrl } from "@vueda/utils/urls.js";
import semvarGT from "semver/functions/gt.js";
import { computed, inject, onMounted, provide, readonly, ref } from "vue";

/**
 * Fetch the server version from server info.
 *
 * @returns {Promise<string>} The server version.
 */
async function fetchServerVersion() {
    const serverInfoUrl = `${httpOrHttpsHostname}${getUrl("infoServer")}`;
    const response = await fetch(serverInfoUrl);
    const data = await response.json();
    return data.server_version;
}
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

        onMounted(async () => {
            serverVersion.value = await fetchServerVersion();
        });
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
