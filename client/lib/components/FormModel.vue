<script setup>
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import FormMessage from "@vueda/components/FormMessage.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, useSlots } from "vue";

/**
 * This component is a form model that renders fields based on the configuration for the model.
 *
 * @name FormModel
 * @example
 * ```vue
 * <script setup>
 * import FormModel from "@vueda/components/FormModel.vue";
 * import { useForm } from "@vueda/use/useForm.js";
 * import { useIsActive } from "@vueda/use/useIsActive.js";
 * import { reactive, watch } from "vue";
 * import { FormValidationError } from "@vueda/utils/errors.js";
 *
 * const myState = reactive({
 *     submitting: false,
 *     // when initialValues is changed, the form is reset to match
 *     initialValues: {},
 * });
 * const form = useForm(myState);
 *
 * const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     myState.submitting = true;
 *     if (form.anyError) {
 *         // Optionally prevent submission if there are errors
 *         // toast.add({
 *         //    severity: "error",
 *         //    summary: "Form Error",
 *         //    detail: "Please correct the form errors."
 *         // });
 *         return;
 *     }
 *     try {
 *         // Send data to the server
 *     } catch (e) {
 *         if (e instanceof FormValidationError) {
 *             form.handleServerFormValidationError(e);
 *             return;
 *         }
 *         throw e;
 *     } finally {
 *         myState.submitting = false;
 *     }
 *     // Handle success (e.g., show a toast, redirect)
 *     // toast.add({
 *     //    severity: "success",
 *     //    summary: "Success",
 *     //    detail: "Form submitted successfully."
 *     // });
 * };
 *
 * const isActive = useIsActive();
 * watch(
 *     isActive,
 *     () => {
 *         // Fetch initial values based on your props or other logic
 *     },
 *     {
 *         immediate: true,
 *     },
 * );
 * < /script>
 *
 * <template>
 * <form @submit="handleSubmit">
 *     <!-- Renders a form with fields 'field1', 'field2', 'field3', 'field4', and 'field5' -->
 *     <form-model app="myapp" model="mymodel" :fields="['field1', 'field2', 'field3', 'field4', 'field5']">
 *         <!-- Replace the entire widget component for 'field1' -->
 *         <template #widget(field1)="slotProps">
 *             <my-custom-widget v-bind="slotProps.widgetProps" />
 *             <!-- the field slot continues to deal with form chores -->
 *         </template>
 *
 *         <!-- Provide content to the default slot of the existing widget component for 'field2' -->
 *         <template #widget(field2)default="slotProps">
 *             <div class="custom-content">
 *                 Custom content inside field2 widget.
 *             </div>
 *         </template>
 *
 *         <!-- Override the label for 'field3' -->
 *         <template #field(field3)label="{ label, required }">
 *             <span class="custom-label">{{ label }}</span>
 *         </template>
 *
 *         <!-- Replace the entire field component for 'field4' -->
 *         <template #field(field4)="slotProps">
 *             <field-custom v-bind="slotProps.fieldProps">
 *                 <template #default>
 *                     <widget-custom v-bind="slotProps.widgetProps" />
 *                 </template>
 *             </field-custom>
 *         </template>
 *
 *         <!-- Override the help text for 'field5' -->
 *         <template #field(field5)help="{ help }">
 *              <div class="custom-help">{{ help }}</div>
 *          </template>
 *
 *          <!-- Override error rendering for all fields -->
 *         <template #field-errors="{ errors }">
 *             <div class="custom-error">
 *                 <span v-for="msg in Object.values(errors)" :key="msg">{{ msg }}</span>
 *             </div>
 *         </template>
 *
 *          <!-- Override warning rendering for a specific field -->
 *         <template #field(field5)warnings="{ messages }">
 *             <div class="custom-warning">
 *                 <span v-for="msg in Object.values(messages)" :key="msg">{{ msg }}</span>
 *             </div>
 *         </template>
 *     </form-model>
 *     <!-- Your form controls -->
 *     <button type="submit">Submit</button>
 * </form>
 * </template>
 * ```
 * In the example above, slots are used to customize the form:
 * - `#widget(field1)`: Replaces the entire widget component for `field1` with `<my-custom-widget>`.
 * - `#widget(field2)default`: Provides content to the **default slot** of the existing widget component for `field2`.
 * - `#field(field3)label`: Overrides the label content for `field3`.
 * - `#field(field4)`: Replaces the entire field component for `field4` with `<my-custom-field>`.
 * - `#field(field5)help`: Overrides the help text for `field5`.
 * - `#field-errors`: Overrides error rendering for all fields (global fallback).
 * - `#field(field5)warnings`: Overrides warning rendering for `field5` only.
 *
 * **Understanding the difference between `widget(fieldName)` and `widget(fieldName)default`:**
 * - `widget(fieldName)`: Replaces the **entire widget component** for the specified field.
 * - `widget(fieldName)default`: Provides content to the **default slot** of the widget component, allowing you to inject custom content without replacing the whole component.
 * - Similarly, `widget(fieldName)slotName` provides content to a **named slot** `slotName` of the widget component for the specified field.
 *
 * **Note:** The same principles apply to `field(fieldName)` slots when customizing field components.
 * ```
 */

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name to render a form for. */
    model: {
        type: String,
        required: true,
    },
    /** View identifier used to select view-specific form configuration; uses the default configuration when omitted. */
    view: {
        type: String,
        default: undefined,
        description: "If set, use view specific configuration for the form, otherwise use the default configuration.",
    },
    /** Field names to render; overrides the configuration default for this view. */
    fields: {
        type: Array,
        default: undefined,
        description: "The fields to render in the form, if not wanting to use the configuration default for this view.",
    },
    /** Field names to render in expanded (inline) mode. */
    expand: {
        type: Array,
        default: undefined,
        description: "The fields to render in the form, expanded.",
    },
    /** Visual variant passed to the theme system to select an alternate form style. */
    variant: {
        type: String,
        default: "default",
    },
    /** Map of field paths to async functions returning an override field component. */
    fieldComponents: {
        type: Object,
        default: undefined,
        description: "A map of field paths to async fns returning field component, as overrides.",
    },
    /** Map of field paths to additional props passed to the field component. */
    fieldProps: {
        type: Object,
        default: undefined,
        description: "A map of field paths to props, as overrides.",
    },
    /** Map of field paths to field detail overrides merged with server configuration. */
    fieldDetails: {
        type: Object,
        default: undefined,
        description: "A map of field paths to field details, as overrides.",
    },
    /** Map of expand field paths to detail overrides. */
    expandDetails: {
        type: Object,
        default: undefined,
        description: "Any overriding expand information by field path.",
    },
    /** Map of field paths to async functions returning an override widget component. */
    widgetComponents: {
        type: Object,
        default: undefined,
        description: "A map of field paths to async fns returning widget component, as overrides.",
    },
    /** Map of field paths to additional props passed to the widget component. */
    widgetProps: {
        type: Object,
        default: undefined,
        description: "A map of field paths to props, as overrides.",
    },
    ...THEME_OVERRIDE_PROPS,
});
const theme = useTheme("FormModel", props);
const formModel = useFormModel(props);
const slots = useSlots();
const mySlotNames = ["before-fields", "after-fields", "form-level-chores", "default"];
const slotNames = computed(() => Object.keys(slots).filter((slotName) => !mySlotNames.includes(slotName)));
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="form-model">
        <template v-if="formModel.fields?.length">
            <div v-if="slots['before-fields']" :class="theme('beforeFields')">
                <slot :form-attrs="$attrs" :form-props="$props" name="before-fields" />
            </div>
            <!-- form-level chores -->
            <slot name="form-level-chores">
                <form-message type="error" />
                <form-message type="message" />
            </slot>
            <div v-bind="$attrs">
                <slot
                    :all-widget-props="formModel.widgetProps"
                    :field-components="formModel.fieldComponents"
                    :field-details="formModel.fieldDetails"
                    :field-names="formModel.baseFieldNames"
                    :field-props="formModel.fieldProps"
                    :form-attrs="$attrs"
                    :form-model="formModel"
                    :form-props="$props"
                    name="fields"
                    :theme="theme"
                    :widget-components="formModel.widgetComponents"
                >
                    <template v-for="fieldName in formModel.baseFieldNames" :key="fieldName">
                        <field-renderer
                            :field-props="fieldProps?.[fieldName]"
                            :form-model="formModel"
                            :form-model-name="fieldName"
                        >
                            <template v-for="slotName in slotNames" #[slotName]="slotProps">
                                <slot :name="slotName" v-bind="slotProps" />
                            </template>
                        </field-renderer>
                    </template>
                </slot>
            </div>
            <div v-if="slots['after-fields']" :class="theme('afterFields')">
                <slot :form-attrs="$attrs" :form-props="$props" name="after-fields" />
            </div>
        </template>
        <template v-else>
            <loading-spinner-block />
            Loading model information.
        </template>
    </div>
</template>

<style scoped></style>
