/**
 * @module use/useObjectGridCell
 * @description Computes the formatted and raw values for a single grid cell from an object, related object, or calculated object.
 */
import { unifiedGet } from "@vueda/utils/unifiedGet.js";
import { computed } from "vue";

/**
 * @typedef {object} ObjectGridCellInstance
 * @property {import('vue').ComputedRef<any>} formattedComputed - The formatted display value for the cell.
 * @property {import('vue').ComputedRef<any>} valueComputed - The raw value for the cell.
 */

/**
 * Computes the formatted and raw values for a single grid cell.
 *
 * @param {{
 *   obj: { [key: string]: unknown },
 *   relatedObject?: { [key: string]: unknown },
 *   calculatedObject?: { [key: string]: unknown },
 *   field: import('@vueda/stores/storeModelInfo.js').FieldInfo
 * }} props - The component props.
 * @returns {ObjectGridCellInstance}
 */
export function useObjectGridCell(props) {
    const formattedComputed = computed(() =>
        unifiedGet(
            props.obj,
            props.relatedObject,
            props.calculatedObject,
            props.field.formatted ?? props.field.value ?? props.field.name,
        ),
    );
    const valueComputed = computed(() =>
        unifiedGet(props.obj, props.relatedObject, props.calculatedObject, props.field.value ?? props.field.name),
    );
    return {
        formattedComputed,
        valueComputed,
    };
}
