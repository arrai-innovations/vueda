/**
 * @module utils/columnMappings
 * @description Default mappings from DRF serializer field types to list column adapter components. Mirrors `fieldMappings.js` (which maps types to form widgets). Resolved via the shared `getTypeMapping` helper, keyed `typeSerializer -> typeModel`.
 *
 * Phase 1 ships no type defaults: every column resolves to the `ColumnText`
 * fallback, reproducing the historical plain-text cell. `ColumnDateTime` and
 * `ColumnModelLink` entries are added in later phases.
 */
import merge from "lodash-es/merge.js";

/**
 * Describes how a DRF serializer field type maps to a list column adapter.
 *
 * @typedef {object} ColumnMappingEntry
 * @property {string} column - The adapter name, a key into `availableColumns`.
 * @property {object} [columnProps] - Default props forwarded to the adapter for this type.
 */

/** @type {{[typeSerializer: string]: {[typeModel: string]: ColumnMappingEntry}}} */
export const columnMappings = {};

/**
 * Deep-merge custom column mappings into the defaults. Mirrors
 * `mergeDefaultFieldMappings`. Mutates and returns the shared `columnMappings`.
 *
 * @param {{[typeSerializer: string]: {[typeModel: string]: ColumnMappingEntry}}} customMappings - Custom mappings to merge in.
 * @returns {{[typeSerializer: string]: {[typeModel: string]: ColumnMappingEntry}}} The merged mappings.
 */
export function mergeColumnMappings(customMappings) {
    return merge(columnMappings, customMappings);
}
