<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { containsHtml, sanitizeMessages } from "@vueda/utils/html.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import isObject from "lodash-es/isObject.js";
import { computed, inject, reactive, watch } from "vue";

/**
 * Renders form or field validation messages sourced from injected form/field context or from the `messages` prop, displaying each entry as a Alert.
 */
defineOptions({});

const props = defineProps({
    /** Whether to display field errors (`"error"`) or non-error messages (`"message"`). */
    type: {
        type: String,
        default: "error",
        validator: (value) => ["error", "message"].includes(value),
    },
    /** Explicit messages to display (keyed by code), bypassing context-derived messages. */
    messages: {
        type: Object,
        default: null,
        description: "Messages to display, keyed by code.",
    },
    /** Severity level controlling the alert variant; defaults to `"error"` or `"warn"` based on `type`. */
    severity: {
        type: String,
        default: null,
        validator: (value) => ["error", "warn", "success", "info", null].includes(value),
    },
    /** When `true`, message strings containing HTML are rendered as HTML. */
    allowHtml: {
        type: Boolean,
        default: true,
        description: "Allows rendering of messages as HTML if true.",
    },
    ...THEME_OVERRIDE_PROPS,
});
/** @type {import("@vueda/use/useForm.js").FormContext|null} */
const formContext = inject(FormContextSymbol, null);
/** @type {import("@vueda/use/useField.js").FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const feedbackItems = reactive({});

watch(
    // formContext/fieldContext can be null, so we need to watch in a way that'll handle that
    () => [
        fieldContext?.state?.errors,
        fieldContext?.state?.messages,
        get(formContext?.state?.errors, NON_FIELD_ERRORS_KEY, undefined),
        get(formContext?.state?.messages, NON_FIELD_ERRORS_KEY, undefined),
        props.type,
        props.messages,
    ],
    ([errors, messages, formErrors, formMessages, propsType, propsMessages]) => {
        if (propsMessages) {
            const sanitizedPropsMessages = sanitizeMessages(propsMessages);
            if (!isEqual(sanitizedPropsMessages, feedbackItems)) {
                assignReactiveObject(feedbackItems, sanitizeMessages(sanitizedPropsMessages));
            }
        } else if (!fieldContext && formContext) {
            // if we are in a form but not in a field, we should show the form's errors
            const formErrorsOrMessages = (propsType === "error" ? formErrors : formMessages) || {};
            const sanitizedFormErrorsOrMessages = sanitizeMessages(formErrorsOrMessages);
            if (!isEqual(sanitizedFormErrorsOrMessages, feedbackItems)) {
                assignReactiveObject(feedbackItems, sanitizedFormErrorsOrMessages);
            }
        } else if (fieldContext) {
            const fieldErrorsOrMessages = (propsType === "error" ? errors : messages) || {};
            const sanitizedFieldErrorsOrMessages = sanitizeMessages(fieldErrorsOrMessages);
            if (!isEqual(sanitizedFieldErrorsOrMessages, feedbackItems)) {
                assignReactiveObject(feedbackItems, sanitizedFieldErrorsOrMessages);
            }
        }
    },
    // without deep, deleted message keys end up null, not undefined, making the object not empty if the last key was
    //  deleted. this leaves empty feedback boxes on the form.
    { immediate: true, deep: true },
);
const SEVERITY_TO_VARIANT = {
    error: "destructive",
    warn: "warning",
    success: "success",
    info: "info",
};
const alertVariant = computed(() => {
    if (props.severity) return SEVERITY_TO_VARIANT[props.severity] ?? "default";
    return props.type === "message" ? "warning" : "destructive";
});
const theme = useTheme("FormFeedback", props);
</script>
<template>
    <div v-if="Object.values(feedbackItems || {})?.length" :class="theme('root')" data-qa="form-feedback-root">
        <div
            v-for="message in Object.values(feedbackItems || {})"
            :key="message"
            :class="theme('messages')"
            data-qa="form-feedback-messages"
        >
            <!-- Replaces the entire message row; receives `message`, `type`, and `attrs` as slot props. -->
            <slot name="default" v-bind="{ message, type, attrs: $attrs }">
                <Alert
                    v-for="line in Array.isArray(message) ? message : [message]"
                    :key="line"
                    v-bind="$attrs"
                    :variant="alertVariant"
                >
                    <!-- @slot icon Replaces the default icon area inside each alert. -->
                    <slot name="icon" />
                    <AlertDescription>
                        <slot name="content" :line="line" :message="message" :type="type" :severity="severity">
                            <template v-if="isObject(line)">
                                <div v-for="[name, value] of Object.entries(line)" :key="name">
                                    {{ name }}: {{ value }}
                                </div>
                            </template>
                            <template v-else-if="allowHtml && containsHtml(line)">
                                <!-- eslint-disable-next-line vue/no-v-html -->
                                <div v-html="line" />
                            </template>
                            <template v-else>
                                {{ line }}
                            </template>
                        </slot>
                    </AlertDescription>
                </Alert>
            </slot>
        </div>
    </div>
</template>
