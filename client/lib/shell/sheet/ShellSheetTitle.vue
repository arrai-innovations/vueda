<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogTitle } from "reka-ui";

/**
 * The title of a Sheet, readable by assistive technology.
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
    <DialogTitle
        data-slot="sheet-title"
        :class="cn('text-foreground font-semibold', props.class)"
        v-bind="delegatedProps"
    >
        <slot />
    </DialogTitle>
</template>
