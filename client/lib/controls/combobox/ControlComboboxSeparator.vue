<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxSeparator } from "reka-ui";

/**
 * A visual divider between groups or items in ControlComboboxList.
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
</script>

<template>
    <ComboboxSeparator
        data-slot="combobox-separator"
        v-bind="delegatedProps"
        :class="cn('bg-border -mx-1 h-px', props.class)"
    >
        <slot />
    </ComboboxSeparator>
</template>
