<script setup>
import * as Sentry from "@sentry/vue";
import FeedbackAlert from "@vueda/feedback/alert/FeedbackAlert.vue";
import FeedbackAlertClose from "@vueda/feedback/alert/FeedbackAlertClose.vue";
import FeedbackAlertDescription from "@vueda/feedback/alert/FeedbackAlertDescription.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormValidationError, ListFilterError } from "@vueda/utils/errors.js";
import { formatError } from "@vueda/utils/formatError.js";
import isEmpty from "lodash-es/isEmpty.js";
import { ref, toRef, watch } from "vue";

/**
 * Displays a dismissible error message card, reports the error to Sentry, and optionally renders a router-link for navigation.
 */
defineOptions({});

const props = defineProps({
    /** Whether there is an error to display. */
    errored: {
        type: Boolean,
        default: false,
        description: "Whether there is an error to display",
    },
    /** The error object to display; supports a single error or an array of errors. */
    error: {
        type: Object,
        default: null,
        description: "The error to display",
    },
    /** Phrase inserted into the default message as "There was an error while &lt;whileText&gt;." */
    whileText: {
        type: String,
        default: "loading",
        description: "The text to indicate what was attempted when the error occurred",
    },
    /** When `true`, `ListFilterError` instances are silently ignored and not displayed. */
    ignoreListFilterErrors: {
        type: Boolean,
        default: false,
        description: "Whether to ignore list filter errors",
    },
    /** When `true`, `FormValidationError` instances are silently ignored and not displayed. */
    ignoreFormValidationErrors: {
        type: Boolean,
        default: false,
        description: "Whether to ignore form validation errors",
    },
    /** When `true`, errors whose message contains "aborted" are silently ignored. */
    ignoreAbortedRequests: {
        type: Boolean,
        default: true,
        description: "Whether to ignore aborted requests",
    },
    /** Vue Router location passed to a `<router-link>` rendered below the error message. */
    redirectParams: {
        type: [Object, String],
        default: null,
        description: "The vue-router params to create a link to in the message.",
    },
    /** Link text displayed for the router-link when `redirectParams` is set. */
    redirectTitle: {
        type: String,
        default: "Click here to go back.",
        description: "The text to display as the link in the message.",
    },
    /** When `true`, a close button is shown that emits `dismiss-error` when clicked. */
    dismissible: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([
    /** Emitted when the user closes the error message card. */
    "dismiss-error",
]);

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

const onDismiss = () => emit("dismiss-error");
const theme = useTheme("ErrorDisplay", props);
</script>

<template>
    <FeedbackAlert v-if="errored" :class="theme('root')" variant="destructive">
        <FeedbackAlertClose v-if="dismissible" @close="onDismiss" />
        <FeedbackAlertDescription>
            <div :class="theme('container')">
                <!-- Default error content; receives `redirectParams`, `redirectTitle`, `whileText`, and `error` as slot props. -->
                <slot v-bind="{ redirectParams, redirectTitle, whileText, error }">
                    <p :class="theme('message')">There was an error while {{ whileText }}.</p>
                    <pre :class="theme('codeBlock')"><code>{{ formatError(error) }}</code></pre>
                    <p v-if="redirectParams">
                        <router-link :class="theme('link')" :to="redirectParams">{{ redirectTitle }}</router-link>
                    </p>
                </slot>
            </div>
        </FeedbackAlertDescription>
    </FeedbackAlert>
</template>
