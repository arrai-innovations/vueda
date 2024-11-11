import { combineClasses } from "@arrai-innovations/reactive-helpers";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isFunction from "lodash-es/isFunction.js";
import { computed, effectScope, reactive, toRef, unref } from "vue";

let defaultTheme = vuedaTailwind;

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
 * A theme object.
 *
 * @typedef {({
 *     [componentName: string]: {
 *         [slotName: string]: {
 *             [key: string]: any,
 *             ["class"]: (
 *                 ((args: {props: object|import('vue').UnwrapNestedRefs<object>, [key:string]: any}) => CombinedClassesArgument|CombinedClassesArgument[]) |
 *                 CombinedClassesArgument |
 *                 CombinedClassesArgument[]
 *             ),
 *         }
 *     }
 * })} ThemeObject
 */

const getConfigValue = (configOrOverride, key, context) => {
    const value = configOrOverride[key];
    return isFunction(value) ? value(context) : value;
};
const getClassValue = (configOrOverride, key, context) => {
    const classObj = getConfigValue(configOrOverride, key, context);
    return isFunction(classObj?.class) ? classObj.class(context) : classObj?.class;
};

/**
 * A hook to get the classes for a given key and kwargs. Uses computeds for caching.
 *
 * @param {string} componentName - The name of the component.
 * @param {import('vue').UnwrapNestedRefs<{
 *     themeOverride: ThemeObject
 * }>} props - The reactive props to pass to the class function.
 * @param {import('vue').UnwrapNestedRefs<object>|import('vue').Ref<object>|object} [context] - The context to pass if the config or config.class is a function.
 * @param {(key: string, kwargs: object) => string} [keyFn] - A function to modify a key based on kwargs.
 * @returns {(key: string, kwargs?: import('vue').UnwrapNestedRefs<object>) => ThemeObject} A function that returns the classes for a given key and kwargs.
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
    const themeOverride = toRef(props, "themeOverride");

    let myContext = context;
    if (!myContext) {
        myContext = reactive({
            props,
        });
    }

    return (key, kwargs = {}) => {
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
                    const calcContext = { ...(unref(myContext) || {}), ...kwargs };
                    const defaultClass = getClassValue(config, key, calcContext);
                    const overrideClass = getClassValue(unref(themeOverride)?.[componentName] || {}, key, calcContext);
                    return combineClasses(defaultClass, overrideClass);
                });
            });
        }
        return computeds[myKey].value;
    };
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
        defaultTheme[componentName] = {
            ...(defaultTheme[componentName] || {}),
            ...partialTheme[componentName],
        };
    }
}
