<script setup>
import TableCell from "./TableCell.vue";
import TableRow from "./TableRow.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";

/**
 * An empty-state row for a grid table, spanning columns with centered content.
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
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const theme = useTheme("TableEmpty", props);
</script>

<template>
    <TableRow>
        <TableCell :class="[theme('root'), props.class]" v-bind="delegatedProps">
            <div :class="theme('content')">
                <slot />
            </div>
        </TableCell>
    </TableRow>
</template>
