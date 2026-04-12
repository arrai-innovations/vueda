<script setup>
import GridTableCell from "./GridTableCell.vue";
import GridTableRow from "./GridTableRow.vue";
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

const theme = useTheme("GridTableEmpty", props);
</script>

<template>
    <GridTableRow>
        <GridTableCell :class="[theme('root'), props.class]" v-bind="delegatedProps">
            <div :class="theme('content')">
                <slot />
            </div>
        </GridTableCell>
    </GridTableRow>
</template>
