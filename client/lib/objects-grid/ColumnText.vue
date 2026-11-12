<script setup>
import { choiceDisplay, fieldChoiceOptions } from "@vueda/utils/choiceLabels.js";
import { computed } from "vue";

/**
 * Default list column adapter. Renders the cell's pre-formatted value as plain
 * text, reproducing ObjectsGrid's historical default cell content. Used as the
 * fallback adapter when no type-specific column component is resolved.
 *
 * Receives the ObjectsGrid `value` slot props (`field`, `value`, `formatted`,
 * `obj`, `pk`, etc.) and reads `formatted` and `field`. A field with static
 * choices shows each stored value as its choice label, with the lookup that
 * `WidgetReadOnly` uses: `displayChoices` when the field has them, otherwise
 * an array of `choices`. A many-valued choice field shows its labels joined
 * with `, `. A field that sets its own `formatted` path shows that path's value
 * as it is, because the server has already formatted it.
 *
 * Other string/number/boolean values render as-is. Object and array values (an
 * inlined related object, or a JSON field, that has no more specific column
 * adapter) render as compact JSON, truncated when very large, so they read
 * sensibly instead of `[object Object]`.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Pre-formatted cell value produced by the grid cell. */
    formatted: {
        type: [String, Number, Boolean, Object, Array],
        default: "",
    },
    /** The column's field descriptor. Its `displayChoices` or `choices` label the stored values. */
    field: {
        type: Object,
        default: undefined,
    },
});

// Cap object rendering so a large/nested payload cannot blow out a cell.
const MAX_JSON_LENGTH = 200;

const choiceOptions = computed(() => (props.field?.formatted ? [] : fieldChoiceOptions(props.field)));

const display = computed(() => {
    const value = props.formatted;
    if (value == null) {
        return "";
    }
    if (choiceOptions.value.length) {
        return choiceDisplay(value, choiceOptions.value);
    }
    if (typeof value === "object") {
        let json;
        try {
            json = JSON.stringify(value);
        } catch {
            // Circular or otherwise non-serializable: fall back to coercion.
            return String(value);
        }
        if (json == null) {
            return "";
        }
        return json.length > MAX_JSON_LENGTH ? `${json.slice(0, MAX_JSON_LENGTH - 1)}…` : json;
    }
    return value;
});
</script>
<template>{{ display }}</template>
