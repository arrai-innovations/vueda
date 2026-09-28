/**
 * @module router/guards
 * @description Vue Router navigation guards for enforcing authentication, group membership, and model info availability.
 */
import { toast } from "@arrai-innovations/vue-sonner";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { ModelInfoError, storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { storeUser } from "@vueda/stores/storeUser.js";
import { WorkflowPermissionDeniedError, storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { AuthScopeInvalidatedError } from "@vueda/utils/errors.js";
import isEmpty from "lodash-es/isEmpty.js";

/**
 * Convert transition objects into route-action identifiers.
 * Transition `code` is the canonical machine identifier; `name` is display text only.
 *
 * @param {{code?: string, name?: string}[]} transitions
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
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<[import('@vueda/stores/storeModelInfo.js').ModelInfo, import('@vueda/stores/storeModelConfig.js').ModelConfig,import('@vueda/stores/storeworkflow.js').workflowTransitions]>}
 */
export async function waitForModelStoreLoad(app, model, pinia) {
    // ##############################################################################################################
    // # don't use useModelInfo or useModelConfig here to avoid creating reactive effects outside a component scope #
    // ##############################################################################################################
    const args = { app, model };
    const modelInfoStore = storeModelInfo(pinia);
    const infoStore = await modelInfoStore.fetchModelInfo(args);
    // Reads `workflowEnabled` from the model info fetched above, and requests nothing for a model without workflow.
    const modelWorkflowStore = storeWorkflow(pinia);
    const transitions = await modelWorkflowStore.fetchWorkflowTransition(app, model);
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
 * @param {{ severity?: string, summary: string, detail?: string, life?: number }} toastArgs - Toast message options.
 * @param {string[]} groups - The groups the user must belong to at least one.
 * @param {import('vue-router').RouteLocationRaw} redirectTo - Where to redirect if not authorized.
 * @param {import('vue-router').RouteLocationNormalizedLoaded} to - The target route.
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<boolean|import('vue-router').RouteLocationNormalizedLoaded>} True if authorized, or redirect route.
 */
export async function requireGroups(instance, toastArgs, groups, redirectTo, to, router, pinia) {
    const userStore = await waitForInitialising(pinia);
    if (isEmpty(groups)) {
        return true;
    }
    if (userStore.loggedInUser?.is_superuser) {
        return true;
    }
    if (groups.some((group) => userStore.loggedInUser?.groups?.includes(group))) {
        return true;
    }
    const severity = toastArgs.severity === "warn" ? "warning" : toastArgs.severity || "error";
    toast[severity](toastArgs.summary, {
        description: `${toastArgs.detail} ${to.fullPath}`,
        ...(toastArgs.life != null && { duration: toastArgs.life }),
    });
    return resolveRedirect(redirectTo, router);
}

/**
 * Require model info to be loaded before accessing the route.
 *
 * @param {import('vue').App} instance - The Vue app instance.
 * The route's action is allowed when model info lists it (narrowed by the model config's `routeActions`) or
 * when it is a workflow transition code the user may take. When the server denies workflow discovery for the
 * model with a 403, the model's CRUD actions still follow model info, and only transition routes are refused.
 *
 * @param {import('vue-router').RouteLocationRaw} redirectTo - Where to redirect if model info not found, the
 *  action is not allowed, or the route is a transition and workflow discovery is denied.
 * @param {import('vue-router').RouteLocationNormalizedLoaded} to - The target route.
 * @param {import('vue-router').Router} router - The router instance.
 * @param {import('pinia').Pinia} pinia - The Pinia instance.
 * @returns {Promise<boolean|import('vue-router').RouteLocationNormalizedLoaded>} `true` when the model exists
 *  and the action is allowed, a redirect route when it does not, or `false` to cancel the navigation because
 *  the authenticated user changed while the metadata was being fetched.
 */
export async function requireModelInfo(instance, redirectTo, to, router, pinia) {
    try {
        const args = { app: to.params.app, model: to.params.model };
        let infoStore;
        let configStore;
        let transitionStore;
        let workflowDenial = null;
        try {
            [infoStore, configStore, transitionStore] = await waitForModelStoreLoad(args.app, args.model, pinia);
        } catch (e) {
            if (!(e instanceof WorkflowPermissionDeniedError)) {
                throw e;
            }
            // Workflow discovery grants transitions only. Its denial stays recorded in the workflow store,
            // and model info, which loaded first, still decides the model's CRUD actions, as it does for a
            // model without a workflow.
            workflowDenial = e;
            infoStore = await storeModelInfo(pinia).fetchModelInfo(args);
            configStore = await storeModelConfig(pinia).getConfig(args);
        }
        // Validated even when the route is a CRUD action, so a malformed transition surfaces on first use.
        const transitionCodes = transitionStore ? getTransitionActionCodes(transitionStore) : [];
        let actions = infoStore.actions.map((action) => action.name);
        if (Array.isArray(configStore.routeActions)) {
            actions = actions.filter((action) => configStore.routeActions.includes(action));
        }
        const actionName = getActionName(to.params.action);
        if (actions.includes(actionName)) {
            return true;
        }
        if (workflowDenial) {
            // The route is not a CRUD action this user has, so it can only be a transition, and the server
            // denied the discovery that would name the transitions this user may take.
            toast.error("Permission Denied", {
                description:
                    workflowDenial.responseData?.detail ?? "You do not have permission to perform this action.",
                duration: 15000,
            });
            return resolveRedirect(redirectTo, router);
        }
        if (transitionCodes.includes(actionName)) {
            return true;
        }
        toast.error("Action Not Found");
        return resolveRedirect(redirectTo, router);
    } catch (e) {
        if (e instanceof AuthScopeInvalidatedError) {
            // The authenticated user changed while this navigation was resolving, so the metadata it
            // needed was discarded rather than cached. Cancel the navigation silently. Vue Router
            // reads every return but `false` as approval, and this guard cannot approve a route it
            // only ever checked against the previous user. `makeCRUDRoutes` rechecks the route the
            // application is left on when the principal changes, so that recheck decides where the
            // application goes, and there is nothing to tell the user about here.
            return false;
        }
        if (e instanceof ModelInfoError) {
            toast.error("Model Not Found");
            return resolveRedirect(redirectTo, router);
        }
        throw e;
    }
}
