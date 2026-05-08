<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Inline action group for a table row that stays hidden until the parent
 * `<tr>` is hovered, focus-within, or carries `data-state="selected"`. Drop
 * inside a `TableCell` near the right edge of each row; the slot is meant to
 * carry small icon buttons.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("TableRowActions", props);
</script>

<template>
    <span data-slot="table-row-actions" :class="[theme('root'), props.class]">
        <slot :action-class="theme('action')" />
    </span>
</template>
