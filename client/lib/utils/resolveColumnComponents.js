/**
 * @module utils/resolveColumnComponents
 * @description Resolves the list column adapter component and props for each display field, applying the override precedence chain. Mirrors the form override chain in `buildForm.js`. Pure (no Vue reactivity) so it can be unit-tested directly and wrapped in a `computed` by `useViewList`.
 */
import { availableColumns } from "@vueda/utils/columnLookups.js";
import { columnMappings } from "@vueda/utils/columnMappings.js";
import { getTypeMapping } from "@vueda/utils/getTypeMapping.js";

/**
 * Resolve a column-component override reference into a usable component.
 *
 * Accepts the same forms as the form override chain: a component, a
 * `() => component` function (called for its component, which keeps the
 * component out of reactive state), or a string key into `availableColumns`.
 * An unknown string key, or a function that returns nothing, resolves to
 * `undefined` so the caller can fall through.
 *
 * @param {string | import('vue').Component | (() => import('vue').Component)} reference - The override reference.
 * @returns {import('vue').Component | undefined} The resolved component, or undefined.
 */
function resolveComponentReference(reference) {
    if (typeof reference === "function") {
        return reference() || undefined;
    }
    if (typeof reference === "string") {
        return availableColumns[reference];
    }
    return reference;
}

/**
 * Resolve the adapter component for a single column, highest precedence first:
 * 1. `propComponents[name]` - the `columnComponents` prop on `<ViewList>`.
 * 2. `configComponents[name]` - `modelConfig.config.columnComponents`.
 * 3. type default from `columnMappings`.
 * 4. `ColumnText` fallback.
 *
 * An override that does not resolve falls through to the next entry, so an
 * unknown prop string key still reaches a valid config override.
 *
 * The consumer `#field(<col>)` slot (highest precedence overall) is handled in
 * the ViewList template, not here.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - The column's field descriptor (carries `name`, `typeSerializer`, `typeModel`).
 * @param {{[name:string]: any}} [propComponents] - Inline component overrides by field name.
 * @param {{[name:string]: any}} [configComponents] - Model-config component overrides by field name.
 * @returns {import('vue').Component} The resolved adapter component.
 */
export function resolveColumnComponent(field, propComponents, configComponents) {
    const name = field?.name;
    for (const override of [propComponents?.[name], configComponents?.[name]]) {
        const resolved = override ? resolveComponentReference(override) : undefined;
        if (resolved) {
            return resolved;
        }
    }
    const mapping = getTypeMapping(columnMappings, field);
    if (mapping?.column) {
        const resolved = resolveComponentReference(mapping.column);
        if (resolved) {
            return resolved;
        }
    }
    return availableColumns.ColumnText;
}

/**
 * Resolve the props passed to a column's adapter, layering lowest to highest:
 * type-default `columnProps`, then `configProps[name]`, then `propProps[name]`.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - The column's field descriptor.
 * @param {{[name:string]: object}} [propProps] - Inline prop overrides by field name.
 * @param {{[name:string]: object}} [configProps] - Model-config prop overrides by field name.
 * @returns {object} The merged adapter props.
 */
export function resolveColumnProps(field, propProps, configProps) {
    const name = field?.name;
    const mapping = getTypeMapping(columnMappings, field);
    return {
        ...(mapping?.columnProps || {}),
        ...(configProps?.[name] || {}),
        ...(propProps?.[name] || {}),
    };
}

/**
 * @typedef {object} ResolvedColumn
 * @property {import('vue').Component} component - The adapter component to render.
 * @property {object} props - The props to forward to the adapter (in addition to the grid cell's value-slot props).
 */

/**
 * @typedef {object} ResolveColumnsOptions
 * @property {import('@vueda/stores/storeModelInfo.js').FieldInfo[]} fields - The display field descriptors (each must carry `name`).
 * @property {{[name:string]: any}} [propComponents] - `columnComponents` prop overrides.
 * @property {{[name:string]: object}} [propProps] - `columnProps` prop overrides.
 * @property {{[name:string]: any}} [configComponents] - `modelConfig.config.columnComponents`.
 * @property {{[name:string]: object}} [configProps] - `modelConfig.config.columnProps`.
 */

/**
 * Resolve adapter component + props for every display field, keyed by field name.
 *
 * @param {ResolveColumnsOptions} options - The fields and override sources.
 * @returns {{[name:string]: ResolvedColumn}} Resolved columns keyed by field name.
 */
export function resolveColumns({ fields, propComponents, propProps, configComponents, configProps } = {}) {
    /** @type {{[name:string]: ResolvedColumn}} */
    const result = {};
    for (const field of fields || []) {
        if (!field?.name) {
            continue;
        }
        result[field.name] = {
            component: resolveColumnComponent(field, propComponents, configComponents),
            props: resolveColumnProps(field, propProps, configProps),
        };
    }
    return result;
}
