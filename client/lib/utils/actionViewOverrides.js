/**
 * @module utils/actionViewOverrides
 * @description Development check that reports convention-named action view files whose action part names no
 * action of their model, so a misspelled file name does not silently leave the generic action view in place.
 */
import { getPascalCaseName } from "@vueda/utils/case.js";

const warnedPaths = new Set();

/**
 * Warn about model-specific action view files whose action part matches no action or transition of the model.
 *
 * A model-specific action view is named `ViewAction<App><Model><Action>.vue`. For each path whose file name
 * starts with `ViewAction<App><Model>`, this compares the rest of the name with the PascalCase name of each
 * action and transition code. A path that matches none of them gets one console warning per session.
 *
 * A rest of the name that does not start with an uppercase letter is skipped. Model names are lowercase, so
 * such a file belongs to another model whose name starts with this one, such as `orderline` for `order`.
 *
 * @param {string[]} paths - Paths of the project's `ViewAction*.vue` files.
 * @param {object} options - The model to check the paths against.
 * @param {string} options.app - The Django app label.
 * @param {string} options.model - The Django model name.
 * @param {string[]} options.actionNames - The names of the model's actions.
 * @param {string[]} options.transitionCodes - The codes of the model's workflow transitions.
 * @returns {void}
 */
export const warnUnmatchedActionViews = (paths, { app, model, actionNames, transitionCodes }) => {
    const prefix = `ViewAction${getPascalCaseName(app)}${getPascalCaseName(model)}`;
    const expected = [...new Set([...actionNames, ...transitionCodes])].map(
        (name) => `${prefix}${getPascalCaseName(name)}.vue`,
    );
    for (const path of paths) {
        const fileName = path.slice(path.lastIndexOf("/") + 1);
        if (warnedPaths.has(path) || !fileName.startsWith(prefix) || !/^[A-Z]/.test(fileName.slice(prefix.length))) {
            continue;
        }
        if (expected.includes(fileName)) {
            continue;
        }
        warnedPaths.add(path);
        console.warn(
            `Action view ${path} matches no action or transition that ${app}.${model} offers the current user. ` +
                `Check the file name. File names that would match:`,
            expected,
        );
    }
};
