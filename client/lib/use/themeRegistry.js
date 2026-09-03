/**
 * @module use/themeRegistry
 * @description Mutable holder for the registered default theme, plus the
 * registration API (`setTheme` / `patchTheme` / `getTheme`) and the theme-merge
 * helper.
 *
 * Split out of `useTheme.js` so per-component `*.theme.js` modules can register
 * their entries through a module that test specs do not mock. Specs mock the
 * `useTheme` composable (`@vueda/use/useTheme.js`); they do not mock this
 * registry, so a themed SFC's eager `patchTheme(...)` side effect resolves to
 * the real function even when `useTheme` is mocked. `useTheme.js` re-exports
 * `setTheme` / `patchTheme` / `getTheme` / `mergeTheme` so the public
 * `@vueda/use/useTheme.js` import path is unchanged for existing callers.
 */
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import cloneDeep from "lodash-es/cloneDeep.js";
import isFunction from "lodash-es/isFunction.js";
import mergeWith from "lodash-es/mergeWith.js";
import { shallowRef } from "vue";

/**
 * Reactive holder for the registered theme. `setTheme` / `patchTheme` reassign
 * `.value` so any `useTheme` async computeds re-resolve when new entries arrive
 * (e.g. a component-level loader resolved its chunk and called `patchTheme`
 * with real data).
 */
export const defaultTheme = shallowRef({});

const mergeWithCb = (objValue, srcValue, key) => {
    const isObjFunction = isFunction(objValue);
    const isSrcFunction = isFunction(srcValue);
    const isFunctionInvolved = isObjFunction || isSrcFunction;
    const isClassKey = key === "class";
    if (isClassKey) {
        if (isFunctionInvolved) {
            return (args) =>
                combineClasses(isObjFunction ? objValue(args) : objValue, isSrcFunction ? srcValue(args) : srcValue);
        }
        return combineClasses(objValue, srcValue);
    }
    // `composes` uses replace semantics: an override that defines its own
    // compose list wins entirely. Without this special-case, lodash would
    // merge arrays index-wise, which produces surprising inheritance.
    if (key === "composes") {
        return srcValue;
    }
    if (isFunctionInvolved) {
        return (args) =>
            mergeWith(
                isObjFunction ? objValue(args) : objValue,
                isSrcFunction ? srcValue(args) : srcValue,
                mergeWithCb,
            );
    }
    // fallback to object lodash object mashing
    return undefined;
};

/**
 * Build the merge callback for one `mergeTheme` call.
 *
 * A caller-supplied customizer runs first and decides the levels it cares about. Returning
 * `undefined` from it defers to `mergeWithCb`, so class combining and `composes` replacement
 * still apply at the levels the customizer leaves alone. `mergeWithCb` returning `undefined`
 * in turn defers to lodash.
 *
 * @param {Function} [customizer] - Optional caller-supplied lodash-style merge customizer.
 * @returns {Function} - The callback to hand to lodash `mergeWith`.
 */
const resolveMergeCb = (customizer) => {
    if (!customizer) {
        return mergeWithCb;
    }
    return function (objValue, srcValue, key, object, source, stack) {
        const customized = customizer(objValue, srcValue, key, object, source, stack);
        if (customized !== undefined) {
            return customized;
        }
        return mergeWithCb(objValue, srcValue, key, object, source, stack);
    };
};

/**
 * Custom merge function for merging theme objects, ensuring classes are combined.
 *
 * Layers merge left to right, so later arguments win. Pass a lodash-style customizer as the
 * final argument to control how the layers combine, the way lodash `mergeWith` does. The
 * returned object shares no reference with any argument, so the caller may mutate it freely.
 *
 * Throws when given fewer than two layers. Nothing merges in that case, so the call is a
 * mistake rather than a degenerate result: it reads as a merge while returning one layer.
 * To merge a variable number of layers, seed the call with an empty object, as `buildForm`
 * does: `mergeTheme({}, ...layers)`.
 *
 * @param {...(import('@vueda/use/useTheme.js').ThemeObject|Function)} themes - Two or more ThemeObjects to merge, optionally followed by a merge customizer.
 * @returns {import('@vueda/use/useTheme.js').ThemeObject} - The merged ThemeObject.
 * @throws {TypeError} When fewer than two theme layers are supplied.
 */
export function mergeTheme(...themes) {
    const customizer = isFunction(themes[themes.length - 1]) ? themes.pop() : undefined;
    const mergeCb = resolveMergeCb(customizer);

    if (themes.length < 2) {
        throw new TypeError(
            `mergeTheme needs at least two theme layers, received ${themes.length}. ` +
                "Seed the call with an empty object to merge a variable number of layers: mergeTheme({}, ...layers).",
        );
    }

    const [initialTheme, ...restThemes] = themes;

    return restThemes.reduce((acc, theme) => {
        if (!theme) {
            return acc;
        }
        return mergeWith(acc, theme, mergeCb);
    }, cloneDeep(initialTheme));
}

/**
 * Get the default theme.
 *
 * @returns {import('@vueda/use/useTheme.js').ThemeObject} - The default theme.
 */
export function getTheme() {
    return cloneDeep(defaultTheme.value);
}

/**
 * Set the default theme. Wholesale replace.
 *
 * @param {import('@vueda/use/useTheme.js').ThemeObject} newTheme - The new default theme.
 */
export function setTheme(newTheme) {
    defaultTheme.value = cloneDeep(newTheme);
}

/**
 * Patch the default theme with a partial theme. Additive merge for object
 * entries; replace semantics when either side is a function (a component-level
 * lazy loader). The loader-replace path supports both registering a loader
 * (`patchTheme({ Button: () => import(...) })`) and the loader's own
 * self-registration after its chunk resolves (`patchTheme({ Button: { ... } })`,
 * which overwrites the loader stub with real data).
 *
 * @param {import('@vueda/use/useTheme.js').ThemeObject} partialTheme - The partial theme to patch the default theme with.
 */
export function patchTheme(partialTheme) {
    const next = { ...defaultTheme.value };
    for (const componentName in partialTheme) {
        const existing = next[componentName];
        const incoming = partialTheme[componentName];
        if (typeof existing === "function" || typeof incoming === "function") {
            next[componentName] = incoming;
        } else {
            // mergeTheme clones, so we don't need to clone input here.
            next[componentName] = mergeTheme(existing, incoming);
        }
    }
    // Reassign .value (rather than mutating in place) so shallowRef triggers reactivity.
    defaultTheme.value = next;
}
