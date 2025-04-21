import { computed, unref } from "vue";

// Warning: This file makes assumptions about various form, field, and widget context behaviors,
//  to skip to sources of truth, assuming a form model in use... (which it wasn't intended to always be)

/**
 * @typedef {object} FieldHeaderProps
 * @property {string} label - The field label.
 * @property {string} help - The field help text.
 * @property {boolean} required - Whether the field is required.
 * @property {boolean} invalid - Whether the field is invalid.
 * @property {boolean} readOnly - Whether the field is read-only.
 */

/**
 * @param {import('@vueda/use/useFormModel.js').UseFormModelState} formModel - The form model's reactive state.
 * @param {import('@vueda/use/useForm.js').FormContext} formContext - The form context object.
 * @param {import('vue').Ref<string>|string} formModelName - The full FormModel name of the field.
 * @param {import('vue').Ref<string>|string} fieldValuePath - The field value path.
 * @returns {import('vue').ComputedRef<FieldHeaderProps>} - The field header props.
 */
export function useFieldSetTabularHeaderProps(formModel, formContext, formModelName, fieldValuePath) {
    return {
        label: computed(() => formModel.fieldDetails[unref(formModelName)]?.label || unref(formModelName)),
        help: computed(() => formModel.widgetProps[unref(formModelName)]?.help || ""),
        required: computed(() => !!formContext.state.required[unref(fieldValuePath)]),
        invalid: computed(() => !!Object.values(formContext.state.errors[unref(fieldValuePath)] || {}).length),
        readOnly: computed(() => formModel.widgetProps[unref(formModelName)]?.readOnly),
    };
}
