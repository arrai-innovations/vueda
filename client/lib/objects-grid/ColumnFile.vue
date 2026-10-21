<script setup>
import FileDisplay from "@vueda/display/file-display/FileDisplay.vue";

/**
 * File and image list column adapter. Wraps {@link FileDisplay} in its inline form, binding
 * the cell's raw `value`, so a cell shows a link labelled with the file name where the
 * {@link ColumnText} fallback printed the `{ name, url }` object as `JSON`.
 *
 * The cell holds its own link, so `ViewList` does not wrap this adapter in the record's
 * detail link.
 *
 * Receives the ObjectsGrid `value` slot props; only `value` is consumed for rendering.
 * `inheritAttrs` is disabled so the remaining cell context props (`field`, `formatted`,
 * `obj`, etc.) are not leaked as DOM attributes onto the FileDisplay root.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Raw cell value: a `{ name, url }` object or a URL string. */
    value: {
        type: [String, Object],
        default: undefined,
    },
});
</script>
<template>
    <file-display :value="value" inline />
</template>
