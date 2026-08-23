<script setup>
import FormField from "@vueda/form/form-model/FormField.vue";
import ViewAction from "@vueda/views/ViewAction.vue";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";

/**
 * Docs-only wrapper that renders a live ViewAction with the `extra-fields` slot.
 *
 * ModelDemo mounts the target view as the sub-app root and can only pass props,
 * so demos that need view slots use a wrapper component.
 *
 * `has-input` and `transform-submit-data-fn` are required here so the slotted
 * fields participate in validation and become the action request body.
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
