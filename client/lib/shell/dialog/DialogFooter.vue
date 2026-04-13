<script setup>
import Button from "@vueda/controls/button/Button.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { DialogClose } from "reka-ui";

/**
 * The footer area of a Dialog, used to arrange action buttons and an optional close button.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to show a built-in close button. */
    showCloseButton: { type: Boolean, default: false },
});

const theme = useTheme("DialogFooter", props);
</script>

<template>
    <div data-slot="dialog-footer" :class="[theme('root'), props.class]">
        <slot />
        <DialogClose v-if="showCloseButton" as-child>
            <Button variant="outline"> Close </Button>
        </DialogClose>
    </div>
</template>
