<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A table wrapper component providing a scrollable container and styled table element.
 *
 * Supports a sticky-header mode (`sticky` prop) that pins `thead` cells to the
 * top of the scroll container, and a three-tier density mode (`density` prop:
 * `default` | `compact` | `condensed`) that drives `data-density` on the
 * `<table>` element so descendant `TableHead` and `TableCell` primitives pick
 * up the matching row heights.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** When true, the container becomes a vertically scrollable region with a sticky `thead`. */
    sticky: { type: Boolean, default: false },
    /** Row-height tier applied via `data-density` on the table element. */
    density: {
        type: String,
        default: undefined,
        validator: (value) => value === undefined || ["default", "compact", "condensed"].includes(value),
    },
});

const theme = useTheme("Table", props);
</script>

<template>
    <div
        data-slot="table-container"
        :data-sticky="props.sticky ? '' : null"
        :class="theme('container')"
        :style="theme.hideStyle?.value"
    >
        <table data-slot="table" :data-density="props.density ?? null" :class="[theme('table'), props.class]">
            <slot />
        </table>
    </div>
</template>
