<script setup>
/**
 * This component is the contests of a simple form for when a simple form will do. Customization means making your own.
 * It does not handle the form, you do.
 *
 * @name FormModel
 * @example
 * ```vue
 * <script setup>
 * const myState = reactive({
 *     submitting: false,
 *     // when initialValues is changed, the form is reset to match
 *     initialValues: {},
 * });
 * const form = useForm(myState);
 * const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     myState.submitting = true;
 *     if (form.anyError) {
 *         // do you want to prevent submission if there are errors?
 *         // up to you
 *         // toast.add({
 *         //    severity: "error",
 *         //    summary: "Form Error",
 *         //    detail: "Please correct the form errors."
 *         // });
 *         return;
 *     try {
 *         // hit the server
 *     } catch (e) {
 *         if (e instanceof FormValidationError) {
 *             form.handleServerFormValidationError(e);
 *             return;
 *         }
 *         throw e;
 *     } finally {
 *         myState.submitting = false;
 *     }
 *     // handle success, toast, redirect, etc.
 *     // toast.add({
 *     //    severity: "success",
 *     //    summary: "Success",
 *     //    detail: "Form submitted successfully."
 *     // });
 * };
 * const isActive = useIsActive();
 * watch(
 *     isActive,
 *     () => {
 *         // go get initial values based on your props or something
 *     },
 *     {
 *         immediate: true,
 *     },
 * );
 * < /script>
 * <template>
 * <form @submit="handleSubmit">
 *     <!-- renders a form with fields for 'field1' and 'field2' -->
 *     <form-model app="myapp" model="mymodel" :fields="['field1', 'field2']">
 *     <!-- controls are up to you -->
 *     <button type="submit">Submit</button>
 * </form>
 * </template>
 * ```
 */
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useFormModel } from "@vueda/use/useFormModel.js";

const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    fieldsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    fieldClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    beforeFieldsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    afterFieldsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const formModel = useFormModel(props);
// todo: look into customizability re: overriding field / widget components with arbitrary slot content
// todo: it would be nice to have a way to layout the fields into fieldsets / grids
</script>

<template>
    <div data-qa="form-model">
        <template v-if="formModel.fields?.length">
            <div v-if="$slots.beforeFields">
                <slot name="beforeFields" />
            </div>
            <div v-for="fieldObj in formModel.fields.map((x) => formModel.fieldObjects[x])" :key="fieldObj?.name">
                <component :is="formModel.fieldComponents[fieldObj?.name]" v-if="fieldObj" v-bind="fieldObj">
                    <template v-if="!$slots[`field-${fieldObj?.name}`]" #default>
                        <div>
                            <component
                                :is="formModel.widgetComponents[fieldObj.name]"
                                v-bind="formModel.widgetProps[fieldObj.name]"
                            />
                            <form-help-text />
                            <form-feedback type="error" />
                            <form-feedback type="message" />
                        </div>
                    </template>
                    <template v-else #default>
                        <slot :name="`field-${fieldObj?.name}`" />
                    </template>
                </component>
            </div>
            <div v-if="$slots.afterFields">
                <slot name="afterFields" />
            </div>
        </template>
        <template v-else>
            <loading-spinner-block />
            Loading model information.
        </template>
    </div>
</template>

<style scoped></style>
