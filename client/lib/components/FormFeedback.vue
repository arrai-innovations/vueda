<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import get from "lodash-es/get.js";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import Message from "primevue/message";
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
            assignReactiveObject(feedbackItems, propsMessages);
        } else if (!fieldContext && formContext) {
            // if we are in a form but not in a field, we should show the form's errors
            const formErrorsOrMessages = (propsType === "error" ? formErrors : formMessages) || {};
            if (!isEqual(formErrorsOrMessages, feedbackItems)) {
                assignReactiveObject(feedbackItems, formErrorsOrMessages);
            }
        } else if (fieldContext) {
            const fieldErrorsOrMessages = (propsType === "error" ? errors : messages) || {};
            if (!isEqual(fieldErrorsOrMessages, feedbackItems)) {
                assignReactiveObject(feedbackItems, fieldErrorsOrMessages);
            }
        }
    },
    // without deep, deleted message keys end up null, not undefined, making the object not empty if the last key was
    //  deleted. this leaves empty feedback boxes on the form.
    { immediate: true, deep: true },
);
const theme = useTheme("FormFeedback", props, fieldContext?.state);
</script>
<template>
    <div
        v-if="!isEmpty(feedbackItems)"
        v-for="message in Object.values(feedbackItems)"
        :key="message"
        :class="theme('root')"
    >
        <slot :name="type" v-bind="{ message, type, attrs: $attrs }">
            <Message v-bind="$attrs" :closable="false" :severity="type === 'message' ? 'warn' : 'error'">{{
                message
            }}</Message>
        </slot>
    </div>
</template>
