<script>
import { FORM_HIDDEN_FEEDBACK_PROPS, FORM_HIDDEN_FEEDBACK_SLOTS } from "@vueda/components/FormHiddenFeedback.vue";
import { computed } from "vue";

export const ONLY_WIDGET_LABEL_SLOTS = ["label", "feedback"];
export const WIDGET_LABEL_SLOTS = [...ONLY_WIDGET_LABEL_SLOTS, ...FORM_HIDDEN_FEEDBACK_SLOTS];
export const getWidgetSlotsComputed = (slots) => {
    return computed(() => {
        return WIDGET_LABEL_SLOTS.filter((slotName) => slots[slotName]);
    });
};
export const WIDGET_LABEL_PROPS = {
    ...FORM_HIDDEN_FEEDBACK_PROPS,
    label: {
        type: String,
        description: "The label when not in context of a widget",
        default: undefined,
    },
    hidden: {
        type: Boolean,
        default: false,
    },
    isCardLayout: {
        type: Boolean,
        default: false,
    },
};
</script>
<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FormHiddenFeedback from "@vueda/components/FormHiddenFeedback.vue";
import { getFormHiddenFeedbackSlotsComputed } from "@vueda/components/FormHiddenFeedback.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { WidgetContextSymbol } from "@vueda/utils/symbols.js";
import pick from "lodash-es/pick.js";
import { inject, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_LABEL_PROPS,
    ...THEME_OVERRIDE_PROPS,
    id: {
        type: String,
        default: undefined,
    },
    for: {
        type: String,
        default: undefined,
    },
    tag: {
        type: String,
        default: "label",
    },
});

/** @type {import('@vueda/use/useWidget.js').WidgetContext} */
const widgetContext = inject(WidgetContextSymbol);
const combinedLabel = computed(() => props.label ?? widgetContext?.state?.combinedLabel);
const theme = useWidgetTheme("WidgetLabel", props, widgetContext.state);
const slots = useSlots();
const availableFeedbackSlotNames = getFormHiddenFeedbackSlotsComputed(slots);
const labelClass = computed(() => combineClasses(theme("label"), { "sr-only": props.hidden }));
</script>
<template>
    <div :class="theme('root')" data-qa="widget-label-root">
        <component
            :is="$props.tag"
            :id="id"
            :class="labelClass"
            v-bind="$attrs"
            data-qa="widget-label-label"
            :for="$props.for"
        >
            <slot :id="id" :class="labelClass" :for="$props.for" v-bind="$attrs" :label="combinedLabel" name="label">{{
                combinedLabel
            }}</slot>
        </component>
        <slot :class="theme('feedback')" name="feedback" v-bind="pick(props, Object.keys(FORM_HIDDEN_FEEDBACK_PROPS))">
            <form-hidden-feedback
                :class="theme('feedback')"
                v-bind="pick(props, Object.keys(FORM_HIDDEN_FEEDBACK_PROPS))"
            >
                <template v-for="slotName in availableFeedbackSlotNames" :key="slotName" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
            </form-hidden-feedback>
        </slot>
        <slot :class="theme('control')"></slot>
    </div>
</template>
