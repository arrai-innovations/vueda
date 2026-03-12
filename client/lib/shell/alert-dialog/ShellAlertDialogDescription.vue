<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogDescription } from "reka-ui";

/**
 * The description text inside an AlertDialog.
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
    <AlertDialogDescription
        data-slot="alert-dialog-description"
        v-bind="delegatedProps"
        :class="cn('text-muted-foreground text-sm', props.class)"
    >
        <slot />
    </AlertDialogDescription>
</template>
