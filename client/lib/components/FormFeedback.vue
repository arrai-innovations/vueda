<script setup>
import { useCombinedClasses } from "../use/useCombinedClasses.js";
import { NON_FIELD_ERRORS_KEY } from "../utils/constants.js";
import { FieldContextSymbol, FormContextSymbol } from "../utils/symbols.js";
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import get from "lodash-es/get.js";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import InlineMessage from "primevue/inlinemessage";
import { inject, reactive, watch } from "vue";

const props = defineProps({
    type: {
        type: String,
        default: "error",
        validator: (value) => ["error", "message"].includes(value),
    },
    messages: {
        type: Object,
        default: null,
        description: "Messages to display, in code: message pairs",
    },
    variant: {
        type: String,
        default: "default",
    },
    errorsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    errorClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    messagesClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    messageClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const formContext = inject(FormContextSymbol, null);
const fieldContext = inject(FieldContextSymbol, null);
const feedbackItems = reactive({});

watch(
    // formContext/fieldContext can be null, so we need to watch in a way that'll handle that
    () => [
        fieldContext,
        fieldContext?.errors,
        fieldContext?.messages,
        formContext,
        get(formContext?.errors, NON_FIELD_ERRORS_KEY, undefined),
        get(formContext?.messages, NON_FIELD_ERRORS_KEY, undefined),
        props.type,
        props.messages,
    ],
    ([fieldContext, errors, messages, formContext, formErrors, formMessages, propsType, propsMessages]) => {
        if (propsMessages) {
            assignReactiveObject(feedbackItems, propsMessages);
        } else if (!fieldContext && formContext) {
            // if we are in a form but not in a field, we should show the form's errors
            assignReactiveObject(feedbackItems, (propsType === "error" ? formErrors : formMessages) || {});
        } else if (fieldContext && !isEqual(propsType === "error" ? errors : messages, feedbackItems)) {
            assignReactiveObject(feedbackItems, (propsType === "error" ? errors : messages) || {});
        }
    },
    // without deep, deleted message keys end null, not undefined, making the object not empty if the last key was deleted
    { immediate: true, deep: true },
);

const combinedClasses = useCombinedClasses("FormFeedback", props);
</script>
<template>
    <div v-if="!isEmpty(feedbackItems)" :class="combinedClasses[`{type}sClass`]">
        <InlineMessage
            v-for="message in Object.values(feedbackItems)"
            :key="message"
            :severity="type === 'message' ? 'info' : 'error'"
            >{{ message }}</InlineMessage
        >
    </div>
</template>
