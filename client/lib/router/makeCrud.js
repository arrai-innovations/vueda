/**
 * @module router/makeCrud
 * @description Generates Vue Router route records for CRUD views with configurable auth and group guards.
 */
import { requireAuth, requireGroups, requireModelInfo } from "@vueda/router/guards.js";
import { storeUser } from "@vueda/stores/storeUser.js";
import { watch } from "vue";

/**
 * Run the configured checks against a target route, in order, and return the first result that is
 * not an approval.
 *
 * @param {import('vue-router').RouteLocationNormalized} to - The target route.
 * @param {((to: import('vue-router').RouteLocationNormalized) => any)[]} beforeEnter - The checks to run, in order.
 * @returns {Promise<true|import('vue-router').RouteLocationNormalizedLoaded|false>} `true` when every
 *  check approves the route, a redirect location from the first check that denies it, or `false` when
 *  a check could not answer for the current user.
 */
async function runAccessChecks(to, beforeEnter) {
    for (const check of beforeEnter) {
        const result = await check(to);
        if (result === true || result === undefined) {
            continue;
        }
        return result;
    }
    return true;
}

/**
 * Recheck access on a navigation that stays inside one of the generated route records.
 *
 * Vue Router runs `beforeEnter` only when a navigation enters a route record. Both generated records
 * are shared by every app, model, and action they route to, so a navigation that changes which app,
 * model, or action is targeted, for example from an allowed model to a denied one, can stay inside
 * the same record and never rerun `beforeEnter`. This registers the same checks as a `beforeEach`
 * guard instead, so they also run on that kind of navigation. A navigation that leaves the app, model,
 * and action unchanged, for example a query-only change or a primary key change on an otherwise
 * identical action, skips the checks, since nothing about the checked metadata depends on either.
 *
 * @param {import('vue-router').RouteLocationNormalized} to - The target route.
 * @param {import('vue-router').RouteLocationNormalized} from - The route being left.
 * @param {((to: import('vue-router').RouteLocationNormalized) => any)[]} beforeEnter - The checks to run, in order.
 * @param {Set<string>} generatedRouteNames - The names of the two generated route records.
 * @returns {true|Promise<true|import('vue-router').RouteLocationNormalizedLoaded|false>} `true` when
 *  the target is not a generated route, or the checks do not need to rerun; otherwise the checks'
 *  result.
 */
function recheckOnNavigation(to, from, beforeEnter, generatedRouteNames) {
    if (!generatedRouteNames.has(to.name)) {
        return true;
    }
    if (
        generatedRouteNames.has(from.name) &&
        to.params.app === from.params.app &&
        to.params.model === from.params.model &&
        to.params.action === from.params.action
    ) {
        return true;
    }
    return runAccessChecks(to, beforeEnter);
}

/**
 * Run the generated routes' guard chain against the route the application is already on.
 *
 * A `beforeEach` guard reruns the same checks on navigation, and a change of authenticated user is
 * not a navigation. Nothing else rechecks the view on screen for that case, so this reruns the same
 * checks in the same order and acts on the first one that denies the route.
 *
 * @param {import('vue-router').Router} router
 * @param {((to: import('vue-router').RouteLocationNormalized) => any)[]} beforeEnter
 * @param {Set<string>} generatedRouteNames
 * @param {import('@vueda/stores/storeUser.js').UserStore} userStore
 * @returns {Promise<void>}
 */
async function recheckCurrentRoute(router, beforeEnter, generatedRouteNames, userStore) {
    const to = router.currentRoute.value;
    if (!generatedRouteNames.has(to.name)) {
        // the application is on one of its own routes rather than a generated one, and these
        // checks have nothing to say about it
        return;
    }
    const generation = userStore.identityGeneration;
    for (const check of beforeEnter) {
        const result = await check(to);
        if (userStore.identityGeneration !== generation) {
            // another user change landed while this check was resolving, so this answer describes a
            // user who is already gone. The recheck that change triggered decides instead.
            return;
        }
        if (router.currentRoute.value.fullPath !== to.fullPath) {
            // the application navigated while this check was resolving, and that navigation ran the
            // same chain on entry. Redirecting now would override a newer decision.
            return;
        }
        if (result === false) {
            // the check could not answer for the current user
            return;
        }
        if (result === true || result === undefined) {
            continue;
        }
        // `replace` rather than `push`, so the back button does not return to a route this user has
        // just been denied
        await router.replace(result);
        return;
    }
}

/**
 * Generate CRUD routes for a given app and model.
 *
 * Call this once during application setup and register the two records it returns. Besides building
 * them, it registers the configured checks as a `beforeEach` guard, so a navigation that changes the
 * app, model, or action reruns them even when it stays inside one of the two records, and it starts
 * watching for a change of authenticated user. When one happens while the application sits on one of
 * these routes, it reruns the same checks against that route and redirects if the new user may not
 * use it. Neither of those reruns the checks for a navigation that only changes the query string or
 * the primary key, since nothing about the checked metadata depends on either.
 *
 * @param {object} params - The parameters.
 * @param {object} params.component - The component to use for the routes.
 * @param {string} [params.pathPrefix=''] - The prefix to add to the path.
 * @param {string} [params.authRedirect=null] - The route to redirect to if the user is not authenticated.
 * @param {string[]} [params.groups=null] - The groups required to access the views.
 * @param {object} [params.groupsRedirect=null] - The route to redirect to if the user is not in the required groups.
 * @param {object} params.actionRedirect - The route to redirect if model/action not found.
 * @param {import('vue').App} params.vueApp - The Vue app instance.
 * @param {import('vue-router').Router} params.router - The Vue router instance.
 * @param {import('pinia').Pinia} params.pinia - The Pinia instance.
 * @returns {import('vue-router').RouteLocationNormalized[]} The generated routes.
 * @example
 * ```js
 * import { createRouter, createWebHistory } from 'vue-router';
 * import ActionView from '@/views/ActionView.vue';
 * import { makeCRUDRoutes } from '@vueda/router/makeCrud.js';
 *
 * const router = createRouter({ history: createWebHistory(), routes: [] });
 *
 * // In your app setup (after createApp):
 * router.addRoute(...makeCRUDRoutes({
 *     component: ActionView,
 *     vueApp: app,
 *     router,
 *     pinia,
 *     authRedirect: { name: 'login' },
 *     actionRedirect: { name: 'not-found' },
 * }));
 * ```
 */
export function makeCRUDRoutes({
    component,
    authRedirect = null,
    groups = null,
    groupsRedirect = null,
    actionRedirect = null,
    pathPrefix = "",
    vueApp,
    router,
    pinia,
}) {
    if (!actionRedirect) {
        throw new Error(
            "makeCRUDRoutes: actionRedirect is required (e.g. { name: 'not-found' }) so guards can redirect on missing model/action.",
        );
    }
    const beforeEnter = [];
    if (authRedirect) {
        beforeEnter.push((to) => requireAuth(authRedirect, to, router, pinia));
    }

    beforeEnter.push((to) => requireModelInfo(vueApp, actionRedirect, to, router, pinia));

    if (groups) {
        beforeEnter.push((to) =>
            requireGroups(
                vueApp,
                {
                    summary: "Permission Denied",
                    detail: "You do not have permission to access",
                    severity: "error",
                },
                groups,
                groupsRedirect,
                to,
                router,
                pinia,
            ),
        );
    }

    const routeDetail = {
        name: "actionrouter.detailview",
        path: `/:app/:model/:action/:pk`,
        component,
        /** @type {{[key: string]: any}} */
        props: (route) => ({
            app: route.params.app,
            model: route.params.model,
            action: route.params.action,
            pk: route.params.pk,
        }),
        meta: {
            detail: true,
        },
    };

    const routeNonDetail = {
        name: "actionrouter.listview",
        path: `/:app/:model/:action/`,
        component,
        props: (route) => ({
            app: route.params.app,
            model: route.params.model,
            action: route.params.action,
            pk: route.query?.pk?.split(","),
        }),
    };

    if (pathPrefix) {
        routeNonDetail.path = `/${pathPrefix}${routeNonDetail.path}`;
        routeDetail.path = `/${pathPrefix}${routeDetail.path}`;
    }

    const generatedRouteNames = new Set([routeDetail.name, routeNonDetail.name]);
    router.beforeEach((to, from) => recheckOnNavigation(to, from, beforeEnter, generatedRouteNames));

    const userStore = storeUser(pinia);
    // The application registers these records once, so this watch is the only place that can notice a
    // user change on its behalf. It lives as long as the store it watches, which is the lifetime of
    // the application that called this.
    watch(
        () => userStore.identityGeneration,
        () => {
            // `identityGeneration` is incremented after the authorization-dependent caches are
            // dropped, so the checks below refetch metadata for the user who is authenticated now.
            recheckCurrentRoute(router, beforeEnter, generatedRouteNames, userStore);
        },
    );

    return [routeDetail, routeNonDetail];
}
