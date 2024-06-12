import { isDetailView } from "./getCrud";
import { requireAuth, requirePerms } from "@vueda/router/guards";
import {
    getCapitalizedTitle,
    getClientPkRoutePart,
    getClientRoutePart,
    getLowerTitle,
    getPascalCaseName,
    getPluralizedTitle,
} from "@vueda/utils/crudSupport";
import partial from "lodash-es/partial";

/**
 * Generate CRUD routes for a given app and model.
 *
 * @param {Object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {Array<string>} [params.views=['list', 'create', 'update', 'read']] - The views to generate routes for.
 * @param {Object} [params.titles={}] - Custom titles for the views.
 * @param {string} [params.pkRoutePart] - The primary key route part.
 * @param {string} [params.pathPrefix=''] - The prefix to add to the path.
 * @returns {Array<Object>} The generated routes.
 */
export function makeCRUDRoutes({
    app,
    model,
    views = ["list", "create", "update", "read"],
    titles = {},
    pkRoutePart,
    pathPrefix = "",
}) {
    const routes = [];
    const appRoutePart = getClientRoutePart(app);
    const modelRoutePart = getClientRoutePart(model);
    const modelFileName = getPascalCaseName(model);
    const lowerTitle = getLowerTitle(model);
    const capitalizedTitle = getCapitalizedTitle(model);
    const pluralizedTitle = getPluralizedTitle(capitalizedTitle);

    views.forEach((view) => {
        const capitalizedView = view.charAt(0).toUpperCase() + view.slice(1);
        const route = {
            name: `${appRoutePart}.${modelRoutePart}-${view}`,
            path: `/${appRoutePart}/${modelRoutePart}/${view}/`,
            component: () => import(`@/views/View${capitalizedView}${modelFileName}.vue`),
            meta: {
                title: titles[view] || (view === "list" ? pluralizedTitle : `${capitalizedView} ${lowerTitle}`),
                detail: isDetailView(view),
            },
            beforeEnter: [requireAuth, partial(requirePerms, [`${app}.${view}_${model.toLowerCase()}`])],
        };

        if (pathPrefix) {
            route.path = `/${pathPrefix}${route.path}`;
        }

        if (isDetailView(view)) {
            route.path += `:${pkRoutePart || getClientPkRoutePart(model)}/`;
        }

        routes.push(route);
    });

    return routes;
}
