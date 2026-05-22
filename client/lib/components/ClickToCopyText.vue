<script setup>
import Button from "@vueda/controls/button/Button.vue";
import { useTheme } from "@vueda/use/useTheme.js";
import { useClipboard } from "@vueuse/core";
import { toast as sonnerToast } from "vue-sonner";

/**
 * Displays a text value alongside a button that copies it to the clipboard and shows a toast notification on success.
 */
defineOptions({});

const props = defineProps({
    /** The text value to display and copy to the clipboard. */
    text: {
        type: String,
        required: true,
    },
    /** Toast message shown after copying. Defaults to `"<text> copied"`. */
    toast: {
        type: String,
        default: null,
    },
});

const { copied, copy } = useClipboard();

const onClick = () => {
    copy(props.text);
    sonnerToast.success(props.toast || `${props.text} copied`);
};

const slotProps = {
    onClick,
    label: "copy",
    variant: "ghost",
    size: "sm",
    text: props.text,
    copied,
};

const theme = useTheme("ClickToCopyText", props);
</script>

<template>
    <div :class="theme('root')">
        <!-- Renders the text value; receives `text` as a slot prop. -->
        <slot name="text" :text="text">
            {{ text }}
        </slot>
        <!-- Renders the copy button; receives `onClick`, `label`, `severity`, `rounded`, `variant`, `size`, `text`, and `copied` as slot props. -->
        <slot name="copy-button" v-bind="slotProps">
            <Button :variant="slotProps.variant" :size="slotProps.size" @click="slotProps.onClick">
                {{ slotProps.label }}
            </Button>
        </slot>
    </div>
</template>
