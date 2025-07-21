<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { useSlotNameGrouper } from "@vueda/use/useSlotNameGrouper.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { resolveSlotName } from "@vueda/utils/rendererSupport.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import { computed, inject, onMounted, unref, useAttrs, useSlots } from "vue";

const props = defineProps({
    name: {
        type: String,
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
    ...THEME_OVERRIDE_PROPS,
});
const formContext = inject(FormContextSymbol, null);
const fieldContext = inject(FieldContextSymbol, null);
// Validate component setup after mounting
onMounted(() => {
    if (!formContext && !fieldContext && (!props.name || !props.errors || !props.warnings)) {
        console.warn(
            "FormChores.vue must be used within a form context, a field context, a field name must be provided with [help]/errors/warnings.",
        );
    }
});
const computedName = computed(() =>
    props.name?.length ? props.name : (fieldContext?.state?.name ?? NON_FIELD_ERRORS_KEY),
);
const computedHelp = computed(() => (props.help?.length ? props.help : fieldContext?.state?.help));
const attrs = useAttrs();
const computedAttrsSansClass = computed(() => omit(attrs, ["class"]));
const theme = useTheme("FormChores", props);
const propErrorsForName = computed(() => {
    const name = computedName.value;
    return props.errors?.[name] || {};
});
const contextErrorsForName = computed(() => {
    const name = computedName.value;
    return formContext?.state?.errors?.[name] || {};
});
const hasErrors = computed(
    () => Object.keys(propErrorsForName.value).length > 0 || Object.keys(contextErrorsForName.value).length > 0,
);
const propMessagesForName = computed(() => {
    const name = computedName.value;
    return props.warnings?.[name] || {};
});
const contextMessagesForName = computed(() => {
    const name = computedName.value;
    return formContext?.state?.messages?.[name] || {};
});
const hasMessages = computed(
    () => Object.keys(propMessagesForName.value).length > 0 || Object.keys(contextMessagesForName.value).length > 0,
);
const slots = useSlots();
const feedbackGroupSlotNames = useSlotNameGrouper(["feedback"], computedName.value, slots);
const defaultFeedbackSlotName = computed(() =>
    resolveSlotName(["", `feedback`], `feedback`, computedName.value, slots),
);
const errorFeedbackSlotName = computed(() =>
    resolveSlotName(["error", `feedback-error`], `feedback`, computedName.value, slots),
);
const errorContentFeedbackSlotName = computed(() =>
    resolveSlotName(["error-content", `feedback-error-content`], `feedback`, computedName.value, slots),
);
const messageFeedbackSlotName = computed(() =>
    resolveSlotName(["message", `feedback-message`], `feedback`, computedName.value, slots),
);
const messageContentFeedbackSlotName = computed(() =>
    resolveSlotName(["message-content", `feedback-message-content`], `feedback`, computedName.value, slots),
);
</script>
<template>
    <div v-if="hasErrors || hasMessages || computedHelp" :class="theme('root')">
        <form-help-text v-if="computedHelp" :class="theme('item')" :help="computedHelp" v-bind="computedAttrsSansClass">
            <template v-if="$slots[`field(${computedName})help`]" #default="slotProps">
                <slot :name="`field(${computedName})help`" v-bind="slotProps" />
            </template>
            <template v-else-if="$slots[`field-help`]" #default="slotProps">
                <slot name="field-help" v-bind="slotProps" />
            </template>
        </form-help-text>
        <slot
            :name="defaultFeedbackSlotName || 'default'"
            :has-messages="hasErrors"
            :class="theme('item')"
            :messages="props.errors"
            type="error"
            v-bind="computedAttrsSansClass"
        >
            <form-feedback
                v-if="hasErrors"
                :class="theme('item')"
                :messages="props.errors"
                type="error"
                v-bind="computedAttrsSansClass"
            >
                <template #default="slotProps">
                    <slot :name="errorFeedbackSlotName" v-bind="slotProps" />
                </template>
                <template #content="slotProps">
                    <slot :name="errorContentFeedbackSlotName" v-bind="slotProps" />
                </template>
            </form-feedback>
        </slot>
        <slot
            :name="defaultFeedbackSlotName || 'default'"
            :has-messages="hasMessages"
            :class="theme('item')"
            :messages="props.warnings"
            type="message"
            v-bind="computedAttrsSansClass"
        >
            <form-feedback
                v-if="hasMessages"
                :class="theme('item')"
                :messages="props.warnings"
                type="message"
                v-bind="computedAttrsSansClass"
            >
                <template #default="slotProps">
                    <slot :name="messageFeedbackSlotName" v-bind="slotProps" />
                </template>
                <template #content="slotProps">
                    <slot :name="messageContentFeedbackSlotName" v-bind="slotProps" />
                </template>
            </form-feedback>
        </slot>
    </div>
</template>
