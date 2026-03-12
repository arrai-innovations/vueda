<script setup>
import { Button } from "@vueda/controls/ui/button";
import { cn } from "@vueda/utils/cn.js";
import { DialogClose } from "reka-ui";

/**
 * The footer area of a Dialog, used to arrange action buttons and an optional close button.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to show a built-in close button. */
    showCloseButton: { type: Boolean, default: false },
});
</script>

<template>
    <div data-slot="dialog-footer" :class="cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', props.class)">
        <slot />
        <DialogClose v-if="showCloseButton" as-child>
            <Button variant="outline"> Close </Button>
        </DialogClose>
    </div>
</template>
