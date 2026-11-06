/**
 * @module utils/projectViewOverrides
 * @description Development checks that report project view files that the router cannot use: a model-specific
 * file whose name matches no route of its model, and a file that fails to load. Each check keeps a mistake in a
 * project view from silently leaving the VUEDA view in place.
 */
import { getViewName, unroutedActionNames } from "@vueda/utils/actionMap.js";
import { getPascalCaseName } from "@vueda/utils/case.js";

const warnedPaths = new Set();

/**
 * Warn about model-specific project view files whose names match no action or transition of the model.
 *
 * The check builds the expected file name for each route of the model. An action without a client route, such as
 * `partial_update`, has no expected file name.
 *
 * - A built-in action, which is an action whose route segment is a registry key, expects
 *   `View<Name><App><Model>.vue`. For example, the `list` action on `shop.order` expects `ViewListShopOrder.vue`.
 * - Every other action, and every transition, expects `ViewAction<App><Model><Action>.vue`.
 *
 * A transition code that equals a registry key expects the `ViewAction` form, because a transition skips the
 * registry.
 *
 * The check looks at two kinds of file. A file whose name starts with `ViewAction<App><Model>` is an action view
 * for this model. A file whose name ends with `<App><Model>.vue` is a built-in view for this model. A file of
 * either kind that matches no expected name gets one console warning per session. Each warning lists the
 * expected names.
 *
 * An action view whose name continues with a lowercase letter after `ViewAction<App><Model>` is skipped. Model
 * names are lowercase, so such a file belongs to another model whose name starts with this one, such as
 * `orderline` for `order`.
 *
 * @param {string[]} paths - Paths of the project's `View*.vue` files.
 * @param {object} options - The model to check the paths against.
 * @param {string} options.app - The Django app label.
 * @param {string} options.model - The Django model name.
 * @param {string[]} options.actionNames - The names of the model's actions.
 * @param {string[]} options.transitionCodes - The codes of the model's workflow transitions.
 * @param {string[]} options.registryKeys - The keys of the view registry, which are route segments.
 * @returns {void}
 */
export const warnUnmatchedProjectViews = (paths, { app, model, actionNames, transitionCodes, registryKeys }) => {
    const appModel = `${getPascalCaseName(app)}${getPascalCaseName(model)}`;
    const actionPrefix = `ViewAction${appModel}`;
    const builtInSuffix = `${appModel}.vue`;
    const registryNames = new Set(registryKeys.map((key) => getPascalCaseName(key)));
    const transitionNames = new Set(transitionCodes.map((code) => getPascalCaseName(code)));
    const actionRouteNames = actionNames
        .filter((name) => !unroutedActionNames.has(name))
        .map((name) => getPascalCaseName(getViewName(name)));
    const expected = [
        ...new Set([
            ...actionRouteNames
                .filter((name) => registryNames.has(name) && !transitionNames.has(name))
                .map((name) => `View${name}${appModel}.vue`),
            ...[...actionRouteNames, ...transitionNames]
                .filter((name) => !registryNames.has(name) || transitionNames.has(name))
                .map((name) => `${actionPrefix}${name}.vue`),
        ]),
    ];
    for (const path of paths) {
        const fileName = path.slice(path.lastIndexOf("/") + 1);
        if (warnedPaths.has(path) || expected.includes(fileName)) {
            continue;
        }
        const isActionView = fileName.startsWith(actionPrefix) && /^[A-Z]/.test(fileName.slice(actionPrefix.length));
        const isBuiltInView =
            !fileName.startsWith("ViewAction") &&
            fileName.endsWith(builtInSuffix) &&
            fileName.length > `View${builtInSuffix}`.length;
        if (!isActionView && !isBuiltInView) {
            continue;
        }
        warnedPaths.add(path);
        console.warn(
            `Project view ${path} matches no action or transition that ${app}.${model} offers the current user. ` +
                `Check the file name. File names that would match:`,
            expected,
        );
    }
};

/**
 * Report a project view file that exists but fails to load.
 *
 * The router imports each candidate file name and falls back to the next one when the import fails. A failed
 * import of a name that is not in `paths` means that the file does not exist, which is the normal case. A failed
 * import of a name that is in `paths` means that the file exists and has an error, so this logs the error.
 *
 * @param {string[]} paths - Paths of the project's `View*.vue` files.
 * @param {string} path - Path of the file that failed to import.
 * @param {unknown} error - The error from the import.
 * @returns {void}
 */
export const reportProjectViewLoadError = (paths, path, error) => {
    if (paths.includes(path)) {
        console.error(`Project view ${path} failed to load, so the router skipped it.`, error);
    }
};
