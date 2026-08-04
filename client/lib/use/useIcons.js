/**
 * @module use/useIcons
 * @description Resolves and caches component icon entries by merging the default icon registry with
 * inherited and local overrides.
 *
 * Each icon entry is a `{ component, props }` pair. `component` must be a Vue component definition
 * (markRaw is applied automatically on write so entries are safe in reactive contexts). `props` is
 * an optional plain object merged shallowly with any caller-supplied props at render time.
 *
 * Override semantics are replace: an override entry wins entirely over the default for that icon slot.
 */
import { IconOverrideSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import { computed, getCurrentInstance, inject, markRaw, provide, toRef, unref } from "vue";

/**
 * @typedef {{ component: import('vue').Component, props?: object }} IconEntry
 */

/**
 * @typedef {{ [iconName: string]: IconEntry }} ComponentIcons
 */

/**
 * @typedef {{ [componentName: string]: ComponentIcons }} IconRegistry
 */

let defaultRegistry = {};

/**
 * Normalize an icon entry: clone props and markRaw the component so the entry is safe in
 * reactive/computed contexts.
 *
 * @param {IconEntry} entry
 * @returns {IconEntry}
 */
const normalizeEntry = (entry) => ({
    component: markRaw(entry.component),
    props: entry.props ? { ...entry.props } : undefined,
});

/**
 * Normalize all entries in a registry, returning a new registry object.
 *
 * @param {IconRegistry} registry
 * @returns {IconRegistry}
 */
const normalizeRegistry = (registry) => {
    const out = {};
    for (const [compName, icons] of Object.entries(registry)) {
        out[compName] = {};
        for (const [iconName, entry] of Object.entries(icons)) {
            out[compName][iconName] = normalizeEntry(entry);
        }
    }
    return out;
};

/**
 * Merge two registries. Override entries replace default entries for the same component+icon key.
 *
 * Entry objects are shared by reference rather than deep-cloned: an icon entry's `component` is a
 * `markRaw`'d Vue component definition, and `cloneDeep` would structurally clone it (dropping the
 * raw marker and breaking it). Per-component maps are shallow-copied so the merge owns its own keys
 * without mutating either input.
 *
 * @param {IconRegistry} base
 * @param {IconRegistry} override
 * @returns {IconRegistry}
 */
const mergeRegistry = (base, override) => {
    const out = {};
    for (const [compName, icons] of Object.entries(base)) {
        out[compName] = { ...icons };
    }
    for (const [compName, icons] of Object.entries(override)) {
        out[compName] = { ...(out[compName] || {}), ...icons };
    }
    return out;
};

/**
 * @typedef {{ iconOverride: IconRegistry }} IconOverrideProps
 */

/**
 * Vue component props definition for components that accept an icon override prop.
 * Spread into component options to let callers supply a partial icon registry that is merged
 * with inherited (ancestor) and default icon entries and scoped to this component and its
 * descendants. Mirrors `THEME_OVERRIDE_PROPS`.
 *
 * @vueda-spread props
 */
export const ICON_OVERRIDE_PROPS = {
    /** A partial icon registry (`{ [componentName]: { [iconName]: { component, props } } }`) merged with inherited and default icon entries; scopes icon overrides to this component and its descendants. */
    iconOverride: {
        type: Object,
        default: null,
    },
};

/**
 * Merge a local icon registry override with ancestor overrides and provide the result for
 * descendant components.
 *
 * @param {import('vue').Ref<IconRegistry>|IconRegistry|null} localOverride
 * @returns {import('vue').ComputedRef<IconRegistry>}
 */
export function useIconsOverride(localOverride) {
    const currentInstance = getCurrentInstance();
    const injectedOverride = currentInstance ? inject(IconOverrideSymbol, null) : null;

    const mergedOverride = computed(() => {
        const ancestor = unref(injectedOverride) || {};
        const local = unref(localOverride) || {};
        return mergeRegistry(ancestor, normalizeRegistry(local));
    });

    if (currentInstance) {
        provide(IconOverrideSymbol, mergedOverride);
    }
    return mergedOverride;
}

/**
 * The function returned by useIcons.
 *
 * @typedef {(iconName: string) => IconEntry|null} UseIconsReturnFunction
 */

/**
 * A hook to get the icon entry for a given icon name within a component's icon slots.
 * Returns null if no entry is registered for the requested slot.
 *
 * When `props` (carrying `ICON_OVERRIDE_PROPS`) is supplied, the component's own `iconOverride`
 * prop is folded into the merged override (ancestor + self) and provided to descendants, so the
 * component's own icons honor its prop. Mirrors `useTheme` / `useThemeOverride`: Vue `inject`
 * cannot observe a same-component `provide`, so the merged ref returned by `useIconsOverride` is
 * consumed directly. Without `props`, resolution reads the injected ancestor override as before.
 *
 * @param {string} componentName - The name of the component.
 * @param {import('vue').UnwrapNestedRefs<IconOverrideProps>} [props] - Reactive props carrying `iconOverride` (from `ICON_OVERRIDE_PROPS`).
 * @returns {UseIconsReturnFunction}
 */
export function useIcons(componentName, props) {
    if (!componentName) {
        throw new Error("useIcons: no component name passed");
    }

    const resolvedOverride = props ? useIconsOverride(toRef(props, "iconOverride")) : inject(IconOverrideSymbol, null);

    return (iconName) => {
        const override = unref(resolvedOverride);
        if (override?.[componentName]?.[iconName]) {
            return override[componentName][iconName];
        }
        if (override?.Default?.[iconName]) {
            return override.Default[iconName];
        }
        return defaultRegistry[componentName]?.[iconName] ?? defaultRegistry.Default?.[iconName] ?? null;
    };
}

/**
 * Get the default icon registry.
 *
 * @returns {IconRegistry}
 */
export function getIcons() {
    return cloneDeep(defaultRegistry);
}

/**
 * Set the default icon registry, replacing any previously registered defaults.
 *
 * @param {IconRegistry} registry
 */
export function setIcons(registry) {
    defaultRegistry = normalizeRegistry(registry);
}

/**
 * Patch the default icon registry with a partial registry. Existing entries not present in
 * the patch are preserved.
 *
 * @param {IconRegistry} partial
 */
export function patchIcons(partial) {
    defaultRegistry = mergeRegistry(defaultRegistry, normalizeRegistry(partial));
}
