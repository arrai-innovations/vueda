import { requireAuth, requireGroups } from "@vueda/router/guards.js";
import { storeViewInfo } from "@vueda/stores/storeViewInfo.js";
import { getClientRoutePart } from "@vueda/utils/crudSupport.js";
import partial from "lodash-es/partial.js";

/**
 * Generate CRUD routes for a given app and model.
 *
 * @param {object} params - The parameters.
 * @param {object} params.components - A map of components to use for the views, to avoid dynamic imports.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string[]} [params.views=['list', 'create', 'update', 'read']] - The views to generate routes for.
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
    views = ["list", "create", "update", "read", "delete"],
    pathPrefix = "",
    vueApp,
}) {
    const routes = [];
    const appRoutePart = getClientRoutePart(app);
    const modelRoutePart = getClientRoutePart(model);
    const viewStore = storeViewInfo();

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
        /** @type {{[key: string]: any}} */
        const props = {
            app,
            model,
            view: view.name,
            pk: undefined,
        };
        const route = {
            name: `${appRoutePart}.${modelRoutePart}-${view.name}`,
            path: `/${appRoutePart}/${modelRoutePart}/${view.name}/`,
            component: components[view.name],
            /** @type {{[key: string]: any}} */
            props,
            meta: {
                detail: view.detail,
            },
            beforeEnter,
        };

        if (pathPrefix) {
            route.path = `/${pathPrefix}${route.path}`;
        }
        // TODO: if view is bulk, then it is the same as targetless action, no pk passed in routes.
        // if it is bulk, then that view needs to
        if (view.bulk) {
            const route_bulk = {
                ...route,
            };
            route_bulk.props = (route) => ({
                app,
                model,
                view,
                pk: route.query.pk.split(","),
            });
            route_bulk.name += "-bulk";
            viewStore.addBulk(view.name);
            routes.push(route_bulk);
        }

        if (view.detail) {
            route.path += `:pk/`;
            route.props = (route) => ({
                app,
                model,
                view,
                pk: route.params.pk,
            });
            viewStore.addDetail(view.name);
        }

        routes.push(route);
    });

    return routes;
}
