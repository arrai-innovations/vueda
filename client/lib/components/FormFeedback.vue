<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { containsHtml, sanitizeMessages } from "@vueda/utils/html.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import { isArray } from "lodash-es";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import isObject from "lodash-es/isObject.js";
import Message from "primevue/message";
import { inject, reactive, ref, toRef, watch } from "vue";

const props = defineProps({
    type: {
        type: String,
        default: "error",
        validator: (value) => ["error", "message"].includes(value),
    },
    messages: {
        type: Object,
        default: null,
        description: "Messages to display, keyed by code.",
    },
    size: {
        type: String,
        default: "small",
        validator: (value) => ["small", "large", null].includes(value),
    },
    variant: {
        type: String,
        default: "simple",
        validator: (value) => ["simple", "outlined", null].includes(value),
    },
    severity: {
        type: String,
        default: null,
        validator: (value) => ["error", "warn", "help", "success", "info", "contrast", null].includes(value),
    },
    allowHtml: {
        type: Boolean,
        default: true,
        description: "Allows rendering of messages as HTML if true.",
    },
    collapsible: {
        type: Boolean,
        default: false,
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
const toggleVisibility = () => {
    internalVisible.value = !internalVisible.value;
};
const internalVisible = ref(true);
const theme = useTheme(
    "FormFeedback",
    props,
    reactive({
        variant: toRef(props, "variant"),
        collapsible: toRef(props, "collapsible"),
        visible: internalVisible,
    }),
);
const renderDetail = (data) => {
    const detail = data.detail;
    return detail.replace(/\$\{(\w+)\}/g, (_, key) => {
        const value = data[key];
        if (Array.isArray(value)) {
            return `<ul class="${theme("messagesInnerList")}">${value.map((item) => `<li>${item}</li>`).join("")}</ul>`;
        }
        return value !== undefined ? value : ""; // Replace with the value or leave empty
    });
};
</script>
<template>
    <div v-if="Object.values(feedbackItems || {})?.length" :class="theme('root')" data-qa="form-feedback-root">
        <div
            v-for="message in Object.values(feedbackItems || {})"
            :key="message"
            :class="theme('messages')"
            data-qa="form-feedback-messages"
        >
            <slot :name="type" v-bind="{ message, type, attrs: $attrs }">
                <Message
                    v-for="line in isArray(message) ? message : [message]"
                    :key="line"
                    v-bind="$attrs"
                    :closable="false"
                    :severity="(severity ?? type === 'message') ? 'warn' : 'error'"
                    :size="size"
                    :variant="variant"
                >
                    <template #icon="slotProps">
                        <slot name="icon" v-bind="slotProps" />
                        <div v-if="collapsible">
                            <slot
                                name="msg-collapse-icon"
                                :toggle-visibility="toggleVisibility"
                                :visible="internalVisible"
                            >
                                <span v-if="internalVisible">⬆️</span>
                                <span v-else>⬇️</span>
                            </slot>
                        </div>
                    </template>
                    <template #default>
                        <div v-if="internalVisible">
                            <div v-if="isObject(line)">
                                <div v-if="allowHtml" v-html="renderDetail(line)"></div>
                                <div v-else v-for="[name, msg] of Object.entries(line)" :key="name">
                                    {{ name }}: {{ msg }}
                                </div>
                            </div>
                            <div v-else-if="allowHtml && containsHtml(line)">
                                <div v-html="line" />
                            </div>
                            <div v-else>
                                {{ line }}
                            </div>
                        </div>
                    </template>
                </Message>
            </slot>
        </div>
    </div>
</template>
