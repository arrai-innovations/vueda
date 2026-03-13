<script setup>
import { cn } from "@vueda/utils/cn.js";
import { SelectLabel } from "reka-ui";

/**
 * A label for a ControlSelectGroup.
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
</script>

<template>
    <SelectLabel
        data-slot="select-label"
        :as="as"
        :as-child="asChild"
        :class="cn('text-muted-foreground px-2 py-1.5 text-xs', props.class)"
    >
        <slot />
    </SelectLabel>
</template>
