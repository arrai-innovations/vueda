import { requireAuth, requireGroups, requireModelInfo } from "@vueda/router/guards.js";

/**
 * Generate CRUD routes for a given app and model.
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
        beforeEnter,
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
        beforeEnter,
    };

    if (pathPrefix) {
        routeNonDetail.path = `/${pathPrefix}${routeNonDetail.path}`;
        routeDetail.path = `/${pathPrefix}${routeDetail.path}`;
    }

    return [routeDetail, routeNonDetail];
}
