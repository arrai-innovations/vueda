<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogDescription } from "reka-ui";

/**
 * A description rendered inside a Sheet to provide context to screen readers.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <DialogDescription
        data-slot="sheet-description"
        :class="cn('text-muted-foreground text-sm', props.class)"
        v-bind="delegatedProps"
    >
        <slot />
    </DialogDescription>
</template>
