<script setup>
/**
 * This component is a form model that renders fields based on the configuration for the model.
 *
 * @name FormModel
 * @example
 * ```vue
 * <script setup>
 * import FormChores from "@vueda/components/FormChores.vue";
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
 *         <!-- Provide content to a named slot 'label' of the widget component for 'field3' -->
 *         <template #widget(field3)label="slotProps">
 *             <span class="custom-label">Custom Label for Field3</span>
 *         </template>
 *
 *         <!-- Replace the entire field component for 'field4' -->
 *         <template #field(field4)="slotProps">
 *             <field-custom v-bind="slotProps.fieldProps">
 *                 <template #default>
 *                     <!-- Optionally customize the widget inside your custom field -->
 *                     <widget-custom v-bind="slotProps.widgetProps" />
 *                     <!-- Overriding field this leaves you responsible for form-chores -->
 *                     <form-chores />
 *                 </template>
 *             </field-custom>
 *         </template>
 *
 *         <!-- Replace the help slot for 'field5' -->
 *         <!-- see form-chores for slot props details -->
 *         <template #field(field5)help="slotProps">
 *              <div class="custom-help">
 *                  <my-custom-help-message v-bind="slotProps" />
 *              </div>
 *          </template>
 *
 *          <!-- Replace all error/message slots -->
 *          <!-- see form-chores for slot props details -->
 *         <template #field-error="slotProps">
 *             <div class="custom-error">
 *                 <my-custom-error-message v-bind="slotProps" />
 *             </div>
 *         </template>
 *         <template #field-message="slotProps">
 *             <div class="custom-message">
 *                 <my-custom-message v-bind="slotProps" />
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
 * - `#widget(field3)label`: Provides content to the **named slot** `label` of the widget component for `field3`.
 * - `#field(field4)`: Replaces the entire field component for `field4` with `<my-custom-field>`.
 *
 * **Understanding the difference between `widget(fieldName)` and `widget(fieldName)default`:**
 * - `widget(fieldName)`: Replaces the **entire widget component** for the specified field.
 * - `widget(fieldName)default`: Provides content to the **default slot** of the widget component, allowing you to inject custom content without replacing the whole component.
 * - Similarly, `widget(fieldName)slotName` provides content to a **named slot** `slotName` of the widget component for the specified field.
 *
 * **Note:** The same principles apply to `field(fieldName)` slots when customizing field components.
 * ```
 */
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import FormChores from "@vueda/components/FormChores.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, useSlots } from "vue";

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
    ...THEME_OVERRIDE_PROPS,
});
const formModel = useFormModel("FormModel", props);
const formContext = inject(FormContextSymbol);
const slots = useSlots();
const mySlotNames = ["before-fields", "after-fields", "form-level-chores", "default"];
const slotNames = computed(() => Object.keys(slots).filter((slotName) => !mySlotNames.includes(slotName)));
</script>

<template>
    <div :class="formModel.theme('root')" data-qa="form-model">
        <template v-if="formModel.fields?.length">
            <div v-if="$slots['before-fields']" :class="formModel.theme('beforeFields')">
                <slot :form-attrs="$attrs" :form-props="$props" name="before-fields" />
            </div>
            <!-- form-level chores -->
            <slot name="form-level-chores" :theme-override="themeOverride">
                <form-chores :theme-override="themeOverride" :variant="null" />
            </slot>
            <div v-bind="$attrs">
                <slot
                    :all-widget-props="formModel.widgetProps"
                    :field-components="formModel.fieldComponents"
                    :field-details="formModel.fieldDetails"
                    :field-props="formModel.fieldProps"
                    :form-attrs="$attrs"
                    :form-props="$props"
                    name="fields"
                    :theme="formModel.theme"
                    :theme-override="themeOverride"
                    :widget-components="formModel.widgetComponents"
                >
                    <template v-for="fieldName in formModel.baseFieldNames" :key="fieldName">
                        <field-renderer
                            :form-model-name="fieldName"
                            :field-props="fieldProps?.[fieldName]"
                            :form-model="formModel"
                        >
                            <template v-for="slotName in slotNames" #[slotName]="slotProps">
                                <slot :name="slotName" v-bind="slotProps" />
                            </template>
                        </field-renderer>
                    </template>
                </slot>
            </div>
            <div v-if="$slots['after-fields']" :class="formModel.theme('afterFields')">
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
