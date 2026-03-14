/**
 * @module router/guards
 * @description Vue Router navigation guards for enforcing authentication, group membership, and model info availability.
 */
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { ModelInfoError, storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { storeUser } from "@vueda/stores/storeUser.js";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import isEmpty from "lodash-es/isEmpty.js";

/**
 * Convert transition objects into route-action identifiers.
 * Transition `code` is the canonical machine identifier; `name` is display text only.
 *
 * @param {Array<{code?: string, name?: string}>} transitions
 * @returns {string[]}
 */
function getTransitionActionCodes(transitions) {
    return transitions.map((transition) => {
        if (!transition?.code || typeof transition.code !== "string") {
            throw new Error(
                `requireModelInfo: workflow transition is missing a string code: ${JSON.stringify(transition)}`,
            );
        }
        return transition.code;
    });
}

/**
 * Wait for the user to be initialized. This is useful if you're making your own
 * custom guards that need to know if the user is logged in or not.
 *
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<import('@vueda/stores/storeUser.js').UserStore>} The user store.
 */
export async function waitForInitialising(pinia) {
    const userStore = storeUser(pinia);
    if (!userStore.initialized) {
        await userStore.fetchCurrentUser();
    }
    return userStore;
}

/**
 *  Wait for store model config to load
 * @param app {string} The app name.
 * @param model {string} The model name.
 * @param pinia {import('pinia').Pinia} The Pinia instance.
 * @returns {Promise<[import('@vueda/stores/storeModelInfo.js').ModelInfo, import('@vueda/stores/storeModelConfig.js').ModelConfig,import('@vueda/stores/storeworkflow.js').workflowTransitions]>}
 */
export async function waitForModelStoreLoad(app, model, pinia) {
    // ##############################################################################################################
    // # don't use useModelInfo or useModelConfig here to avoid creating reactive effects outside a component scope #
    // ##############################################################################################################
    const args = { app, model };
    const modelWorkflowStore = storeWorkflow(pinia);
    const transitions = await modelWorkflowStore.fetchWorkflowTransition(app, model);
    const modelInfoStore = storeModelInfo(pinia);
    const infoStore = await modelInfoStore.fetchModelInfo(args);
    const modelConfig = storeModelConfig(pinia);
    const configStore = await modelConfig.getConfig(args);
    return [infoStore, configStore, transitions];
}

/**
 * Resolve a redirect object with the router.
 *
 * @param {(import('vue-router').RouteLocationRaw|string)} redirectTo - The redirect object or path.
 * @param {import('vue-router').Router} router - The router instance.
 * @returns {import('vue-router').RouteLocationNormalizedLoaded} The resolved redirect object.
 */
function resolveRedirect(redirectTo, router) {
    return router.resolve(redirectTo);
}

/**
 * Require the user to be authenticated.
 *
 * @example
 * ```js
 * import { requireAuth } from "@vueda/router/guards";
 * import { createRouter, createWebHistory } from "vue-router";
 *
 * const router = createRouter({
 *   history: createWebHistory(import.meta.env.BASE_URL),
 *   routes: [
 *     {
 *       path: '/auth-required/',
 *       name: 'auth-required',
 *       component: () => import('@/views/ViewAuthRequired.vue'),
 *       beforeEnter: (to, from) => requireAuth({ name: "log-in" }, to, router),
 *     },
 *     // other routes
 *   ],
 * });
 *
 * export default router;
 * ```
 * @param {import('vue-router').RouteLocationRaw} redirectTo - Where to redirect if not authenticated.
 * @param {import('vue-router').RouteLocationNormalized} to - The target route.
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<import('vue-router').RouteLocationNormalizedLoaded|void>} The redirect route if needed.
 */
export async function requireAuth(redirectTo, to, router, pinia) {
    const resolvedRedirectTo = resolveRedirect(redirectTo, router);
    const userStore = await waitForInitialising(pinia);
    if (!userStore.loggedIn) {
        return { ...resolvedRedirectTo, query: { ...resolvedRedirectTo.query, redirect: to.fullPath } };
    }
}

/**
 * Require the user to be recently authenticated.
 *
 * @example
 * ```js
 * import { requireRecentAuth } from "@vueda/router/guards";
 * import { createRouter } from "vue-router";
 *
 * const router = createRouter({
 *   routes: [
 *     {
 *       path: "/:app/:model/setup",
 *       name: "setup-device",
 *       component: () => import('@/views/ViewAuthRequired.vue'),
 *       beforeEnter: (to, from) => requireRecentAuth({ name: "reauthenticate" }, to, router),
 *     },
 *     // other routes
 *   ],
 * });
 *
 * export default router;
 * ```
 * @param {import('vue-router').RouteLocationRaw} redirectTo - Where to redirect if not recently authenticated.
 * @param {import('vue-router').RouteLocationNormalized} to - The target route.
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<import('vue-router').RouteLocationNormalizedLoaded|void>} The redirect route if needed.
 */
export async function requireRecentAuth(redirectTo, to, router, pinia) {
    const resolvedRedirectTo = resolveRedirect(redirectTo, router);
    const userStore = storeUser(pinia);
    if (userStore.recentlyLoggedIn !== false) {
        await userStore.fetchCurrentUser();
    }
    if (!userStore.recentlyLoggedIn) {
        return { ...resolvedRedirectTo, query: { ...resolvedRedirectTo.query, redirect: to.fullPath } };
    }
}

/**
 * Require the user to be unauthenticated, like for a login page.
 *
 * @example
 * ```js
 * import { requireUnauth } from "@vueda/router/guards";
 * import { createRouter, createWebHistory } from "vue-router";
 *
 * const router = createRouter({
 *   history: createWebHistory(import.meta.env.BASE_URL),
 *   routes: [
 *     {
 *       path: '/unauth-required/',
 *       name: 'unauth-required',
 *       component: () => import('@/views/ViewUnauthRequired.vue'),
 *       beforeEnter: (to, from) => requireUnauth({ name: "welcome" }, router),
 *     },
 *     // other routes
 *   ],
 * });
 *
 * export default router;
 * ```
 * @param {import('vue-router').RouteLocationRaw} redirectTo - Where to redirect if authenticated.
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<import('vue-router').RouteLocationNormalizedLoaded|void>} The redirect route if needed.
 */
export async function requireUnauth(redirectTo, router, pinia) {
    const userStore = await waitForInitialising(pinia);
    if (userStore.loggedIn) {
        return resolveRedirect(redirectTo, router);
    }
}

/**
 * Require the user to be initialized, in order to optionally show or use the
 * user object, but not requiring authentication.
 *
 * @example
 * ```js
 * import { requireInitialized } from "@vueda/router/guards";
 * import { createRouter, createWebHistory } from "vue-router";
 *
 * const router = createRouter({
 *   history: createWebHistory(import.meta.env.BASE_URL),
 *   routes: [
 *     {
 *       path: '/initialized-required/',
 *       name: 'initialized-required',
 *       component: () => import('@/views/ViewInitializedRequired.vue'),
 *       beforeEnter: (to, from) => requireInitialized(),
 *     },
 *     // other routes
 *   ],
 * });
 *
 * export default router;
 * ```
 * @param {import('vue-router').Router} _router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<void>}
 */
export async function requireInitialized(_router, pinia) {
    await waitForInitialising(pinia);
}

/**
 * Require the user to have certain groups, or show a toast message for denial.
 *
 * @example
 * ```js
 * import { requireGroups } from "@vueda/router/guards";
 * import { createRouter, createWebHistory } from "vue-router";
 *
 * const toastArgs = {
 *   summary: "Permission Denied",
 *   detail: "You do not have permission to access",
 *   severity: "error",
 * };
 *
 * const router = createRouter({
 *   history: createWebHistory(import.meta.env.BASE_URL),
 *   routes: [
 *     {
 *       path: '/groups-required/',
 *       name: 'groups-required',
 *       component: () => import('@/views/ViewGroupsRequired.vue'),
 *       beforeEnter: (to, from) =>
 *         requireGroups(app, toastArgs, ["group1", "group2"], { name: "access-denied" }, to, router),
 *     },
 *     // other routes
 *   ],
 * });
 *
 * export default router;
 * ```
 * @param {import('vue').App} instance - The Vue app instance.
 * @param {import('primevue/toast').ToastMessageOptions} toastArgs - Toast message options.
 * @param {string[]} groups - The groups the user must belong to at least one.
 * @param {import('vue-router').RouteLocationRaw} redirectTo - Where to redirect if not authorized.
 * @param {import('vue-router').RouteLocationNormalizedLoaded} to - The target route.
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<boolean|import('vue-router').RouteLocationNormalizedLoaded>} True if authorized, or redirect route.
 */
export async function requireGroups(instance, toastArgs, groups, redirectTo, to, router, pinia) {
    const userStore = await waitForInitialising(pinia);
    /** @type {import('primevue/toastservice').ToastServiceMethods} */
    const toast = instance.config.globalProperties.$toast;
    if (isEmpty(groups)) {
        return true;
    }
    if (userStore.loggedInUser?.is_superuser) {
        return true;
    }
    if (groups.some((group) => userStore.loggedInUser?.groups?.includes(group))) {
        return true;
    }
    toast.add({
        ...toastArgs,
        detail: `${toastArgs.detail} ${to.fullPath}`,
    });
    return resolveRedirect(redirectTo, router);
}

/**
 * Require model info to be loaded before accessing the route.
 *
 * @param {import('vue').App} instance - The Vue app instance.
 * @param {import('vue-router').RouteLocationRaw} redirectTo - Where to redirect if model info not found or action not allowed.
 * @param {import('vue-router').RouteLocationNormalizedLoaded} to - The target route.
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<boolean|import('vue-router').RouteLocationNormalizedLoaded>} True if model info exists and action allowed, or redirect route.
 */
export async function requireModelInfo(instance, redirectTo, to, router, pinia) {
    const toast = instance.config.globalProperties.$toast;
    /** @type {import('primevue/toastservice').ToastServiceMethods} */
    try {
        const [infoStore, configStore, transitionStore] = await waitForModelStoreLoad(
            to.params.app,
            to.params.model,
            pinia,
        );
        let actions = infoStore.actions.map((action) => action.name);
        if (Array.isArray(configStore.routeActions)) {
            actions = actions.filter((action) => configStore.routeActions.includes(action));
        }
        if (transitionStore) {
            actions = actions.concat(getTransitionActionCodes(transitionStore));
        }
        const actionName = getActionName(to.params.action);
        if (actions.length && actions.includes(actionName)) {
            return true;
        } else {
            toast.add({
                summary: "Action Not Found",
                severity: "error",
            });
            return resolveRedirect(redirectTo, router);
        }
    } catch (e) {
        if (e instanceof ModelInfoError) {
            toast.add({
                summary: "Model Not Found",
                severity: "error",
            });
            return resolveRedirect(redirectTo, router);
        }
        throw e;
    }
}
