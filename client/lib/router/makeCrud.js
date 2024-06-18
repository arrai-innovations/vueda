import { isDetailView } from "./getCrud";
import { requireAuth, requireGroups } from "@vueda/router/guards";
import { getCapitalizedTitle, getClientRoutePart, getLowerTitle, getPluralizedTitle } from "@vueda/utils/crudSupport";
import partial from "lodash-es/partial";

/**
 * Generate CRUD routes for a given app and model.
 *
 * @param {Object} params - The parameters.
 * @param {Object} params.components - A map of components to use for the views, to avoid dynamic imports.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {Array<string>} [params.views=['list', 'create', 'update', 'read']] - The views to generate routes for.
 * @param {Object} [params.titles={}] - Custom titles for the views.
 * @param {string} [params.pathPrefix=''] - The prefix to add to the path.
 * @param {string} [params.authRedirect=null] - The route to redirect to if the user is not authenticated.
 * @param {Array<string>} [params.groups=null] - The groups required to access the views.
 * @param {Object} [params.groupsRedirect=null] - The route to redirect to if the user is not in the required groups.
 * @returns {Array<Object>} The generated routes.
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
                    {
                        title: "Permission Denied",
                        message: "You do not have permission to access",
                        variant: "error",
                        autoDismiss: false,
                    },
                    groups,
                    groupsRedirect, // you'll be authed but not a member when you get here
                ),
            );
        }
    }

    views.forEach((view) => {
        const capitalizedView = view.charAt(0).toUpperCase() + view.slice(1);
        const route = {
            name: `${appRoutePart}.${modelRoutePart}-${view}`,
            path: `/${appRoutePart}/${modelRoutePart}/${view}/`,
            component: components[view],
            props: {
                app,
                model,
                view,
            },
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
        }

        routes.push(route);
    });

    return routes;
}
