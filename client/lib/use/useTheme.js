/**
 * @module use/useTheme
 * @description Resolves and caches component theme classes by merging the default theme with inherited and local overrides.
 *
 * Slot entries may declare `composes: ['_MetaKey.slot', ...]` to compose classes from other entries before
 * their own classes. Underscore-prefixed entries (`_ButtonBase`, `_ButtonGhost`, etc.) are the convention
 * for shared scaffolding consumed by visually-related leaf components. Composition is resolved at lookup
 * time against the merged override theme, so `setTheme` or `useThemeOverride` on a meta key propagates to
 * every leaf that composes from it. Override semantics for `composes` are replace (override list wins
 * entirely); own `class` values still combine default + override as in non-composing entries.
 */
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { ThemeOverrideSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isFunction from "lodash-es/isFunction.js";
import mergeWith from "lodash-es/mergeWith.js";
import { computed, effectScope, getCurrentInstance, inject, provide, toRef, unref } from "vue";

let defaultTheme = {};

/**
 * Vue component props definition for components that accept a theme override prop.
 * Spread into component options to allow callers to supply a partial theme object that
 * is merged with the component's default theme.
 *
 * @vueda-spread props
 */
export const THEME_OVERRIDE_PROPS = {
    /** A partial theme object merged with the component's default theme; accepts a class string, class array, or theme object. */
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
 * Slot entries may include an optional `composes` array of references to other entries' slots
 * (`'_ButtonBase.root'`, `'Button.root'`, etc.). Referenced slots' classes are resolved first,
 * then the slot's own `class` is appended; `setTheme` or `useThemeOverride` on a referenced
 * key propagates through the composition chain.
 *
 * @typedef {({
 *     [slotName: string]: {
 *         [key: string]: any,
 *         ["class"]: (
 *             ((args: {props: object|import('vue').UnwrapNestedRefs<object>, [key:string]: any}) => CombinedClassesArgument|CombinedClassesArgument[]) |
 *             CombinedClassesArgument |
 *             CombinedClassesArgument[]
 *         ),
 *         ["composes"]?: string[],
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
 * Resolve the array of class values for a slot, walking `composes` references
 * through both the global default theme and the per-instance merged override.
 *
 * Composition is opt-in: a slot whose entry includes `composes: ['_MetaKey.slot', ...]`
 * pulls in the resolved classes of those referenced slots before its own classes.
 * Override semantics for `composes` are replace (override list wins entirely);
 * own `class` values from default and override are still concatenated as in
 * non-composing entries.
 *
 * @private
 * @param {string} componentName - The component or meta-key name.
 * @param {string} slotKey - The slot key within the entry.
 * @param {ThemeObject} mergedOverride - The merged override theme tree from useThemeOverride.
 * @param {object} context - Resolved context for function-form slots and class functions.
 * @param {Set<string>} [visited] - Internal accumulator for cycle detection.
 * @returns {Array} Ordered class values to combine via `combineClasses`.
 */
const resolveSlotClasses = (componentName, slotKey, mergedOverride, context, visited = new Set()) => {
    const ref = `${componentName}.${slotKey}`;
    if (visited.has(ref)) {
        throw new Error(`useTheme: composition cycle detected (path: ${[...visited, ref].join(" -> ")})`);
    }
    const nextVisited = new Set(visited);
    nextVisited.add(ref);

    const defaultConfig = defaultTheme[componentName] || {};
    const overrideConfig = mergedOverride?.[componentName] || {};

    const defaultSlot = getConfigValue(defaultConfig, slotKey, context);
    const overrideSlot = getConfigValue(overrideConfig, slotKey, context);

    // Replace semantics: an override that defines `composes` wins entirely;
    // otherwise the default's compose list is used.
    const composes = overrideSlot?.composes !== undefined ? overrideSlot.composes : defaultSlot?.composes;

    const classes = [];
    if (Array.isArray(composes)) {
        for (const composedRef of composes) {
            const dotIdx = composedRef.indexOf(".");
            if (dotIdx === -1) {
                throw new Error(
                    `useTheme: invalid composes reference "${composedRef}" at ${ref} (expected "ComponentOrMetaKey.slot")`,
                );
            }
            const refComp = composedRef.slice(0, dotIdx);
            const refSlot = composedRef.slice(dotIdx + 1);
            classes.push(...resolveSlotClasses(refComp, refSlot, mergedOverride, context, nextVisited));
        }
    }

    const defaultClass = isFunction(defaultSlot?.class) ? defaultSlot.class(context) : defaultSlot?.class;
    const overrideClass = isFunction(overrideSlot?.class) ? overrideSlot.class(context) : overrideSlot?.class;

    if (defaultClass !== undefined && defaultClass !== null) classes.push(defaultClass);
    if (overrideClass !== undefined && overrideClass !== null) classes.push(overrideClass);

    return classes;
};

/**
 * Merge a theme object with another theme object and provide the result for child components.
 *
 * @param {object|import("vue").Ref<ThemeObject>} localOverride - The override from the current component (e.g. a prop).
 * @param {object|import("vue").Ref<ThemeObject>|null} configOverride - Optional "base" config (e.g. default config for your component).
 * @returns {import("vue").ComputedRef<ThemeObject>} A merged override that includes ancestor overrides + local overrides.
 */
export function useThemeOverride(localOverride, configOverride = null) {
    const currentInstance = getCurrentInstance();
    const injectedOverride = currentInstance ? inject(ThemeOverrideSymbol, null) : null;

    const mergedOverride = computed(() => {
        const base = deepUnref(configOverride) || {};
        const ancestor = deepUnref(injectedOverride) || {};
        const local = deepUnref(localOverride) || {};
        return mergeTheme(base, ancestor, local);
    });

    if (currentInstance) {
        provide(ThemeOverrideSymbol, mergedOverride);
    }
    return mergedOverride;
}

/**
 * The function returned by useTheme.
 * @typedef {(key: string, kwargs?: import('vue').UnwrapNestedRefs<object>) => ThemeObject} UseThemeReturnFunction
 */

/**
 * @typedef {{
 *     themeOverride: ThemeObject
 * }} ThemeRawProps
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ThemeRawProps>|import('vue').ComputedRef<ThemeRawProps>} ThemeProps
 */

/**
 * A hook to get the classes for a given key and kwargs. Uses computeds for caching.
 *
 * If the resolved slot entry declares `composes`, the referenced slots are resolved
 * first (recursively) and their classes prepended to the result. See the module
 * description for composition semantics and the meta-key naming convention.
 *
 * @param {string} componentName - The name of the component.
 * @param {ThemeProps} props - The reactive or computed props to pass to the class function.
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
    const config = defaultTheme[componentName] || {};

    const themeOverride = useThemeOverride(toRef(props, "themeOverride"), config.themeOverride || null);

    const returnFn = (key, kwargs = {}) => {
        let myKey = key;
        if (keyFn) {
            // This allows us to have different computed properties for the same key based on kwargs
            myKey = keyFn(key, kwargs);
        }
        if (!computeds[myKey]) {
            es.run(() => {
                computeds[myKey] = computed(() => {
                    const calcContext = { ...(unref(context) || {}), ...kwargs };
                    const mergedOverride = unref(themeOverride);
                    const classes = resolveSlotClasses(componentName, key, mergedOverride, calcContext);
                    return combineClasses(...classes);
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
    // mergeTheme clones, so we don't need to clone input here
    for (const componentName in partialTheme) {
        defaultTheme[componentName] = mergeTheme(defaultTheme[componentName], partialTheme[componentName]);
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
 * @param {...ThemeObject} themes - List of ThemeObjects to merge.
 * @returns {ThemeObject} - The merged ThemeObject.
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
