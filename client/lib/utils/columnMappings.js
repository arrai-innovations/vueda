/**
 * @module utils/columnMappings
 * @description Default mappings from DRF serializer field types to list column adapter components. Mirrors `fieldMappings.js` (which maps types to form widgets). Resolved via the shared `getTypeMapping` helper, keyed `typeSerializer -> typeModel`.
 *
 * Date/time/datetime types resolve to `ColumnDateTime`. Foreign-key types
 * (`ColumnModelLink`) are added in a later phase. Any unmapped type falls back
 * to `ColumnText`, reproducing the historical plain-text cell.
 */
import merge from "lodash-es/merge.js";

/**
 * Describes how a DRF serializer field type maps to a list column adapter.
 *
 * @typedef {object} ColumnMappingEntry
 * @property {string} column - The adapter name, a key into `availableColumns`.
 * @property {object} [columnProps] - Default props forwarded to the adapter for this type.
 * @property {boolean} [default] - Whether this is the default mapping for its serializer field type (used when `typeModel` is unknown).
 */

/** @type {{[typeSerializer: string]: {[typeModel: string]: ColumnMappingEntry}}} */
export const columnMappings = {
    DateField: {
        DateField: {
            column: "ColumnDateTime",
            columnProps: { showTime: false },
            default: true,
        },
    },
    DateTimeField: {
        DateTimeField: {
            column: "ColumnDateTime",
            columnProps: { showTime: true },
            default: true,
        },
    },
    TimeField: {
        TimeField: {
            // Time-only value: render the localized time, no date and no
            // relative/tooltip (those reference "today" and would mislead).
            column: "ColumnDateTime",
            columnProps: { format: "t", showRelative: false, showTooltip: false },
            default: true,
        },
    },
};

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
