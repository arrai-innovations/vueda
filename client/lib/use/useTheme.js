import { combineClasses } from "@arrai-innovations/reactive-helpers";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEmpty from "lodash-es/isEmpty.js";
import isFunction from "lodash-es/isFunction.js";
import mergeWith from "lodash-es/mergeWith.js";
import { computed, effectScope, getCurrentInstance, inject, provide, unref } from "vue";
import { deepUnref } from "vue-deepunref";

let defaultTheme = vuedaTailwind;

export const ThemeOverrideSymbol = Symbol("ThemeOverride");

export const THEME_OVERRIDE_PROPS = {
    themeOverride: {
        type: [String, Object, Array],
        default: null,
    },
};

/**
 * @typedef {(
 *     (string | string[] | string[][]) |
 *     { [classnames: string]: boolean | import("vue").Ref<boolean> } |
 *     import("vue").Ref<string | string[] | string[][]> |
 *     import("vue").Ref<{ [classnames: string]: (boolean | import("vue").Ref<boolean>) }> |
 *     import("vue").UnwrapNestedRefs<{ [classnames: string]: (boolean | import("vue").Ref<boolean>) }>
 * )} CombinedClassesArgument
 */

/**
 * A theme object for a particular component.
 *
 * @typedef {({
 *     [slotName: string]: {
 *         [key: string]: any,
 *         ["class"]: (
 *             ((args: {props: object|import('vue').UnwrapNestedRefs<object>, [key:string]: any}) => CombinedClassesArgument|CombinedClassesArgument[]) |
 *             CombinedClassesArgument |
 *             CombinedClassesArgument[]
 *         ),
 *     }
 * })} ComponentTheme
 */

/**
 * A theme object or a partial theme object.
 *
 * @typedef {({
 *     [componentName: string]: ComponentTheme
 * })} ThemeObject
 */

/*
 * Get the config value from a config or override.
 *
 * @param {ThemeObject} configOrOverride - The theme config or override.
 * @param {string} key - The key to get the value for.
 * @param {object|import('vue').UnwrapNestedRefs<object>} [context] - The context to pass if the config or config.class is a function.
 */
const getConfigValue = (configOrOverride, key, context) => {
    const value = configOrOverride[key];
    return isFunction(value) ? value(context) : value;
};
/**
 * Get the class for a config value from a config or override.
 *
 * @param {ThemeObject} configOrOverride - The theme config or override.
 * @param {string} key - The key to get the class value for.
 * @param {object|import('vue').UnwrapNestedRefs<object>} [context] - The context to pass if the config or config.class is a function.
 */
const getClassValue = (configOrOverride, key, context) => {
    const classObj = getConfigValue(configOrOverride, key, context);
    return isFunction(classObj?.class) ? classObj.class(context) : classObj?.class;
};

/**
 * The function returned by useTheme.
 * @typedef {(key: string, kwargs?: import('vue').UnwrapNestedRefs<object>) => ThemeObject} UseThemeReturnFunction
 */
/**
 * A hook to get the classes for a given key and kwargs. Uses computeds for caching.
 *
 * @param {string} componentName - The name of the component.
 * @param {import('vue').UnwrapNestedRefs<{
 *     themeOverride: ThemeObject
 * }>|import('vue').ComputedRef<object>} props - The reactive or computed props to pass to the class function.
 * @param {import('vue').UnwrapNestedRefs<object>|import('vue').Ref<object>|object} [context] - The context to pass if the config or config.class is a function.
 * @param {(key: string, kwargs: object) => string} [keyFn] - A function to modify a key based on kwargs.
 * @returns {UseThemeReturnFunction} A function that returns the classes for a given key and kwargs.
 */
export function useTheme(componentName, props, context, keyFn) {
    const computeds = {};
    const es = effectScope();

    if (!componentName) {
        throw new Error("No component name passed");
    }
    const config = defaultTheme[componentName];
    if (!config) {
        throw new Error(`No theme config found for ${componentName}`);
    }
    const currentInstance = getCurrentInstance();
    const injectedThemeOverride = currentInstance ? inject(ThemeOverrideSymbol, null) : null;
    const themeOverride = computed(() => {
        const cTO = deepUnref(config.themeOverride) || {};
        const iTO = deepUnref(injectedThemeOverride) || {};
        const pTO = deepUnref(unref(props)?.themeOverride) || {};
        return iTO ? mergeTheme(cTO, iTO, pTO) : pTO;
    });

    if (currentInstance) {
        provide(ThemeOverrideSymbol, themeOverride);
    }

    const returnFn = (key, kwargs = {}) => {
        if (!config[key]) {
            throw new Error(`No theme config key found for ${key} in ${componentName}`);
        }
        let myKey = key;
        if (keyFn) {
            // This allows us to have different computed properties for the same key based on kwargs
            myKey = keyFn(key, kwargs);
        }
        if (!computeds[myKey]) {
            es.run(() => {
                computeds[myKey] = computed(() => {
                    const calcContext = { ...(unref(context) || {}), ...kwargs };
                    const defaultClass = getClassValue(config, key, calcContext);
                    const overrideClass = getClassValue(unref(themeOverride)?.[componentName] || {}, key, calcContext);
                    return combineClasses(defaultClass, overrideClass);
                });
            });
        }
        return computeds[myKey].value;
    };
    returnFn.componentName = componentName;
    returnFn.es = es;
    return returnFn;
}

/**
 * Get the default theme.
 *
 * @returns {ThemeObject} - The default theme.
 */
export function getTheme() {
    return cloneDeep(defaultTheme);
}

/**
 * Set the default theme.
 *
 * @param newTheme {ThemeObject} - The new default theme.
 */
export function setTheme(newTheme) {
    defaultTheme = cloneDeep(newTheme);
}

/**
 * Patch the default theme with a partial theme.
 *
 * @param partialTheme {ThemeObject} - The partial theme to patch the default theme with.
 */
export function patchTheme(partialTheme) {
    const pt = cloneDeep(partialTheme);
    for (const componentName in pt) {
        defaultTheme[componentName] = mergeTheme(defaultTheme[componentName], pt[componentName]);
    }
}

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
 * Custom merge function for merging theme objects, ensuring classes are combined.
 *
 * @param {...ThemeObject} themes - List of ThemeObjects to merge.
 * @returns {ThemeObject} - The merged ThemeObject.
 */
export function mergeTheme(...themes) {
    if (themes.length === 1) {
        return themes[0];
    }
    if (isEmpty(themes)) {
        return {};
    }
    return themes.reduce((acc, theme) => {
        if (!theme) {
            return acc;
        }
        return mergeWith(acc, theme, mergeWithCb);
    }, cloneDeep(themes[0]));
}
