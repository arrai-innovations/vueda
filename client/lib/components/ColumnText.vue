<script setup>
import { computed } from "vue";

/**
 * Default list column adapter. Renders the cell's pre-formatted value as plain
 * text, reproducing ObjectsGrid's historical default cell content. Used as the
 * fallback adapter when no type-specific column component is resolved.
 *
 * Receives the ObjectsGrid `value` slot props (`field`, `value`, `formatted`,
 * `obj`, `pk`, etc.); only `formatted` is consumed. String/number/boolean
 * values render as-is. Object and array values (an inlined related object, or a
 * JSON field, that has no more specific column adapter) render as compact JSON,
 * truncated when very large, so they read sensibly instead of `[object Object]`.
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
});

// Cap object rendering so a large/nested payload cannot blow out a cell.
const MAX_JSON_LENGTH = 200;

const display = computed(() => {
    const value = props.formatted;
    if (value == null) {
        return "";
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
