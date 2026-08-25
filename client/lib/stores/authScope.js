/**
 * @module stores/authScope
 * @description Registry of the stores whose cached data is filtered by the authenticated user's
 * permissions, and the single call that drops all of it when the authenticated user changes.
 */
import { storeModelChoices } from "@vueda/stores/storeModelChoices.js";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { getActivePinia } from "pinia";

/**
 * The stores that cache authorization-dependent server responses.
 *
 * Every one of them exposes a `clearAuthScoped()` action that empties its caches in place and
 * invalidates its in-flight requests. None of them may import `storeUser` or this module: the import
 * direction is `storeUser -> authScope -> these stores`, and the build fails the circular-dependency
 * check if that is reversed.
 *
 * @type {import('pinia').StoreDefinition[]}
 */
const authScopedStores = [storeModelInfo, storeModelConfig, storeWorkflow, storeModelChoices];

/**
 * Drop every cached authorization-dependent response, because the authenticated user changed.
 *
 * Stores the application never used are left alone rather than being instantiated just to be
 * cleared, so this is safe to call in an application that uses none of them.
 *
 * @param {import('pinia').Pinia} [pinia] - The Pinia instance holding the stores. Defaults to the
 *  active instance, which is the correct one outside of multi-instance setups such as SSR.
 * @returns {void}
 */
export function clearAuthScopedStores(pinia) {
    const resolvedPinia = pinia ?? getActivePinia();
    for (const useStore of authScopedStores) {
        if (resolvedPinia && !(useStore.$id in resolvedPinia.state.value)) {
            // never instantiated by this application, so it holds nothing to clear
            continue;
        }
        useStore(resolvedPinia).clearAuthScoped();
    }
}
