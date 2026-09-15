<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import "@vueda/theme/vueda-tailwind/form/FormModel.theme.js";
import { useFieldRenderer } from "@vueda/use/useFieldRenderer.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { computed, inject, reactive, toRef, unref, useAttrs, useSlots } from "vue";

/**
 * Resolves and renders a single form field and its widget for a given
 * `formModelName` key. It reads the field and widget components, props, and
 * slot configuration from a `formModel` context object, then composes them
 * into the correct layout with override slots passed through from the parent.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    objectGridFieldSlotProps: {
        type: Object,
        default: () => ({}),
    },
    fieldsetStackedInlineProps: {
        type: Object,
        default: () => ({}),
    },
    formModelName: {
        type: String,
        required: true,
        description: "The key that configuration for the field is stored under in the FormModel",
    },
    fieldProps: {
        type: Object,
        description: "Additional props to merge with formModel.fieldProps[formModelName]",
        default: () => ({}),
    },
    widgetProps: {
        type: Object,
        description: "Additional props to merge with formModel.widgetProps[formModelName]",
        default: () => ({}),
    },
    /** @type {import("@vueda/use/useFormModel.js").UseFormModelState} */
    formModel: {
        type: Object,
        required: true,
    },
    hidden: {
        type: Boolean,
        default: undefined,
    },
    isFilter: {
        type: Boolean,
        default: false,
    },
});

const attrs = useAttrs();
/**
 *  If we are in a fieldset, this will be the fieldset context.
 *  @type {import('@vueda/use/useField.js').FieldContext|null}
 */
const fieldSetContext = inject(FieldContextSymbol, null);
const slots = useSlots();
const {
    fieldComponent,
    widgetComponent,
    fieldSlotName,
    widgetSlotName,
    fieldProps,
    widgetProps,
    fieldDetail,
    slotsForPassing,
    fieldValuePath,
    fieldDefaultSlotName,
    widgetDefaultSlotName,
    remainingSlots,
    error,
    errored,
    renderFailureText,
} = useFieldRenderer(props, attrs, slots, fieldSetContext);

const themeContext = reactive({
    formModelName: toRef(props, "formModelName"),
    fieldDetail,
    fieldProps,
    widgetProps,
    inFieldSet: computed(() => !!fieldSetContext),
});
const theme = useTheme("FormModel", props, themeContext);
const fieldClass = computed(() => combineClasses(unref(theme("field")), unref(fieldProps)?.class, attrs.class));
const fieldInnerClass = theme("fieldInner");
</script>

<template>
    <!-- TODO: theme.hideStyle requires a single themed root; this component is a renderless <slot> pass-through with no root element to style. -->
    <!-- @slot [field(fieldName)] Override the entire rendered output for a specific field; receives all field and widget context as bindings. -->
    <!-- A field that cannot render reports itself and leaves the rest of the form alone. -->
    <ErrorDisplay
        v-if="errored"
        :class="fieldClass"
        :error="error"
        :errored="errored"
        :while-text="renderFailureText"
        data-qa="field-renderer-error"
    />
    <slot
        v-else
        :field-class="fieldClass"
        :field-component="fieldComponent"
        :field-detail="fieldDetail"
        :field-inner-class="fieldInnerClass"
        :field-props="fieldProps"
        :form-model-name="props.formModelName"
        :name="fieldSlotName"
        :slots="slotsForPassing"
        :widget-component="widgetComponent"
        :widget-props="widgetProps"
    >
        <component :is="fieldComponent" v-if="fieldComponent" :class="fieldClass" v-bind="omit(fieldProps, ['class'])">
            <template v-for="slotName in remainingSlots" #[slotName]="fieldSlotProps">
                <slot :name="slotName" v-bind="fieldSlotProps || {}" />
            </template>
            <template #default>
                <!-- @slot [field(fieldName)default] Override the default field body (anchor link + widget wrapper) for a specific field. -->
                <slot
                    :field-class="fieldClass"
                    :field-component="fieldComponent"
                    :field-detail="fieldDetail"
                    :field-inner-class="fieldInnerClass"
                    :field-props="fieldProps"
                    :form-model-name="props.formModelName"
                    :name="fieldDefaultSlotName"
                    :slots="slotsForPassing"
                    :widget-component="widgetComponent"
                    :widget-props="widgetProps"
                >
                    <!-- Scroll target for the first-error jump. Positioned so it stays a
                         box scrollIntoView can reach without taking a field-content gap. -->
                    <a :name="fieldValuePath" class="absolute" />
                    <div :class="fieldInnerClass" data-qa="field-renderer-field-inner">
                        <!-- @slot [widget(fieldName)] Override the entire widget area for a specific field. -->
                        <slot
                            :field-class="fieldClass"
                            :field-component="fieldComponent"
                            :field-detail="fieldDetail"
                            :field-inner-class="fieldInnerClass"
                            :field-props="fieldProps"
                            :form-model-name="props.formModelName"
                            :name="widgetSlotName"
                            :slots="slotsForPassing"
                            :widget-component="widgetComponent"
                            :widget-props="widgetProps"
                        >
                            <component :is="widgetComponent" v-bind="widgetProps">
                                <template v-for="slotName in remainingSlots" #[slotName]="widgetSlotProps">
                                    <slot :name="slotName" v-bind="widgetSlotProps || {}" />
                                </template>
                                <template v-if="$slots[widgetDefaultSlotName]" #default="widgetSlotProps">
                                    <!-- @slot [widget(fieldName)default] Override the widget's default slot content for a specific field. -->
                                    <slot :name="widgetDefaultSlotName" v-bind="widgetSlotProps" />
                                </template>
                            </component>
                        </slot>
                    </div>
                </slot>
            </template>
        </component>
    </slot>
</template>
