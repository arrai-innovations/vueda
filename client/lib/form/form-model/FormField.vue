<script setup>
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { useFieldValidation } from "@vueda/use/validation/useFieldValidation.js";
import omit from "lodash-es/omit.js";
import { computed, useAttrs, useSlots } from "vue";

/**
 * Generic form field component that provides field context, dispatches
 * type-specific validation via a `validation` key, and optionally renders
 * layout (label, description, errors) using the Field family.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** Validation type string dispatched to useFieldValidation (e.g. "text", "numeric", "date"). */
    validation: {
        type: String,
        default: undefined,
    },
    /** Controls whether the label and input stack vertically, sit side by side, or switch layout responsively. */
    orientation: {
        type: String,
        default: "vertical",
    },
    /**
     * When true, suppresses the Field layout shell (label, description,
     * errors). Used by filter fields (which provide their own heading) and
     * injected automatically by useFieldRenderer in fieldset contexts.
     */
    hidden: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const attrs = useAttrs();
const slots = useSlots();
const fieldContext = useField(props, emit);
useFieldValidation(props.validation, fieldContext, attrs);
const fieldId = fieldContext.state.fieldId;
const fieldName = computed(() => fieldContext.state.name);

const labelSlot = useSlotNameResolver(
    computed(() => [`field(${fieldName.value})label`, "field-label"]),
    slots,
);
const helpSlot = useSlotNameResolver(
    computed(() => [`field(${fieldName.value})help`, "field-help"]),
    slots,
);
const errorsSlot = useSlotNameResolver(
    computed(() => [`field(${fieldName.value})errors`, "field-errors"]),
    slots,
);
const warningsSlot = useSlotNameResolver(
    computed(() => [`field(${fieldName.value})warnings`, "field-warnings"]),
    slots,
);
</script>
<template>
    <Field v-if="!hidden" :orientation="orientation" :class="$attrs.class" data-qa="form-field">
        <FieldLabel :for="fieldId">
            <!-- @slot [field(fieldName)label, field-label] Override the label content for this field. -->
            <slot :name="labelSlot.name" :label="fieldContext.state.label" :required="fieldContext.state.required">
                {{ fieldContext.state.label }}
                <span v-if="fieldContext.state.required" aria-hidden="true" class="text-destructive font-medium"
                    >*</span
                >
            </slot>
        </FieldLabel>
        <FieldContent>
            <slot :field-id="fieldId" :field-attrs="omit($attrs, ['class'])" :field-props="props" />
            <!-- @slot [field(fieldName)help, field-help] Override the help/description text for this field. -->
            <slot
                v-if="helpSlot.exists || fieldContext.state.help"
                :name="helpSlot.name"
                :help="fieldContext.state.help"
            >
                <FieldDescription v-if="fieldContext.state.help">
                    {{ fieldContext.state.help }}
                </FieldDescription>
            </slot>
            <!-- @slot [field(fieldName)errors, field-errors] Override the error messages for this field. -->
            <slot :name="errorsSlot.name" :errors="fieldContext.state.errors">
                <FieldMessage :messages="Object.values(fieldContext.state.errors)" />
            </slot>
            <!-- @slot [field(fieldName)warnings, field-warnings] Override the warning messages for this field. -->
            <slot :name="warningsSlot.name" :messages="fieldContext.state.messages">
                <FieldMessage
                    v-if="Object.keys(fieldContext.state.messages).length"
                    severity="warning"
                    :messages="Object.values(fieldContext.state.messages)"
                />
            </slot>
        </FieldContent>
    </Field>
    <div v-else :class="$attrs.class" data-qa="form-field">
        <slot :field-id="fieldId" :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
