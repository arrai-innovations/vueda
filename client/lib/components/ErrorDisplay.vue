<script setup>
import { FormValidationError } from "@vueda/utils/errors.js";
import formatError from "@vueda/utils/formatError.js";
import isArray from "lodash-es/isArray.js";
import isEmpty from "lodash-es/isEmpty";
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
</script>

<template>
    <template v-if="errored">
        <slot>
            <Message class="w-full" :closable="showDismiss" severity="error" @close="onDismiss">
                <div class="max-w-full overflow-x-auto p-1 flex flex-col gap-2">
                    <p>There was an error while {{ whileText }}.</p>
                    <pre><code>{{ formatError(error) }}</code></pre>
                </div>
            </Message>
        </slot>
    </template>
</template>
