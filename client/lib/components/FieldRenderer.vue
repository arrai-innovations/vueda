<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import LazyRender from "@vueda/components/LazyRender.vue";
import { useFieldRenderer } from "@vueda/use/useFieldRenderer.js";
import { mergeTheme, useTheme } from "@vueda/use/useTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import Skeleton from "primevue/skeleton";
import { computed, inject, reactive, toRef, unref, useAttrs, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
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
    /** @type {import("@vueda/use/useFormModel.js").UseFormModelState} */
    formModel: {
        type: Object,
        required: true,
    },
    hidden: {
        type: Boolean,
        default: undefined,
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
} = useFieldRenderer(props, attrs, slots, fieldSetContext);
const themeProps = reactive({
    themeOverride: computed(() => mergeTheme(props.formModel.theme, props.themeOverride)),
});
const themeContext = reactive({
    formModelName: toRef(props, "formModelName"),
    fieldDetail: fieldDetail,
    fieldProps: fieldProps,
    widgetProps: widgetProps,
    inFieldSet: computed(() => !!fieldSetContext),
});
const theme = useTheme("FormModel", themeProps, themeContext);
const fieldClass = computed(() => combineClasses(unref(theme("field")), unref(fieldProps)?.class, attrs.class));
const fieldInnerClass = theme("fieldInner");
</script>

<template>
    <lazy-render>
        <template #default>
            <slot
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
                <component
                    :is="fieldComponent"
                    v-if="fieldComponent"
                    :class="fieldClass"
                    v-bind="omit(fieldProps, ['class'])"
                >
                    <template v-for="slotName in remainingSlots" #[slotName]="fieldSlotProps">
                        <slot :name="slotName" v-bind="fieldSlotProps || {}" />
                    </template>
                    <template #default>
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
                            <a :name="fieldValuePath" />
                            <div :class="fieldInnerClass" data-qa="field-renderer-field-inner">
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
        <template #placeholder>
            <div :class="fieldClass">
                <Skeleton width="100%" height="2rem" class="mb-2" />
            </div>
        </template>
    </lazy-render>
</template>
