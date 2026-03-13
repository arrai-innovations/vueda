<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { SelectSeparator } from "reka-ui";

/**
 * A visual divider between groups or items in ControlSelectContent.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
    /** Whether the separator is purely decorative (hidden from assistive tech). */
    decorative: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <SelectSeparator
        data-slot="select-separator"
        v-bind="delegatedProps"
        :class="cn('bg-border pointer-events-none -mx-1 my-1 h-px', props.class)"
    />
</template>
