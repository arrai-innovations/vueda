<script setup>
import Command from "./Command.vue";
import Dialog from "@vueda/shell/dialog/Dialog.vue";
import DialogContent from "@vueda/shell/dialog/DialogContent.vue";
import DialogDescription from "@vueda/shell/dialog/DialogDescription.vue";
import DialogHeader from "@vueda/shell/dialog/DialogHeader.vue";
import DialogTitle from "@vueda/shell/dialog/DialogTitle.vue";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";

/**
 * Wraps Command inside a modal dialog for use as a floating command palette.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled open state. Can be bound with v-model:open. */
    open: { type: Boolean, default: undefined },
    /** The open state when initially rendered. Use when you do not need to control the open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** When true, interaction with outside elements is disabled and only dialog content is visible to screen readers. */
    modal: { type: Boolean, default: undefined },
    /** Accessible title shown in the dialog header. */
    title: { type: String, default: "Command Palette" },
    /** Accessible description shown in the dialog header. */
    description: { type: String, default: "Search for a command to run..." },
});
const emits = defineEmits({
    /** Emitted when the open state changes. */
    "update:open": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "title", "description");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("CommandDialog", props);
</script>

<template>
    <!-- TODO: theme.hideStyle requires a single themed root -->
    <Dialog v-slot="slotProps" v-bind="forwarded">
        <DialogContent :class="theme('content')">
            <DialogHeader :class="theme('header')">
                <DialogTitle>{{ props.title }}</DialogTitle>
                <DialogDescription>{{ props.description }}</DialogDescription>
            </DialogHeader>
            <Command>
                <slot v-bind="slotProps" />
            </Command>
        </DialogContent>
    </Dialog>
</template>
