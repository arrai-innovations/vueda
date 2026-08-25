<script setup>
import AlertDialog from "@vueda/shell/alert-dialog/AlertDialog.vue";
import AlertDialogAction from "@vueda/shell/alert-dialog/AlertDialogAction.vue";
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

const warnings = computed(() => props.controller?.messages ?? {});

const flatWarnings = computed(() => {
    return Object.values(warnings.value).flatMap((value) => (Array.isArray(value) ? value : [value]));
});

const onOpenChange = (open) => {
    // Dismissing via Escape or the overlay is treated as a cancel.
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
            <!-- @slot warnings Replaces the default rendered warnings. `warnings` is the controller's raw warnings mapping, for a consumer that needs to resolve its own shape (e.g. per-object keys for a bulk action, or a single object's field-keyed messages). The default rendering makes no assumption about that shape: it flattens every value in `warnings` into a plain list of messages, ignoring keys. -->
            <slot name="warnings" :warnings="warnings" :flat-warnings="flatWarnings">
                <ul class="list-disc ps-5 text-sm">
                    <li v-for="(warning, index) in flatWarnings" :key="index" data-qa="form-confirm-warning">
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
