<script setup>
import { useTheme } from "@vueda/use/useTheme.js";
import { FormValidationError } from "@vueda/utils/errors.js";
import { formatError } from "@vueda/utils/formatError.js";
import isArray from "lodash-es/isArray.js";
import isEmpty from "lodash-es/isEmpty.js";
import Message from "primevue/message";
import { computed, useAttrs, watch } from "vue";

const props = defineProps({
    errored: {
        type: Boolean,
        default: false,
        description: "Whether there is an error to display",
    },
    error: {
        type: Object,
        default: null,
        description: "The error to display",
    },
    whileText: {
        type: String,
        default: "loading",
        description: "The text to indicate what was attempted when the error occurred",
    },
    ignoreFormValidationErrors: {
        type: Boolean,
        default: false,
        description: "Whether to ignore form validation errors",
    },
    ignoreAbortedRequests: {
        type: Boolean,
        default: true,
        description: "Whether to ignore aborted requests",
    },
    redirectParams: {
        type: [Object, String],
        default: null,
        description: "The vue-router params to create a link to in the message.",
    },
    redirectTitle: {
        type: String,
        default: "Click here to go back.",
        description: "The text to display as the link in the message.",
    },
});
const emit = defineEmits(["dismiss-error"]);

const ignoredError = (error) =>
    !!(
        (props.ignoreFormValidationErrors && error instanceof FormValidationError) ||
        (props.ignoreAbortedRequests && error?.message?.includes("aborted"))
    );

watch(
    () => props.state?.error,
    async (error) => {
        if (ignoredError(error)) {
            return;
        }
        if (isArray(error)) {
            if (isEmpty(error)) {
                return;
            }
            const myError = error.flat().filter((e) => !ignoredError(e));
            myError.forEach((e) => {
                console.error(e);
            });
        } else if (error) {
            console.error(error);
        }
    },
    { immediate: true },
);

const attrs = useAttrs();
// if there is a dismiss-error event, show the dismiss button
const showDismiss = computed(() => !!attrs.onDismissError);
const onDismiss = () => emit("dismiss-error");
const theme = useTheme("ErrorDisplay", props);
</script>

<template>
    <Message v-if="errored" :class="theme('root')" :closable="showDismiss" severity="error" @close="onDismiss">
        <div :class="theme('container')">
            <p :class="theme('message')">There was an error while {{ whileText }}.</p>
            <pre :class="theme('codeBlock')"><code>{{ formatError(error) }}</code></pre>
            <p v-if="redirectParams">
                <router-link :class="theme('link')" :to="redirectParams">{{ redirectTitle }}</router-link>
            </p>
        </div>
    </Message>
</template>
