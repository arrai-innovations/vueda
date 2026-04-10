<script setup>
import ControlCommand from "./ControlCommand.vue";
import ShellDialog from "@vueda/shell/dialog/ShellDialog.vue";
import ShellDialogContent from "@vueda/shell/dialog/ShellDialogContent.vue";
import ShellDialogDescription from "@vueda/shell/dialog/ShellDialogDescription.vue";
import ShellDialogHeader from "@vueda/shell/dialog/ShellDialogHeader.vue";
import ShellDialogTitle from "@vueda/shell/dialog/ShellDialogTitle.vue";
import { useForwardPropsEmits } from "reka-ui";

/**
 * Wraps ControlCommand inside a modal dialog for use as a floating command palette.
 */
defineOptions({});

const props = defineProps({
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
const emits = defineEmits(["update:open"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <ShellDialog v-slot="slotProps" v-bind="forwarded">
        <ShellDialogContent class="overflow-hidden p-0">
            <ShellDialogHeader class="sr-only">
                <ShellDialogTitle>{{ title }}</ShellDialogTitle>
                <ShellDialogDescription>{{ description }}</ShellDialogDescription>
            </ShellDialogHeader>
            <ControlCommand>
                <slot v-bind="slotProps" />
            </ControlCommand>
        </ShellDialogContent>
    </ShellDialog>
</template>
