<script setup>
import { useTheme } from "@vueda/use/useTheme.js";
import { useClipboard } from "@vueuse/core";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";

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
    /** Toast notification config shown after copying; a string is used as the summary, an object is merged with default toast options. Defaults to `"<text> copied"`. */
    toast: {
        type: [String, Object],
        default: null,
    },
});

const { copied, copy } = useClipboard();
const toastService = useToast();

const onClick = () => {
    copy(props.text);
    let text = props.toast;
    if (!text) {
        text = `${props.text} copied`;
    }
    const options =
        typeof text === "string" ? { severity: "success", summary: text } : { severity: "success", ...text };
    toastService.add(options);
};

const slotProps = {
    onClick,
    label: "copy",
    severity: "secondary",
    rounded: true,
    variant: "text",
    size: "small",
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
            <Button v-bind="slotProps" />
        </slot>
    </div>
</template>
