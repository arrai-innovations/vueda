/**
 * @module utils/projectViewOverrides
 * @description Lists the project's view files for the router, and checks their names in development builds. The
 * check reports a model-specific project view file whose name matches no route of its model, so that a misnamed
 * project view does not silently leave the VUEDA view in place.
 */
import { getViewName, unroutedActionNames } from "@vueda/utils/actionMap.js";
import { getPascalCaseName } from "@vueda/utils/case.js";

/**
 * The project's `@/views/View*.vue` files. Each key is a file name, such as `ViewList.vue`, and each value loads
 * that file. A name that has no key has no file. {@api js:function:@arrai-innovations/vueda/vite#vuedaViteConfig}
 * sets `@` to the project's `src` directory unless the project passes its own `@`.
 *
 * @type {{ [fileName: string]: () => Promise<{ default: object }> }}
 */
export const projectViews = Object.fromEntries(
    Object.entries(import.meta.glob("@/views/View*.vue")).map(([path, load]) => [
        path.slice(path.lastIndexOf("/") + 1),
        load,
    ]),
);

const warnedFileNames = new Set();

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
 * @param {string[]} fileNames - File names of the project's `View*.vue` files.
 * @param {object} options - The model to check the file names against.
 * @param {string} options.app - The Django app label.
 * @param {string} options.model - The Django model name.
 * @param {string[]} options.actionNames - The names of the model's actions.
 * @param {string[]} options.transitionCodes - The codes of the model's workflow transitions.
 * @param {string[]} options.registryKeys - The keys of the view registry, which are route segments.
 * @returns {void}
 */
export const warnUnmatchedProjectViews = (fileNames, { app, model, actionNames, transitionCodes, registryKeys }) => {
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
    for (const fileName of fileNames) {
        if (warnedFileNames.has(fileName) || expected.includes(fileName)) {
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
        warnedFileNames.add(fileName);
        console.warn(
            `Project view @/views/${fileName} matches no action or transition that ${app}.${model} offers the current user. ` +
                `Check the file name. File names that would match:`,
            expected,
        );
    }
};
