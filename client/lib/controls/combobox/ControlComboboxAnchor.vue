<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxAnchor, useForwardProps } from "reka-ui";

/**
 * Anchor element that positions the ControlComboboxList relative to the trigger.
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
    <ComboboxAnchor data-slot="combobox-anchor" v-bind="forwarded" :class="cn('w-[200px]', props.class)">
        <slot />
    </ComboboxAnchor>
</template>
