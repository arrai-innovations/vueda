<script setup>
import * as Sentry from "@sentry/vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormValidationError, ListFilterError } from "@vueda/utils/errors.js";
import { formatError } from "@vueda/utils/formatError.js";
import isEmpty from "lodash-es/isEmpty.js";
import Message from "primevue/message";
import { computed, ref, toRef, useAttrs, watch } from "vue";

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
    ignoreListFilterErrors: {
        type: Boolean,
        default: false,
        description: "Whether to ignore form validation errors",
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
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits(["dismiss-error"]);

const ignoredError = (error) =>
    !!(
        (props.ignoreFormValidationErrors && error instanceof FormValidationError) ||
        (props.ignoreListFilterErrors && error instanceof ListFilterError) ||
        (props.ignoreAbortedRequests && error?.message?.includes("aborted"))
    );

const reportedErrors = ref(new Set());

const reportToSentry = (error) => {
    const errorKey = error?.message || JSON.stringify(error); // Create a unique key for each error
    if (!reportedErrors.value.has(errorKey)) {
        Sentry.captureException(error);
        reportedErrors.value.add(errorKey);
    }
    if (import.meta.env.DEV) {
        console.error(error);
    }
};

watch(
    toRef(props, "error"),
    (error) => {
        if (ignoredError(error)) {
            return;
        }
        if (Array.isArray(error)) {
            if (isEmpty(error)) {
                return;
            }
            error
                .flat()
                .filter((e) => !ignoredError(e))
                .forEach(reportToSentry);
        } else if (error) {
            reportToSentry(error);
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
            <slot>
                <p :class="theme('message')">There was an error while {{ whileText }}.</p>
                <pre :class="theme('codeBlock')"><code>{{ formatError(error) }}</code></pre>
                <p v-if="redirectParams">
                    <router-link :class="theme('link')" :to="redirectParams">{{ redirectTitle }}</router-link>
                </p>
            </slot>
        </div>
    </Message>
</template>
