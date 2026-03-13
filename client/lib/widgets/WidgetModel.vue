<script setup>
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { WIDGET_EMITS, useWidget } from "@vueda/use/useWidget.js";
import WidgetMultiSelect from "@vueda/widgets/WidgetMultiSelect.vue";
import WidgetRadio from "@vueda/widgets/WidgetRadio.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import omit from "lodash-es/omit.js";
import { computed, ref, toRef } from "vue";

/**
 * Renders a select, multi-select, or radio widget populated with choices fetched from a Django model.
 * Choices are loaded lazily: the API request is deferred until the field is focused or already has a value.
 * Pass the `type` prop to choose between `select`, `multiSelect`, and `radio` presentations.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** Django app label for the model whose choices this widget loads. */
    fieldApp: {
        type: String,
        required: true,
    },
    /** Django model name used to resolve the choices endpoint. */
    fieldModel: {
        type: String,
        required: true,
    },
    /** Field name on the model whose choices are fetched. */
    fieldName: {
        type: String,
        required: true,
    },
    /** Widget presentation variant: `"select"`, `"multiSelect"`, or `"radio"`. */
    type: {
        type: String,
        required: true,
    },
    /** The currently selected value, bound with `v-model`. */
    modelValue: {
        type: [String, Number, Array],
        default: undefined,
    },
    /** When true, fetches choices in filter mode (may relax required-field constraints). */
    isFilter: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const isActive = useIsActive();
const hasBeenFocused = ref(false);
const intendToFetch = computed(() => {
    return widgetContext.state.combinedValue || hasBeenFocused.value;
});

const modelChoices = useModelChoices(
    {
        [props.fieldName]: {
            app: toRef(props, "fieldApp"),
            model: toRef(props, "fieldModel"),
            intendToFetch,
            isFilter: toRef(props, "isFilter"),
        },
    },
    isActive,
);
const widgetComponents = {
    select: WidgetSelect,
    multiSelect: WidgetMultiSelect,
    radio: WidgetRadio,
};
const onFocus = () => {
    hasBeenFocused.value = true;
};
const widgetComponent = computed(() => widgetComponents[props.type]);
</script>
<template>
    <component
        :is="widgetComponent"
        :loading="modelChoices.loading"
        :model-value="modelValue"
        :on-focus="onFocus"
        option-label="label"
        option-value="value"
        :options="modelChoices.choices?.[props.fieldName]?.results || []"
        v-bind="omit($attrs, 'value')"
        :aria-required="widgetContext.state.required"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </component>
</template>
