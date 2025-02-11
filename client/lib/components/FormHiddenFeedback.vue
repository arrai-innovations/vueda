<script>
import { computed } from "vue";

export const FORM_HIDDEN_FEEDBACK_PROPS = {
    required: {
        type: Boolean,
        default: undefined,
    },
    help: {
        type: String,
        default: undefined,
    },
    errors: {
        type: Object,
        default: null,
        description: "Errors to display, keyed by code.",
    },
    warnings: {
        type: Object,
        default: null,
        description: "Warnings to display, keyed by code.",
    },
    invalid: {
        type: Boolean,
        description: "Manually set the invalid state, defaults to if there are errors.",
        default: undefined,
    },
    warning: {
        type: Boolean,
        description: "Manually set the warning state, defaults to if there are warnings.",
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
export const FORM_HIDDEN_FEEDBACK_SLOTS = [
    "feedback-required-icon",
    "feedback-help-icon",
    "feedback-error-icon",
    "feedback-warning-icon",
    "feedback-button",
    "feedback",
];
export const getFormHiddenFeedbackSlotsComputed = (slots) => {
    return computed(() => {
        return FORM_HIDDEN_FEEDBACK_SLOTS.filter((slotName) => slots[slotName]);
    });
};
</script>
<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import Popover from "primevue/popover";
import { inject, onMounted, ref, unref, useAttrs } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FORM_HIDDEN_FEEDBACK_PROPS,
    name: {
        type: String,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = inject(WidgetContextSymbol, null);
onMounted(() => {
    if (!fieldContext && !props.name && (!props.errors || !props.warnings)) {
        console.warn(
            "FormHiddenFeedback.vue must be used within a field context, a field name must be provided, or [help]/errors/warnings must be provided.",
        );
    }
    if (!widgetContext && !props.name && (!props.errors || !props.warnings)) {
        console.warn(
            "FormHiddenFeedback.vue must be used within a widget context, a field name must be provided, or [help]/errors/warnings must be provided.",
        );
    }
});
const useFieldContext = computed(() => {
    return fieldContext && props.name && fieldContext.state.name === props.name;
});
const useWidgetContext = computed(() => {
    return widgetContext && props.name && widgetContext.state.name === props.name;
});
const effectiveRequired = computed(() => props.required ?? fieldContext?.state?.required);
const effectiveHelp = computed(() => (props.help?.length ? props.help : fieldContext?.state?.help));
const effectiveErrors = computed(() => ({
    ...(useFieldContext.value ? fieldContext?.state?.errors : {}),
    ...(props.errors || {}),
}));
const effectiveWarnings = computed(() => ({
    ...(useFieldContext.value ? fieldContext?.state?.warnings : {}),
    ...(props.warnings || {}),
}));
const showHelpIcon = computed(() => unref(effectiveHelp).length > 0);
const showErrorIcon = computed(
    () => props.invalid ?? (useWidgetContext.value ? widgetContext?.state?.validationState?.invalid : false),
);
const showWarnIcon = computed(
    () => props.warning ?? (useWidgetContext.value ? widgetContext?.state?.validationState?.warning : false),
);
const hasErrors = computed(() => Object.keys(unref(effectiveErrors)).length > 0);
const hasWarnings = computed(() => Object.keys(unref(effectiveWarnings)).length > 0);
const attrs = useAttrs();
// const theme = useTheme("FormHiddenFeedback", props);
const theme = useWidgetTheme("FormHiddenFeedback", props, widgetContext?.state);
const thePopover = ref(null);
const togglePopover = (e) => {
    const popover = unref(thePopover);
    if (popover) {
        popover.toggle(e);
    }
};
</script>

<template>
    <popover ref="thePopover">
        <div :class="theme('popoverBody')">
            <form-feedback
                v-if="hasErrors"
                :class="theme('popoverItem')"
                :messages="effectiveErrors"
                type="error"
                v-bind="attrs"
            >
                <template #icon="slotProps">
                    <slot name="feedback-error-icon" v-bind="slotProps">
                        <span :class="[theme('icon'), slotProps.class]">☠️</span>
                    </slot>
                </template>
            </form-feedback>
            <form-feedback
                v-if="hasWarnings"
                :class="theme('popoverItem')"
                :messages="effectiveWarnings"
                type="message"
                v-bind="attrs"
            >
                <template #icon="slotProps">
                    <slot name="feedback-warning-icon" v-bind="slotProps">
                        <span :class="[theme('icon'), slotProps.class]">⚠️</span>
                    </slot>
                </template>
            </form-feedback>
            <form-help-text
                v-if="effectiveRequired"
                :class="theme('popoverItem')"
                help="This field is required."
                severity="error"
                v-bind="attrs"
            >
                <template #icon="slotProps">
                    <slot name="feedback-required-icon" v-bind="slotProps">
                        <span :class="[theme('icon'), slotProps.class]">*️⃣</span>
                    </slot>
                </template>
            </form-help-text>
            <form-help-text v-if="showHelpIcon" :class="theme('popoverItem')" :help="effectiveHelp" v-bind="attrs">
                <template #icon="slotProps">
                    <slot name="feedback-help-icon" v-bind="slotProps">
                        <span :class="[theme('icon'), slotProps.class]">ℹ️</span>
                    </slot>
                </template>
            </form-help-text>
        </div>
    </popover>

    <slot
        :button-class="theme('button')"
        :class="combineClasses(theme('root'), $attrs.class)"
        :has-errors="hasErrors"
        :has-help="showHelpIcon"
        :has-warnings="hasWarnings"
        name="feedback-button"
        :required="effectiveRequired"
        v-bind="omit($attrs, ['class'])"
        @click="togglePopover"
    >
        <div
            v-if="effectiveRequired || showHelpIcon || showErrorIcon || showWarnIcon"
            :class="combineClasses(theme('root'), $attrs.class)"
            v-bind="attrs"
            data-qa="form-hidden-feedback-root"
        >
            <Button
                :class="theme('button')"
                :rounded="true"
                :severity="hasErrors ? 'danger' : hasWarnings ? 'warn' : 'help'"
                size="small"
                variant="outlined"
                @click="togglePopover"
            >
                <span v-if="effectiveRequired" :class="[theme('icon'), theme('required')]">*️⃣</span>
                <span v-if="showErrorIcon" :class="[theme('icon'), theme('errors')]">☠️</span>
                <span v-if="showWarnIcon" :class="[theme('icon'), theme('warnings')]">⚠️</span>
                <span v-if="showHelpIcon" :class="[theme('icon'), theme('help')]">ℹ️</span>
            </Button>
        </div>
    </slot>
</template>

<style scoped></style>
