<script setup>
import { useTheme } from "@vueda/use/useTheme.js";
import { useClipboard } from "@vueuse/core";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";

const props = defineProps({
    text: {
        type: String,
        required: true,
    },
    toast: {
        type: [String, Object],
        default: null,
    },
});

const { copied, copy } = useClipboard();
const toast = useToast();

const onClick = () => {
    copy(props.text);
    let text = props.toast;
    if (!text) {
        text = `${props.text} copied`;
    }
    const options =
        typeof text === "string" ? { severity: "success", summary: text } : { severity: "success", ...text };
    toast.add(options);
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
        <slot name="text" :text="text">
            {{ text }}
        </slot>
        <slot name="copy-button" v-bind="slotProps">
            <Button v-bind="slotProps" />
        </slot>
    </div>
</template>
