<script setup>
import Button from "@vueda/controls/button/Button.vue";
import AlertDialog from "@vueda/shell/alert-dialog/AlertDialog.vue";
import AlertDialogCancel from "@vueda/shell/alert-dialog/AlertDialogCancel.vue";
import AlertDialogContent from "@vueda/shell/alert-dialog/AlertDialogContent.vue";
import AlertDialogDescription from "@vueda/shell/alert-dialog/AlertDialogDescription.vue";
import AlertDialogFooter from "@vueda/shell/alert-dialog/AlertDialogFooter.vue";
import AlertDialogHeader from "@vueda/shell/alert-dialog/AlertDialogHeader.vue";
import AlertDialogTitle from "@vueda/shell/alert-dialog/AlertDialogTitle.vue";
import { computed, onBeforeUnmount, onMounted } from "vue";

/**
 * Confirmation dialog shown when a submission is valid but the server reports advisory warnings that
 * must be acknowledged (HTTP 409). Bind it to the `confirmation` controller returned by
 * `useObjectForm` or `useActionForm`: confirming retries the submission with the warnings
 * acknowledged, cancelling leaves it unsaved with the warnings still displayed.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** The confirmation controller (`objectForm.confirmation` from `useObjectForm`, or `confirmation` from `useActionForm`). */
    controller: { type: Object, required: true },
    /** Dialog heading. */
    title: { type: String, default: "Confirm action" },
    /** Explanatory text shown above the list of warnings. */
    description: { type: String, default: "This action has warnings. Review them before continuing." },
    /** Label for the button that proceeds. */
    confirmLabel: { type: String, default: "Continue anyway" },
    /** Label for the button that abandons the action. */
    cancelLabel: { type: String, default: "Cancel" },
});

const warnings = computed(() => {
    const messages = props.controller?.messages ?? {};
    return Object.values(messages).flatMap((value) => (Array.isArray(value) ? value : [value]));
});

const onOpenChange = (open) => {
    // AlertDialogContent prevents outside interaction, so Escape is the only gesture (besides the
    // Cancel button) that can report the dialog closed here; treat it as a cancel.
    if (!open) {
        props.controller.cancel();
    }
};

// Announce to the controller that a dialog is bound and will resolve its requests; without a
// registered consumer the controller fails confirmation requests closed (resolves them as
// cancelled). Optional chaining tolerates plain-object controllers in tests or custom shells.
onMounted(() => props.controller.register?.());
onBeforeUnmount(() => props.controller.unregister?.());
</script>

<template>
    <AlertDialog :open="controller.open" @update:open="onOpenChange">
        <AlertDialogContent data-qa="form-confirm-dialog">
            <AlertDialogHeader>
                <AlertDialogTitle>{{ title }}</AlertDialogTitle>
                <AlertDialogDescription>{{ description }}</AlertDialogDescription>
            </AlertDialogHeader>
            <!-- @slot warnings Replaces the default rendered list of warning messages. -->
            <slot name="warnings" :warnings="warnings">
                <ul class="list-disc ps-5 text-sm">
                    <li v-for="(warning, index) in warnings" :key="index" data-qa="form-confirm-warning">
                        {{ warning }}
                    </li>
                </ul>
            </slot>
            <AlertDialogFooter>
                <AlertDialogCancel data-qa="form-confirm-cancel">
                    {{ cancelLabel }}
                </AlertDialogCancel>
                <Button data-qa="form-confirm-action" type="button" tone="primary" @click="controller.confirm()">
                    {{ confirmLabel }}
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

<style scoped></style>
