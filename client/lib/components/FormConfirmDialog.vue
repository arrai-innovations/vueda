<script setup>
import AlertDialog from "@vueda/shell/alert-dialog/AlertDialog.vue";
import AlertDialogAction from "@vueda/shell/alert-dialog/AlertDialogAction.vue";
import AlertDialogCancel from "@vueda/shell/alert-dialog/AlertDialogCancel.vue";
import AlertDialogContent from "@vueda/shell/alert-dialog/AlertDialogContent.vue";
import AlertDialogDescription from "@vueda/shell/alert-dialog/AlertDialogDescription.vue";
import AlertDialogFooter from "@vueda/shell/alert-dialog/AlertDialogFooter.vue";
import AlertDialogHeader from "@vueda/shell/alert-dialog/AlertDialogHeader.vue";
import AlertDialogTitle from "@vueda/shell/alert-dialog/AlertDialogTitle.vue";
import { computed } from "vue";

/**
 * Confirmation dialog shown when a save is valid but the server reports advisory warnings that must
 * be acknowledged (HTTP 409). Bind it to the `confirmation` controller returned by `useObjectForm`:
 * confirming retries the save with the warnings acknowledged, cancelling leaves the form unsaved with
 * the warnings still displayed.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** The confirmation controller from `useObjectForm` (`objectForm.confirmation`). */
    controller: { type: Object, required: true },
    /** Dialog heading. */
    title: { type: String, default: "Confirm save" },
    /** Explanatory text shown above the list of warnings. */
    description: { type: String, default: "This change has warnings. Review them before saving." },
    /** Label for the button that proceeds with the save. */
    confirmLabel: { type: String, default: "Save anyway" },
    /** Label for the button that abandons the save. */
    cancelLabel: { type: String, default: "Cancel" },
});

const warnings = computed(() => {
    const messages = props.controller?.messages ?? {};
    return Object.values(messages).flatMap((value) => (Array.isArray(value) ? value : [value]));
});

const onOpenChange = (open) => {
    // Dismissing via Escape or the overlay is treated as a cancel.
    if (!open) {
        props.controller.cancel();
    }
};
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
                <AlertDialogCancel data-qa="form-confirm-cancel" @click="controller.cancel()">
                    {{ cancelLabel }}
                </AlertDialogCancel>
                <AlertDialogAction data-qa="form-confirm-action" @click="controller.confirm()">
                    {{ confirmLabel }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

<style scoped></style>
