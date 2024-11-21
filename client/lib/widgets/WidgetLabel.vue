<script>
import { FORM_HIDDEN_FEEDBACK_PROPS, FORM_HIDDEN_FEEDBACK_SLOTS } from "@vueda/components/FormHiddenFeedback.vue";
import { computed } from "vue";

export const WIDGET_LABEL_SLOTS = ["label", "feedback", ...FORM_HIDDEN_FEEDBACK_SLOTS];
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
    id: {
        type: String,
        default: undefined,
    },
};
</script>
<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FormHiddenFeedback from "@vueda/components/FormHiddenFeedback.vue";
import { getFormHiddenFeedbackSlotsComputed } from "@vueda/components/FormHiddenFeedback.vue";
import { useTheme } from "@vueda/use/useTheme.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { WidgetContextSymbol } from "@vueda/utils/symbols.js";
import pick from "lodash-es/pick.js";
import { inject, unref, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_LABEL_PROPS,
    ...THEME_OVERRIDE_PROPS,
});

/** @type {import('@vueda/use/useWidget.js').WidgetContext} */
const widgetContext = inject(WidgetContextSymbol);
// traditional id points to input
const computedFor = computed(() => (props.id ? props.id : widgetContext.state.widgetId));
// aria-labelledby points to label
const computedId = computed(() => (!props.id ? widgetContext?.state?.widgetId : undefined));
const combinedLabel = computed(() => props.label ?? widgetContext?.state?.combinedLabel);
const themeProps = computed(() => ({
    props,
    ...(widgetContext?.state || {}),
}));
const theme = useTheme("WidgetLabel", props, themeProps);
const slots = useSlots();
const availableFeedbackSlotNames = getFormHiddenFeedbackSlotsComputed(slots);
const effectiveHidden = computed(() => props.hidden ?? widgetContext?.state?.hidden ?? false);
const labelClass = computed(() => combineClasses(theme("label"), { "sr-only": unref(effectiveHidden) }));
</script>
<template>
    <div :class="theme('root')" data-qa="widget-label-root">
        <label :id="computedId" :class="labelClass" data-qa="widget-label-label" :for="computedFor" v-bind="$attrs">
            <slot :id="computedId" :for="computedFor" :label="combinedLabel" name="label">{{ combinedLabel }}</slot>
        </label>
        <slot v-if="!effectiveHidden" name="feedback">
            <form-hidden-feedback v-bind="pick(props, Object.keys(FORM_HIDDEN_FEEDBACK_PROPS))">
                <template v-for="slotName in availableFeedbackSlotNames" :key="slotName" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
            </form-hidden-feedback>
        </slot>
    </div>
    <slot></slot>
    <slot v-if="effectiveHidden" name="feedback">
        <form-hidden-feedback v-bind="pick(props, Object.keys(FORM_HIDDEN_FEEDBACK_PROPS))">
            <template v-for="slotName in availableFeedbackSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
        </form-hidden-feedback>
    </slot>
</template>
