<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxItemIndicator, useForwardProps } from "reka-ui";

/**
 * Visual indicator shown when a ControlComboboxItem is selected.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
    <ComboboxItemIndicator data-slot="combobox-item-indicator" v-bind="forwarded" :class="cn('ml-auto', props.class)">
        <slot />
    </ComboboxItemIndicator>
</template>
