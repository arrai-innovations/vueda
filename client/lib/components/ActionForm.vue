<script setup>
import { loadingCombine } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormChores from "@vueda/components/FormChores.vue";
import { ControlButton } from "@vueda/controls/button";
import { FeedbackSpinner } from "@vueda/feedback/spinner";
import { defaultOnSubmissionError, defaultOnSubmitNotAnyModified } from "@vueda/use/useObjectForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormValidationError } from "@vueda/utils/errors.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { useToast } from "primevue/usetoast";
import { computed, inject, nextTick, onDeactivated, onUnmounted, reactive, watch } from "vue";

/**
 * Form shell that executes a server action, handles dry-run validation, shows success/error toasts, and provides confirm and cancel button slots.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /**
     * Function to execute the action.
     * @param {Object} options - Action execution options
     * @param {Object} options.formValues - Form values to submit
     * @param {boolean} options.dryRun - Whether this is a dry run validation
     * @returns {Promise} Promise that resolves with the action result
     */
    runAction: {
        type: Function,
        default: undefined,
    },
    /** Toast summary text shown when the action succeeds. */
    actionSuccessSummary: {
        type: String,
        default: undefined,
    },
    /** Toast summary text shown when the action fails. */
    actionErrorSummary: {
        type: String,
        default: undefined,
    },
    /** Confirmation message displayed to the user before executing the action (reserved for future use). */
    confirmMessage: {
        type: String,
        default: undefined,
    },
    /** Reactive state object describing the data-fetch status (`errored`, `error`, `loading`). */
    fetchState: {
        type: Object,
        default: () => ({ errored: false, error: null, loading: undefined }),
    },
    /** Reactive state object describing the action execution status (`errored`, `error`, `loading`). */
    actionState: {
        type: Object,
        default: () => ({ errored: false, error: null, loading: undefined }),
    },
    /** Whether the form has user input fields that must be validated before submission. */
    hasInput: {
        type: Boolean,
        default: false,
    },
    /** Async function called to navigate away after a successful action or cancel; receives `"success"` or `"cancel"` as its argument. */
    redirectTo: {
        type: Function,
        default: undefined,
    },
    /** Custom handler called on successful submission in place of the default success toast and redirect. */
    onSubmissionSuccessHandler: {
        type: Function,
        default: undefined,
    },
    /** Custom handler called on submission error in place of the default error toast. */
    onSubmissionErrorHandler: {
        type: Function,
        default: undefined,
    },
    /** When set to `true`, triggers a dry-run validation pass without submitting the form. */
    readyToDryRun: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});
const toast = useToast();

const localActionState = reactive({
    loading: false,
    errored: false,
    error: null,
});
const combinedError = computed(() => {
    return props.fetchState.error || localActionState.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedLoading = computed(() => loadingCombine(props.fetchState.loading, localActionState.loading));

const formContext = inject(FormContextSymbol);
let actionPromise = null;
const handleConfirm = async (dryRun = false) => {
    formContext.setAllTouched();
    localActionState.loading = true;
    if (props.hasInput && !dryRun) {
        await nextTick();
        if (!formContext.state.anyModified) {
            await defaultOnSubmitNotAnyModified({ toast });
            localActionState.loading = false;
            return;
        }
        if (formContext.state.anyError) {
            const nonServerErrors = Object.entries(formContext.state.errors)
                .map(([key, value]) => [key, omit(value, "server")])
                .filter(([, value]) => !isEmpty(value));
            if (nonServerErrors.length) {
                const plural = nonServerErrors.length > 1;
                toast.add({
                    severity: "warn",
                    summary: "Submission Blocked",
                    detail: `Please correct the highlighted error${plural ? "s" : ""}.`,
                    life: 10000,
                });
                localActionState.loading = false;
                return;
            }
        }
    }

    localActionState.errored = false;
    localActionState.error = null;
    try {
        actionPromise = props.runAction({
            formValues: formContext.state.submittingValues,
            dryRun,
        });
        const response = await actionPromise;
        if (props.actionState.errored) {
            await handleError(props.actionState.error, dryRun);
            return;
        }
        if (dryRun) {
            return;
        }

        if (props.onSubmissionSuccessHandler) {
            props.onSubmissionSuccessHandler(response);
        } else {
            toast.add({
                severity: "success",
                summary: props.actionSuccessSummary || "Action Succeeded",
                life: 15000,
            });
            if (props.redirectTo) {
                await props.redirectTo("success");
            }
        }
    } catch (error) {
        await handleError(error, dryRun);
    } finally {
        actionPromise = null;
        localActionState.loading = false;
    }
};

const handleError = async (error, dryRun) => {
    if (dryRun) {
        if (error instanceof FormValidationError) {
            formContext.handleServerFormValidationError(error);
        }
        return;
    }
    const errorHandler = props.onSubmissionErrorHandler || defaultOnSubmissionError;
    const handled = await errorHandler({ error, formContext, toast });
    if (!handled) {
        localActionState.errored = true;
        localActionState.error = error;
        toast.add({
            severity: "error",
            summary: props.actionErrorSummary || "Action Failed",
            detail: localActionState.error,
            life: 15000,
        });
    }
};
const theme = useTheme("ActionForm", props);

onDeactivated(() => {
    if (actionPromise) {
        actionPromise.cancel?.();
    }
});
onUnmounted(() => {
    if (actionPromise) {
        actionPromise.cancel?.();
    }
});
const handleCancelClick = async (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (props.redirectTo) {
        await props.redirectTo("cancel");
    }
};

watch(
    () => props.readyToDryRun,
    async (newVal) => {
        if (newVal) {
            await handleConfirm(true);
        }
    },
);
</script>

<template>
    <div :class="theme('root')" data-qa="action-form-root">
        <error-display :error="combinedError" :errored="combinedErrored" :ignore-form-validation-errors="true" />
        <div :class="theme('inner')" data-qa="action-form-inner">
            <form-chores :class="theme('nonFieldErrorBlock')" :variant="null" />
            <form @submit.prevent="handleConfirm()">
                <!-- Main form content area; receives `loading`, `error`, `errored`, `handleConfirm`, and `handleCancelClick` as slot props. -->
                <slot
                    name="action-form-inner"
                    v-bind="{
                        loading: combinedLoading,
                        error: combinedError,
                        errored: combinedErrored,
                        handleConfirm,
                        handleCancelClick,
                    }"
                />
                <!-- Action bar containing the confirm and cancel buttons; receives `loading`, `handleConfirm`, and `handleCancelClick` as slot props. -->
                <slot
                    :loading="combinedLoading"
                    name="action-bar"
                    :handle-confirm="handleConfirm"
                    :handle-cancel-click="handleCancelClick"
                >
                    <div :class="theme('buttons')" data-qa="action-form-buttons">
                        <!-- Submit button that triggers the action; receives `label`, `loading`, `verb`, `type`, and `disabled` as slot props. -->
                        <slot
                            label="Yes, continue"
                            :loading="combinedLoading"
                            name="confirm-button"
                            verb="confirm"
                            type="submit"
                            :disabled="formContext.state.anyError"
                        >
                            <ControlButton type="submit" :disabled="combinedLoading || formContext.state.anyError">
                                <FeedbackSpinner v-if="combinedLoading" />
                                Yes, continue
                            </ControlButton>
                        </slot>
                        <!-- Cancel button that invokes the redirect; receives `label`, `loading`, and `verb` as slot props. -->
                        <slot
                            label="Cancel, go back"
                            :loading="combinedLoading"
                            name="cancel-button"
                            verb="cancel"
                            @click="handleCancelClick"
                        >
                            <ControlButton variant="ghost" :disabled="combinedLoading" @click="handleCancelClick">
                                <FeedbackSpinner v-if="combinedLoading" />
                                Cancel, go back
                            </ControlButton>
                        </slot>
                    </div>
                </slot>
            </form>
        </div>
    </div>
</template>
