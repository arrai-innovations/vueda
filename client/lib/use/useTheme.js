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
import { defaultTheme, getTheme, mergeTheme, patchTheme, setTheme } from "@vueda/use/themeRegistry.js";
import { ThemeOverrideSymbol } from "@vueda/utils/symbols.js";
import { computedAsync } from "@vueuse/core";
import isFunction from "lodash-es/isFunction.js";
import { computed, effectScope, getCurrentInstance, inject, provide, ref, toRef, unref } from "vue";

// Re-export the theme registry's public API so the `@vueda/use/useTheme.js`
// import path stays stable for existing callers. New `*.theme.js` modules
// should import `patchTheme` from `@vueda/use/themeRegistry.js` directly so the
// eager registration survives specs that mock this composable.
export { getTheme, mergeTheme, patchTheme, setTheme };

/**
 * Vue component props definition for components that accept a theme override prop.
 * Spread into component options to allow callers to supply a partial theme object that
 * is merged with the component's default theme.
 *
 * @vueda-spread props
 */
export const THEME_OVERRIDE_PROPS = {
    /** A partial ThemeObject keyed by component name, merged over this component's theme and provided to descendants. */
    themeOverride: {
        type: Object,
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
/**
 * Sentinel returned by `resolveSlotClassesSync` when the composes graph hits a
 * component-level loader function. The outer computed treats this as a signal
 * to fall through to the async resolver.
 *
 * @private
 */
const LOADER_PENDING = Symbol("useTheme.loaderPending");

/**
 * Sync slot resolver. Mirrors `resolveSlotClasses` but skips loader invocation;
 * if any component along the composes graph is a function-form lazy loader,
 * returns `LOADER_PENDING` so the caller can fall through to the async path.
 *
 * @private
 * @returns {Array | typeof LOADER_PENDING}
 */
const resolveSlotClassesSync = (componentName, slotKey, mergedOverride, context, visited = new Set()) => {
    const ref = `${componentName}.${slotKey}`;
    if (visited.has(ref)) {
        throw new Error(`useTheme: composition cycle detected (path: ${[...visited, ref].join(" -> ")})`);
    }
    const nextVisited = new Set(visited);
    nextVisited.add(ref);

    const defaultConfig = defaultTheme.value[componentName];
    if (typeof defaultConfig === "function") {
        return LOADER_PENDING;
    }

    const resolvedDefault = defaultConfig || {};
    const overrideConfig = mergedOverride?.[componentName] || {};

    const defaultSlot = getConfigValue(resolvedDefault, slotKey, context);
    const overrideSlot = getConfigValue(overrideConfig, slotKey, context);

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
            const composed = resolveSlotClassesSync(refComp, refSlot, mergedOverride, context, nextVisited);
            if (composed === LOADER_PENDING) {
                return LOADER_PENDING;
            }
            classes.push(...composed);
        }
    }

    const defaultClass = isFunction(defaultSlot?.class) ? defaultSlot.class(context) : defaultSlot?.class;
    const overrideClass = isFunction(overrideSlot?.class) ? overrideSlot.class(context) : overrideSlot?.class;

    if (defaultClass !== undefined && defaultClass !== null) {
        classes.push(defaultClass);
    }
    if (overrideClass !== undefined && overrideClass !== null) {
        classes.push(overrideClass);
    }

    return classes;
};

/**
 * Async slot resolver. Used as the fallback when `resolveSlotClassesSync`
 * signals `LOADER_PENDING`. Invokes loaders and awaits their resolution; the
 * loaded module is expected to call `patchTheme` to register real data, which
 * makes the next sync pass succeed.
 *
 * @private
 */
const resolveSlotClasses = async (componentName, slotKey, mergedOverride, context, visited = new Set()) => {
    const ref = `${componentName}.${slotKey}`;
    if (visited.has(ref)) {
        throw new Error(`useTheme: composition cycle detected (path: ${[...visited, ref].join(" -> ")})`);
    }
    const nextVisited = new Set(visited);
    nextVisited.add(ref);

    let defaultConfig = defaultTheme.value[componentName];
    if (typeof defaultConfig === "function") {
        await defaultConfig();
        defaultConfig = defaultTheme.value[componentName];
        if (typeof defaultConfig === "function") {
            defaultConfig = {};
        }
    }
    defaultConfig = defaultConfig || {};

    const overrideConfig = mergedOverride?.[componentName] || {};

    const defaultSlot = getConfigValue(defaultConfig, slotKey, context);
    const overrideSlot = getConfigValue(overrideConfig, slotKey, context);

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
            const composed = await resolveSlotClasses(refComp, refSlot, mergedOverride, context, nextVisited);
            classes.push(...composed);
        }
    }

    const defaultClass = isFunction(defaultSlot?.class) ? defaultSlot.class(context) : defaultSlot?.class;
    const overrideClass = isFunction(overrideSlot?.class) ? overrideSlot.class(context) : overrideSlot?.class;

    if (defaultClass !== undefined && defaultClass !== null) {
        classes.push(defaultClass);
    }
    if (overrideClass !== undefined && overrideClass !== null) {
        classes.push(overrideClass);
    }

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
 *
 * Properties on the returned function:
 * - `componentName` — the component name passed in.
 * - `es` — the per-instance Vue `effectScope` that owns the slot computeds.
 * - `loading` — a `ComputedRef<boolean | undefined>` matching the
 *   `LoadingProperties.loading` contract from `@arrai-innovations/reactive-helpers`:
 *   `undefined` (never loaded), `true` (currently loading), `false` (settled).
 *   Trips `true` from the moment `useTheme()` is called when the component's
 *   registered entry is a loader function, and again whenever any slot's async
 *   fallback is evaluating.
 * - `hideStyle` — a `ComputedRef<string>` resolving to
 *   `"display: none !important"` while `loading.value === true`, otherwise `""`.
 *   Spread into `:style` on the themed root to hide it until its theme settles
 *   without unmounting; nested themed children mount immediately and their
 *   loaders fire in parallel, instead of serializing behind the parent's `v-if`.
 *
 * @typedef {((key: string, kwargs?: import('vue').UnwrapNestedRefs<object>) => string) & {
 *     componentName: string,
 *     es: import('vue').EffectScope,
 *     loading: import('vue').ComputedRef<boolean | undefined>,
 *     hideStyle: import('vue').ComputedRef<string>,
 * }} UseThemeReturnFunction
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

    // Snapshot configOverride at construction. If the entry is a lazy loader,
    // its configOverride isn't available until the chunk resolves; the loader
    // chunk should call patchTheme with a real entry, after which a fresh
    // useTheme call would pick it up. The async re-resolve below still applies
    // to slot resolution, which is the main correctness concern.
    const initialConfig = defaultTheme.value[componentName];
    const configOverride = initialConfig && typeof initialConfig !== "function" ? initialConfig.themeOverride : null;

    const themeOverride = useThemeOverride(toRef(props, "themeOverride"), configOverride || null);

    /**
     * Loading-state contributors for this `useTheme` instance. Eager probe
     * and per-slot async fallbacks push their evaluating refs here; `loading`
     * aggregates with OR.
     *
     * Follows the reactive-helpers convention: `undefined` = never loaded,
     * `true` = currently loading, `false` = settled (loaded at least once).
     *
     * @type {(import('vue').Ref<boolean|undefined>)[]}
     */
    const loadingRefs = [];
    const loading = computed(() => {
        let any = false;
        let everKnown = false;
        for (const r of loadingRefs) {
            if (r.value === true) {
                return true;
            }
            if (r.value !== undefined) {
                everKnown = true;
            }
            any = true;
        }
        return any && everKnown ? false : undefined;
    });

    /**
     * Reactive flag: true while the component-level eager loader probe is in
     * flight. The outer slot computeds check this before creating an async
     * fallback so the loader fires once, not twice.
     */
    const probeInFlight = ref(false);

    // Eager probe: if the registered entry for this component is itself a
    // loader function, fire it now so `theme.loading.value` reports `true`
    // from the moment `useTheme()` is called (not just when a slot is first
    // read). The loaded module is expected to call `patchTheme` as a side
    // effect, which mutates `defaultTheme.value` and re-runs downstream
    // computeds. `probeInFlight` gates the slot-level async fallback so the
    // loader is not invoked a second time from `resolveSlotClasses`.
    if (typeof initialConfig === "function") {
        const probeRef = ref(true);
        loadingRefs.push(probeRef);
        probeInFlight.value = true;
        es.run(() => {
            Promise.resolve()
                .then(() => initialConfig())
                .catch((e) => {
                    console.error(`useTheme[${componentName}] loader failed:`, e);
                })
                .finally(() => {
                    probeRef.value = false;
                    probeInFlight.value = false;
                });
        });
    }

    const returnFn = (key, kwargs = {}) => {
        let myKey = key;
        if (keyFn) {
            // This allows us to have different computed properties for the same key based on kwargs
            myKey = keyFn(key, kwargs);
        }
        if (!computeds[myKey]) {
            es.run(() => {
                // Outer computed: tries sync first. If sync resolution reports
                // LOADER_PENDING, lazily create the async fallback and return
                // its current value (initially "", updated when the loader
                // chunk resolves and patchTheme mutates defaultTheme.value).
                // Once defaultTheme.value changes, this outer computed re-runs
                // and the sync path usually succeeds — no further async cost.
                let asyncRef = null;
                computeds[myKey] = computed(() => {
                    // eslint-disable-next-line no-unused-expressions
                    defaultTheme.value; // track reactivity on theme registry
                    const calcContext = { ...(unref(context) || {}), ...kwargs };
                    const mergedOverride = unref(themeOverride);
                    const syncResult = resolveSlotClassesSync(componentName, key, mergedOverride, calcContext);
                    if (syncResult !== LOADER_PENDING) {
                        return combineClasses(...syncResult);
                    }
                    // Probe already fires the component-level loader; avoid a
                    // second invocation through the async fallback's loader-
                    // awaiting path. The outer computed will re-run when
                    // `defaultTheme.value` changes (after probe's patchTheme).
                    if (probeInFlight.value) {
                        return "";
                    }
                    if (!asyncRef) {
                        const slotEvaluating = ref(false);
                        loadingRefs.push(slotEvaluating);
                        asyncRef = computedAsync(
                            async () => {
                                // eslint-disable-next-line no-unused-expressions
                                defaultTheme.value;
                                const innerContext = { ...(unref(context) || {}), ...kwargs };
                                const innerOverride = unref(themeOverride);
                                const classes = await resolveSlotClasses(
                                    componentName,
                                    key,
                                    innerOverride,
                                    innerContext,
                                );
                                return combineClasses(...classes);
                            },
                            "",
                            {
                                evaluating: slotEvaluating,
                                onError: (e) => {
                                    console.error(`useTheme[${componentName}.${key}]:`, e);
                                },
                            },
                        );
                    }
                    return asyncRef.value;
                });
            });
        }
        return computeds[myKey].value;
    };
    returnFn.componentName = componentName;
    returnFn.es = es;
    returnFn.loading = loading;
    /**
     * Convenience style string for the consumer's root element. Resolves to
     * `"display: none !important"` while `loading.value === true`, otherwise
     * `""`. Spread into `:style` to hide a themed root until its theme is
     * ready, without unmounting (so nested themed children mount immediately
     * and their loaders fire in parallel with this one).
     *
     * @type {import('vue').ComputedRef<string>}
     */
    returnFn.hideStyle = computed(() => (loading.value === true ? "display: none !important" : ""));
    return returnFn;
}
