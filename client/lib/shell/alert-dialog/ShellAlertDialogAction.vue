<script setup>
import { buttonVariants } from "@vueda/controls/ui/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogAction } from "reka-ui";

/**
 * The action button inside an AlertDialog, styled as a primary button.
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
    <AlertDialogAction v-bind="delegatedProps" :class="cn(buttonVariants(), props.class)">
        <slot />
    </AlertDialogAction>
</template>
