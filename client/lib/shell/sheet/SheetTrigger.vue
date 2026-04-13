<script setup>
import { DialogTrigger } from "reka-ui";

/**
 * A button that opens the Sheet when activated.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <DialogTrigger data-slot="sheet-trigger" v-bind="props">
        <slot />
    </DialogTrigger>
</template>
