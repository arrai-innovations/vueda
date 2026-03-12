<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogTitle } from "reka-ui";

/**
 * The title inside an AlertDialog.
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
    <AlertDialogTitle
        data-slot="alert-dialog-title"
        v-bind="delegatedProps"
        :class="cn('text-lg font-semibold', props.class)"
    >
        <slot />
    </AlertDialogTitle>
</template>
