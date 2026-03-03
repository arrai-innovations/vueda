/**
 * @module use/useObjectGridCell
 * @description Computes the formatted and raw values for a single grid cell from an object, related object, or calculated object.
 */
import { unifiedGet } from "@vueda/utils/unifiedGet.js";
import { computed } from "vue";

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
