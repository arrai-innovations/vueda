import { isDetailView } from "@vueda/router/getCrud.js";
import { requireAuth, requireGroups } from "@vueda/router/guards.js";
import {
    getCapitalizedTitle,
    getClientRoutePart,
    getLowerTitle,
    getPluralizedTitle,
} from "@vueda/utils/crudSupport.js";
import partial from "lodash-es/partial.js";

/**
 * Generate CRUD routes for a given app and model.
 *
 * @param {object} params - The parameters.
 * @param {object} params.components - A map of components to use for the views, to avoid dynamic imports.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string[]} [params.views=['list', 'create', 'update', 'read']] - The views to generate routes for.
 * @param {object} [params.titles={}] - Custom titles for the views.
 * @param {string} [params.pathPrefix=''] - The prefix to add to the path.
 * @param {string} [params.authRedirect=null] - The route to redirect to if the user is not authenticated.
 * @param {string[]} [params.groups=null] - The groups required to access the views.
 * @param {object} [params.groupsRedirect=null] - The route to redirect to if the user is not in the required groups.
 * @param {import('vue').App} params.vueApp - The Vue app instance.
 * @returns {import('vue-router').RouteLocationNormalized[]} The generated routes.
 */
export function makeCRUDRoutes({
    components,
    app,
    model,
    authRedirect = null,
    groups = null,
    groupsRedirect = null,
    views = ["list", "create", "update", "read"],
    titles = {},
    pathPrefix = "",
    vueApp,
}) {
    const routes = [];
    const appRoutePart = getClientRoutePart(app);
    const modelRoutePart = getClientRoutePart(model);
    const lowerTitle = getLowerTitle(model);
    const capitalizedTitle = getCapitalizedTitle(model);
    const pluralizedTitle = getPluralizedTitle(capitalizedTitle);

    const beforeEnter = [];
    if (authRedirect) {
        beforeEnter.push(partial(requireAuth, authRedirect));
        if (groups) {
            beforeEnter.push(
                partial(
                    requireGroups,
                    vueApp,
                    {
                        summary: "Permission Denied",
                        detail: "You do not have permission to access",
                        severity: "error",
                    },
                    groups,
                    groupsRedirect, // you'll be authed but not a member when you get here
                ),
            );
        }
    }

    views.forEach((view) => {
        const capitalizedView = view.charAt(0).toUpperCase() + view.slice(1);
        /** @type {{[key: string]: any}} */
        const props = {
            app,
            model,
            view,
            pk: undefined,
        };
        const route = {
            name: `${appRoutePart}.${modelRoutePart}-${view}`,
            path: `/${appRoutePart}/${modelRoutePart}/${view}/`,
            component: components[view],
            /** @type {{[key: string]: any}} */
            props,
            meta: {
                title: titles[view] || (view === "list" ? pluralizedTitle : `${capitalizedView} ${lowerTitle}`),
                detail: isDetailView(view),
            },
            beforeEnter,
        };

        if (pathPrefix) {
            route.path = `/${pathPrefix}${route.path}`;
        }

        if (isDetailView(view)) {
            route.path += `:pk/`;
            route.props = (route) => ({
                app,
                model,
                view,
                pk: route.params.pk,
            });
        }

        routes.push(route);
    });

    return routes;
}
