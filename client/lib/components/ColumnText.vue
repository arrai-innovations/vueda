<script setup>
/**
 * Default list column adapter. Renders the cell's pre-formatted value as plain
 * text, reproducing ObjectsGrid's historical default cell content. Used as the
 * fallback adapter when no type-specific column component is resolved.
 *
 * Receives the ObjectsGrid `value` slot props (`field`, `value`, `formatted`,
 * `obj`, `pk`, etc.); only `formatted` is consumed.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Pre-formatted cell value produced by the grid cell. */
    formatted: {
        type: [String, Number, Boolean],
        default: "",
    },
});
</script>
<template>{{ formatted }}</template>
