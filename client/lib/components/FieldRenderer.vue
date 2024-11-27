<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { mergeTheme, useTheme } from "@vueda/use/useTheme.js";
import { availableWidgets } from "@vueda/utils/formLookups.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { computed, inject, reactive, unref, useAttrs, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    objectGridFieldSlotProps: {
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
    /** @type {import("@vueda/use/useFormModel.js").UseFormModelState} */
    formModel: {
        type: Object,
        required: true,
    },
});

const attrs = useAttrs();
/**
 *  If we are in a fieldset, this will be the fieldset context.
 *  @type {import('@vueda/use/useField.js').FieldContext|null}
 */
const fieldSetContext = inject(FieldContextSymbol, null);
const slots = useSlots();
const relativeFieldName = computed(() =>
    !fieldSetContext ? props.formModelName : props.formModelName.replace(`${fieldSetContext.state.name}__`, ""),
);
const fieldValuePath = computed(() =>
    !fieldSetContext
        ? props.formModelName
        : `${fieldSetContext.state.name}[${props.objectGridFieldSlotProps.rowIndex}].${unref(relativeFieldName)}`,
);
const slotProps = reactive({
    fieldComponent: computed(() => props.formModel.fieldComponents[props.formModelName]),
    fieldDetail: computed(() => props.formModel.fieldDetails[props.formModelName]),
    fieldProps: computed(() => ({
        ...omit(props.objectGridFieldSlotProps, ["value"]),
        ...omit(props.formModel.fieldProps[props.formModelName], ["themeOverride"]),
        ...omit(attrs, ["class"]),
        name: unref(fieldValuePath),
        formModelName: props.formModelName,
        modelValue: props.objectGridFieldSlotProps?.value,
        themeOverride: mergeTheme(props.formModel.fieldProps[props.formModelName].themeOverride, props.themeOverride),
    })),
    widgetComponent: computed(
        () => props.formModel.widgetComponents[props.formModelName] ?? availableWidgets.WidgetUnmapped,
    ),
    widgetProps: computed(() => ({
        ...props.objectGridFieldSlotProps,
        ...omit(props.formModel.widgetProps[props.formModelName], ["themeOverride"]),
        ...omit(attrs, ["class"]),
        hidden: !!fieldSetContext,
        themeOverride: mergeTheme(
            props.formModel.fieldProps[props.formModelName].themeOverride,
            props.formModel.widgetProps[props.formModelName].themeOverride,
            props.themeOverride,
        ),
    })),
});
const theme = useTheme(
    "FormModel",
    reactive({
        themeOverride: computed(() => mergeTheme(props.formModel.theme, props.themeOverride)),
    }),
);
slotProps.fieldClass = computed(() => combineClasses(unref(theme("field")), slotProps.fieldProps?.class, attrs.class));
slotProps.fieldInnerClass = theme("fieldInner");
const fieldSlotName = computed(() => `field(${props.formModelName})`);
const fieldDefaultSlotName = computed(() => `${unref(fieldSlotName)}default`);
const widgetSlotName = computed(() => `widget(${props.formModelName})`);
const widgetDefaultSlotName = computed(() => `${unref(widgetSlotName)}default`);
const knownSlots = computed(() => [
    unref(fieldSlotName),
    unref(fieldDefaultSlotName),
    unref(widgetSlotName),
    unref(widgetDefaultSlotName),
    "default",
]);
const remainingSlots = computed(() => Object.keys(slots).filter((slotName) => !unref(knownSlots).includes(slotName)));
</script>

<template>
    <slot :name="fieldSlotName" v-bind="slotProps">
        <component
            :is="slotProps.fieldComponent"
            v-if="slotProps.fieldComponent"
            :class="slotProps.fieldClass"
            v-bind="omit(slotProps.fieldProps, ['class'])"
        >
            <template v-for="slotName in remainingSlots" #[slotName]="fieldSlotProps">
                <slot :name="slotName" v-bind="fieldSlotProps || {}" />
            </template>
            <template #default>
                <slot :name="fieldDefaultSlotName" v-bind="slotProps">
                    <div :class="slotProps.fieldInnerClass" data-qa="field-renderer-field-inner">
                        <slot :name="widgetSlotName" v-bind="slotProps">
                            <component :is="slotProps.widgetComponent" v-bind="slotProps.widgetProps">
                                <template v-for="slotName in remainingSlots" #[slotName]="widgetSlotProps">
                                    <slot :name="slotName" v-bind="widgetSlotProps || {}" />
                                </template>
                                <template v-if="$slots[widgetDefaultSlotName]" #default="widgetSlotProps">
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
