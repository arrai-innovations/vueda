<script setup>
import TableCell from "./TableCell.vue";
import TableRow from "./TableRow.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";

/**
 * An empty-state row for a grid table, spanning columns with centered content.
 *
 * The `variant` prop drives `data-variant` on the content wrapper so that
 * descendants marked `data-slot="icon"` pick up variant-specific treatment:
 * `loading` spins the icon, `error` recolors it to `--destructive`, and
 * `empty` / `filtered` keep the muted default. The slot content
 * (icon, title, description, actions) is consumer-provided.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The number of columns the empty cell spans. */
    colspan: { type: Number, default: 1 },
    /** Empty-state variant: `empty` (default), `loading`, `error`, or `filtered`. */
    variant: {
        type: String,
        default: "empty",
        validator: (value) => ["empty", "loading", "error", "filtered"].includes(value),
    },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "variant");

const theme = useTheme("TableEmpty", props);
</script>

<template>
    <TableRow>
        <TableCell :class="[theme('root'), props.class]" :style="theme.hideStyle?.value" v-bind="delegatedProps">
            <div :class="theme('content')" :data-variant="props.variant">
                <slot />
            </div>
        </TableCell>
    </TableRow>
</template>
