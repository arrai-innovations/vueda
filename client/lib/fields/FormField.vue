<script setup>
import {
    ShellField,
    ShellFieldContent,
    ShellFieldDescription,
    ShellFieldError,
    ShellFieldLabel,
} from "@vueda/shell/field";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useFieldValidation } from "@vueda/use/validation/useFieldValidation.js";
import omit from "lodash-es/omit.js";
import { useAttrs } from "vue";

/**
 * Generic form field component that provides field context, dispatches
 * type-specific validation via a `validation` key, and optionally renders
 * layout (label, description, errors) using the ShellField family.
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
     * When true, suppresses the ShellField layout shell (label, description,
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
const fieldContext = useField(props, emit);
useFieldValidation(props.validation, fieldContext, attrs);
const fieldId = fieldContext.state.fieldId;
</script>
<template>
    <ShellField v-if="!hidden" :orientation="orientation" :class="$attrs.class" data-qa="form-field">
        <ShellFieldLabel :for="fieldId">
            {{ fieldContext.state.label }}
            <span v-if="fieldContext.state.required" aria-hidden="true">*</span>
        </ShellFieldLabel>
        <ShellFieldContent>
            <slot :field-id="fieldId" :field-attrs="omit($attrs, ['class'])" :field-props="props" />
            <ShellFieldDescription v-if="fieldContext.state.help">
                {{ fieldContext.state.help }}
            </ShellFieldDescription>
            <ShellFieldError :errors="Object.values(fieldContext.state.errors)" />
        </ShellFieldContent>
    </ShellField>
    <div v-else :class="$attrs.class" data-qa="form-field">
        <slot :field-id="fieldId" :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
