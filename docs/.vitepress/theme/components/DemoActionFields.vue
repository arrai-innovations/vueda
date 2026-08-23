<script setup>
import FormField from "@vueda/form/form-model/FormField.vue";
import ViewAction from "@vueda/views/ViewAction.vue";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";

/**
 * Docs-only wrapper that mounts a real {@link ViewAction} with its `extra-fields` slot filled.
 *
 * `ModelDemo` renders the view as the sub-app root and passes props, so it has no way to hand a
 * view slot content. This component supplies that one slot and nothing else: everything on screen
 * is the framework's own output.
 *
 * It also shows the two settings an action with input needs, which are not defaults:
 *
 * - `has-input` makes `ActionForm` validate before submitting. Without it the confirm button
 *   ignores the fields entirely and a required-but-empty field still submits.
 * - `transform-submit-data-fn` is what puts field values in the request body. `useModelAction`
 *   sends a body only when it is supplied, which is deliberate: `ViewAction` seeds its form with
 *   one entry per primary key so per-object server errors have somewhere to land, and that shape
 *   is not a request body.
 *
 * Both reach `ModelActionForm` and `ActionForm` as fall-through attributes.
 */
defineProps({
    /** Django app label. */
    app: { type: String, required: true },
    /** Model name. */
    model: { type: String, required: true },
    /** Primary key(s) the action targets. */
    pk: { type: [String, Number, Array], default: undefined },
    /** Action name sent to the server. */
    action: { type: String, required: true },
});

/**
 * Shape the form state into the action's request body.
 *
 * @param {object} values - Raw form values, keyed by field name.
 * @returns {object} The body merged into the action request.
 */
function transformSubmitData(values) {
    return { reason: values.reason, copy_notes: !!values.copy_notes };
}
</script>

<template>
    <ViewAction
        :action="action"
        :app="app"
        has-input
        :model="model"
        :pk="pk"
        :require-modified="false"
        :transform-submit-data-fn="transformSubmitData"
    >
        <template #extra-fields>
            <FormField
                help="Stored on the copy and shown in its history."
                label="Reason"
                name="reason"
                :required="true"
                validation="text"
            >
                <WidgetTextInput placeholder="Renewal quote for the same customer" :required="true" />
            </FormField>
            <FormField label="Copy internal notes" name="copy_notes">
                <WidgetCheckbox />
            </FormField>
        </template>
    </ViewAction>
</template>
