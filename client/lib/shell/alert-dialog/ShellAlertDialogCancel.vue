<script setup>
import { buttonVariants } from "@vueda/controls/ui/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogCancel } from "reka-ui";

/**
 * The cancel button inside an AlertDialog, styled as an outline button.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <AlertDialogCancel
        v-bind="delegatedProps"
        :class="cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', props.class)"
    >
        <slot />
    </AlertDialogCancel>
</template>
