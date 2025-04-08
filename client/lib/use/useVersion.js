import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { VITE_PACKAGE_VERSION } from "@vueda/utils/constants.js";
import { VersionSymbol } from "@vueda/utils/symbols.js";
import { getUrl } from "@vueda/utils/urls.js";
import semvarGT from "semver/functions/gt.js";
import { computed, inject, onMounted, provide, readonly, ref } from "vue";

let serverVersionUrl = "";
/* global  __VUEDA_CLIENT_VERSION__ */
const vuedaClientVersion = typeof __VUEDA_CLIENT_VERSION__ !== "undefined" ? __VUEDA_CLIENT_VERSION__ : "";

export const setServerVersionUrl = (url) => {
    serverVersionUrl = url;
};
/**
 * Fetch the server version from vueda server info.
 *
 * @returns {Promise<string>} The vueda server version.
 */
async function fetchVuedaServerVersion() {
    const serverInfoUrl = `${httpOrHttpsHostname}${getUrl("infoServer")}`;
    const response = await fetch(serverInfoUrl);
    const data = await response.json();
    return data.server_version;
}

/**
 * Fetch the server version from server info.
 *
 * @returns {Promise<string>} The server version.
 */
async function fetchMyServerVersion() {
    if (serverVersionUrl) {
        const url = `${httpOrHttpsHostname}${serverVersionUrl}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.server_version;
    }
    return "";
}
/**
 * @typedef {Readonly<{
 *     serverVersion: import('vue').Ref<string>,
 *     clientVersion: import('vue').Ref<string>,
 *     myVersion: string,
 *     myServerVersion: import('vue').Ref<string>,
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
        const myServerVersion = ref("");
        const clientVersion = ref("");
        const newClientAvailable = computed(
            () => clientVersion.value && VITE_PACKAGE_VERSION && semvarGT(clientVersion.value, VITE_PACKAGE_VERSION),
        );

        onMounted(async () => {
            serverVersion.value = await fetchVuedaServerVersion();
            myServerVersion.value = await fetchMyServerVersion();
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
            clientVersion: vuedaClientVersion,
            myVersion: VITE_PACKAGE_VERSION,
            myServerVersion,
            newClientAvailable,
        });
        provide(VersionSymbol, version);
    }

    return version;
}
