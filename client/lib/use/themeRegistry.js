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
 * @private
 */
const mergeThemeReduce = (acc, theme) => {
    if (!theme) {
        return acc;
    }
    return mergeWith(acc, theme, mergeWithCb);
};

/**
 * Custom merge function for merging theme objects, ensuring classes are combined.
 *
 * @param {...import('@vueda/use/useTheme.js').ThemeObject} themes - List of ThemeObjects to merge.
 * @returns {import('@vueda/use/useTheme.js').ThemeObject} - The merged ThemeObject.
 */
export function mergeTheme(...themes) {
    if (themes.length === 0) {
        return {};
    }
    if (themes.length === 1) {
        return themes[0];
    }

    const [initialTheme, ...restThemes] = themes;

    return restThemes.reduce(mergeThemeReduce, cloneDeep(initialTheme));
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
 * @param newTheme {import('@vueda/use/useTheme.js').ThemeObject} - The new default theme.
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
 * @param partialTheme {import('@vueda/use/useTheme.js').ThemeObject} - The partial theme to patch the default theme with.
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
