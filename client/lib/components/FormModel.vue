<script setup>
/**
 * This component is a form model that renders fields based on the configuration for the model.
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
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { deepUnref } from "vue-deepunref";

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    view: {
        type: String,
        default: undefined,
        description: "If set, use view specific configuration for the form, otherwise use the default configuration.",
    },
    fields: {
        type: Array,
        default: undefined,
        description: "The fields to render in the form, if not wanting to use the configuration default for this view.",
    },
    expands: {
        type: Array,
        default: undefined,
        description: "The fields to render in the form, expanded.",
    },
    variant: {
        type: String,
        default: "default",
    },
    fieldComponents: {
        type: Object,
        default: undefined,
        description: "A map of field paths to async fns returning field component, as overrides.",
    },
    fieldProps: {
        type: Object,
        default: undefined,
        description: "A map of field paths to props, as overrides.",
    },
    fieldDetails: {
        type: Object,
        default: undefined,
        description: "A map of field paths to field details, as overrides.",
    },
    widgetComponents: {
        type: Object,
        default: undefined,
        description: "A map of field paths to async fns returning widget component, as overrides.",
    },
    widgetProps: {
        type: Object,
        default: undefined,
        description: "A map of field paths to props, as overrides.",
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
const theme = useComputedClasses(vuedaTailwind.FormModel);
</script>

<template>
    <div :class="theme('root')" data-qa="form-model">
        <template v-if="formModel.fields?.length">
            <div v-if="$slots.beforeFields" :class="theme('beforeFields')">
                <slot name="beforeFields" />
            </div>
            <div v-bind="$attrs">
                <slot
                    :all-widget-props="formModel.widgetProps"
                    :field-components="formModel.fieldComponents"
                    :field-details="formModel.fieldDetails"
                    :field-props="formModel.fieldProps"
                    name="fields"
                    :theme="theme"
                    :widget-components="formModel.widgetComponents"
                >
                    <template v-for="fieldName in deepUnref(formModel.fields)" :key="fieldName">
                        <slot
                            :field-class="theme('field')"
                            :field-component="formModel.fieldComponents[fieldName]"
                            :field-detail="formModel.fieldDetails[fieldName]"
                            :field-inner-class="theme('fieldInner')"
                            :field-props="formModel.fieldProps[fieldName]"
                            :name="`field(${fieldName})`"
                            :theme="theme"
                            :widget-component="formModel.widgetComponents[fieldName]"
                            :widget-props="formModel.widgetProps[fieldName]"
                        >
                            <component
                                :is="formModel.fieldComponents[fieldName]"
                                v-if="formModel.fieldComponents[fieldName]"
                                :class="theme('field')"
                                v-bind="formModel.fieldProps[fieldName]"
                            >
                                <div :class="theme('fieldInner')">
                                    <slot
                                        :field-object="formModel.fieldDetails[fieldName]"
                                        :name="`widget(${fieldName})`"
                                        :theme="theme"
                                        :widget-component="formModel.widgetComponents[fieldName]"
                                        :widget-props="formModel.widgetProps[fieldName]"
                                    >
                                        <component
                                            :is="formModel.widgetComponents[fieldName]"
                                            v-bind="formModel.widgetProps[fieldName]"
                                            v-if="formModel.widgetComponents[fieldName]"
                                        />
                                    </slot>
                                    <form-help-text />
                                    <form-feedback type="error" />
                                    <form-feedback type="message" />
                                </div>
                            </component>
                        </slot>
                    </template>
                </slot>
            </div>
            <div v-if="$slots.afterFields" :class="theme('afterFields')">
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
