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
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { computed } from "vue";

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
    fields: {
        type: Array,
        default: () => [],
    },
    variant: {
        type: String,
        default: "default",
    },
    fieldComponents: {
        type: Object,
        default: () => ({}),
    },
    fieldProps: {
        type: Object,
        default: () => ({}),
    },
    fieldObjects: {
        type: Object,
        default: () => ({}),
    },
    widgetComponents: {
        type: Object,
        default: () => ({}),
    },
    widgetProps: {
        type: Object,
        default: () => ({}),
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
const myFieldObjects = computed(() => props.fields.map((x) => formModel.fieldObjects[x]));
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
                    :field-objects="myFieldObjects"
                    :field-props="formModel.fieldProps"
                    name="fields"
                    :theme="theme"
                    :widget-components="formModel.widgetComponents"
                >
                    <template v-for="fieldObject in myFieldObjects" :key="fieldObject?.name">
                        <slot
                            :field-component="formModel.fieldComponents[fieldObject?.name]?.value"
                            :field-object="fieldObject"
                            :field-props="formModel.fieldProps[fieldObject?.name]"
                            :name="`field(${fieldObject?.name})`"
                            :theme="theme"
                            :widget-component="formModel.widgetComponents[fieldObject?.name]?.value"
                            :widget-props="formModel.widgetProps[fieldObject?.name]?.value"
                        >
                            <component
                                :is="formModel.fieldComponents[fieldObject?.name].value"
                                v-if="formModel.fieldComponents[fieldObject?.name]?.value"
                                :class="theme('field')"
                                v-bind="formModel.fieldProps[fieldObject?.name]"
                            >
                                <div :class="theme('fieldInner')">
                                    <slot
                                        :field-object="fieldObject"
                                        :name="`widget(${fieldObject?.name})`"
                                        :theme="theme"
                                        :widget-component="formModel.widgetComponents[fieldObject?.name]?.value"
                                        :widget-props="formModel.widgetProps[fieldObject?.name]"
                                    >
                                        <component
                                            :is="formModel.widgetComponents[fieldObject?.name]?.value"
                                            v-bind="formModel.widgetProps[fieldObject?.name]"
                                            v-if="formModel.widgetComponents[fieldObject?.name]?.value"
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
