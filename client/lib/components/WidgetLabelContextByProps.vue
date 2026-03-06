<script setup>
import { useFieldSetTabularHeaderProps } from "@vueda/use/useFieldSetTabularHeaderProps.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FormContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import { WIDGET_LABEL_PROPS } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import { computed, inject, provide, reactive, toRef, toRefs, useAttrs } from "vue";

/**
 * Wraps WidgetLabel with widget context derived from explicit props rather than
 * from a surrounding form context. Used inside tabular inline field sets where
 * each cell must resolve its label, help text, and validation state from the
 * field value path rather than from injected context.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    /** Tabular inline field set configuration, used to resolve label and validation state per row. */
    fieldSetTabularInline: {
        type: Object,
        default: () => ({}),
    },
    /** Dot-separated path to the field value within the form model, used as the widget name. */
    fieldValuePath: {
        type: String,
        required: true,
    },
});

const emit = defineEmits([...WIDGET_EMITS]);
const attrs = useAttrs();
const formContext = inject(FormContextSymbol);
const fieldSetTabularHeaderProps = useFieldSetTabularHeaderProps(
    props.fieldSetTabularInline.formModel,
    formContext,
    computed(() => attrs.field.name),
    toRef(props, "fieldValuePath"),
);
const widgetProps = reactive({
    ...pick(toRefs(props), Object.keys(WIDGET_PROPS)),
    label: fieldSetTabularHeaderProps.label,
    help: fieldSetTabularHeaderProps.help,
    required: fieldSetTabularHeaderProps.required,
    invalid: fieldSetTabularHeaderProps.invalid,
    readOnly: fieldSetTabularHeaderProps.readOnly,
    contextless: true,
    name: toRef(props, "fieldValuePath"),
});
const widgetContext = useWidget(widgetProps, emit);
provide(WidgetContextSymbol, widgetContext);
const propsToPass = {
    ...pick(props, Object.keys(WIDGET_LABEL_PROPS)),
    skipFeedback: true,
};
</script>

<template>
    <widget-label v-bind="propsToPass">
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </widget-label>
</template>
