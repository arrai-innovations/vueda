<script setup>
import { AlertDialogTrigger } from "reka-ui";

/**
 * The trigger button that opens an AlertDialog.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <AlertDialogTrigger data-slot="alert-dialog-trigger" v-bind="props">
        <slot />
    </AlertDialogTrigger>
</template>
