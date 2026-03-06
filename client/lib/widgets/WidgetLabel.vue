<script>
import { FORM_HIDDEN_FEEDBACK_PROPS, FORM_HIDDEN_FEEDBACK_SLOTS } from "@vueda/components/FormHiddenFeedback.vue";
import { computed } from "vue";

/** Array of slot names used exclusively by WidgetLabel itself, not including slots delegated to FormHiddenFeedback. */
export const ONLY_WIDGET_LABEL_SLOTS = ["label", "feedback"];
/** Array of all slot names supported by WidgetLabel components, combining the label-specific slots with the feedback slots from FormHiddenFeedback. */
export const WIDGET_LABEL_SLOTS = [...ONLY_WIDGET_LABEL_SLOTS, ...FORM_HIDDEN_FEEDBACK_SLOTS];
export const getWidgetSlotsComputed = (slots) => {
    return computed(() => {
        return WIDGET_LABEL_SLOTS.filter((slotName) => slots[slotName]);
    });
};
/**
 * Vue component props definition for WidgetLabel components. Extends FormHiddenFeedback props with
 * label, hidden, card layout, label tag, required tag, and skip-feedback props.
 *
 * @vueda-spread props
 */
export const WIDGET_LABEL_PROPS = {
    ...FORM_HIDDEN_FEEDBACK_PROPS,
    /** The label text; falls back to the label from the surrounding widget context when omitted. */
    label: {
        type: String,
        description: "The label when not in context of a widget",
        default: undefined,
    },
    /** When true, hides the label and feedback widget. */
    hidden: {
        type: Boolean,
        default: false,
    },
    /** When true, applies card layout styling to the label and feedback area. */
    isCardLayout: {
        type: Boolean,
        default: false,
    },
    /** HTML tag used to render the label element. */
    labelTag: {
        type: String,
        default: "label",
    },
    /** HTML tag used to render the required indicator. */
    requiredTag: {
        type: String,
        default: "span",
    },
    /** When true, omits the hidden feedback indicator button from the label. */
    skipFeedback: {
        type: Boolean,
        default: false,
    },
};
</script>
<script setup>
/**
 * A layout wrapper that renders a label element, the slotted control, and an optional hidden
 * feedback indicator below it. Used internally by all widget components to provide consistent
 * label, required-marker, and validation feedback rendering.
 */
import FormHiddenFeedback from "@vueda/components/FormHiddenFeedback.vue";
import { getFormHiddenFeedbackSlotsComputed } from "@vueda/components/FormHiddenFeedback.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { WidgetContextSymbol } from "@vueda/utils/symbols.js";
import pick from "lodash-es/pick.js";
import { inject, toRef, useSlots } from "vue";

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_LABEL_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** The `id` attribute applied to the label element. */
    id: {
        type: String,
        default: undefined,
    },
    /** The `for` attribute linking the label to its associated input by ID. */
    for: {
        type: String,
        default: undefined,
    },
});

/** @type {import('@vueda/use/useWidget.js').WidgetContext} */
const widgetContext = inject(WidgetContextSymbol);
const combinedLabel = computed(() => props.label ?? widgetContext?.state?.combinedLabel);
const theme = useWidgetTheme("WidgetLabel", props, widgetContext.state, {
    hidden: toRef(props, "hidden"),
    isCardLayout: toRef(props, "isCardLayout"),
    valid: toRef(widgetContext.state.validationState, "valid"),
    required: widgetContext.state.required,
    help: computed(() => props.help ?? widgetContext.state.help),
});
const slots = useSlots();
const availableFeedbackSlotNames = getFormHiddenFeedbackSlotsComputed(slots);
</script>
<template>
    <div :class="theme('root')" data-qa="widget-label-root">
        <component :is="labelTag" :id="id" :class="theme('label')" v-bind="$attrs" :for="$props.for">
            <component
                :is="requiredTag"
                v-if="widgetContext.state.required && !hidden && !widgetContext.state.readOnly"
                :class="theme('required')"
                aria-hidden="true"
                title="Required"
            >
                <slot :class="theme('required')" name="required" aria-hidden="true" title="Required"> * </slot>
            </component>
            <slot
                :id="id"
                :class="theme('label')"
                :for="$props.for"
                v-bind="$attrs"
                :label="combinedLabel"
                name="label"
            >
                {{ combinedLabel }}
            </slot>
        </component>
        <slot :class="theme('control')"></slot>
        <slot
            v-if="!skipFeedback"
            :class="theme('feedback')"
            name="feedback"
            v-bind="pick($props, Object.keys(FORM_HIDDEN_FEEDBACK_PROPS))"
        >
            <form-hidden-feedback
                :class="theme('feedback')"
                v-bind="pick($props, Object.keys(FORM_HIDDEN_FEEDBACK_PROPS))"
            >
                <template v-for="slotName in availableFeedbackSlotNames" :key="slotName" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
            </form-hidden-feedback>
        </slot>
    </div>
</template>
