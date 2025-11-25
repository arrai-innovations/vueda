<script setup>
import { loadingCombine } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormChores from "@vueda/components/FormChores.vue";
import { defaultOnSubmissionError, defaultOnSubmitNotAnyModified } from "@vueda/use/useObjectForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, inject, nextTick, onDeactivated, onUnmounted, reactive } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    runAction: {
        type: Function,
        default: undefined,
    },
    actionSuccessSummary: {
        type: String,
        default: undefined,
    },
    actionErrorSummary: {
        type: String,
        default: undefined,
    },
    confirmMessage: {
        type: String,
        default: undefined,
    },
    actionState: {
        type: Object,
        default: () => ({ errored: false, error: null, loading: undefined }),
    },
    hasInput: {
        type: Boolean,
        default: false,
    },
    redirectTo: {
        type: Function,
        default: undefined,
    },
    onSubmissionSuccessHandler: {
        type: Function,
        default: undefined,
    },
    onSubmissionErrorHandler: {
        type: Function,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});
const toast = useToast();

const actionFormState = reactive({
    loading: false,
    errored: false,
    error: null,
    submitting: false,
});
const combinedError = computed(() => {
    return props.actionState.error || actionFormState.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedLoading = computed(() => loadingCombine(props.actionState.loading, actionFormState.loading));

const formContext = inject(FormContextSymbol, null);
let actionPromise = null;
const handleConfirm = async () => {
    formContext.setAllTouched();
    if (props.hasInput) {
        await nextTick();
        if (!formContext.state.anyModified) {
            await defaultOnSubmitNotAnyModified({ toast });
            actionFormState.submitting = false;
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
                actionFormState.submitting = false;
                return;
            }
        }
    }

    actionFormState.loading = true;
    actionFormState.errored = false;
    actionFormState.error = null;
    try {
        actionPromise = props.runAction(formContext.state.submittingValues);
        const response = await actionPromise;

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
        const errorHandler = props.onSubmissionErrorHandler || defaultOnSubmissionError;
        const handled = await errorHandler({ error, formContext, toast });
        if (!handled) {
            actionFormState.errored = true;
            actionFormState.error = error;
            toast.add({
                severity: "error",
                summary: props.actionErrorSummary || "Action Failed",
                detail: actionFormState.error,
                life: 15000,
            });
        }
    } finally {
        actionPromise = null;
        actionFormState.loading = false;
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
</script>

<template>
    <div :class="theme('root')" data-qa="action-form-root">
        <error-display :error="combinedError" :errored="combinedErrored" :ignore-form-validation-errors="true" />
        <div :class="theme('inner')" data-qa="action-form-inner">
            <form-chores :class="theme('nonFieldErrorBlock')" :variant="null" />
            <form @submit.prevent="handleConfirm">
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
                <slot
                    :loading="combinedLoading"
                    name="action-bar"
                    :handle-confirm="handleConfirm"
                    :handle-cancel-click="handleCancelClick"
                >
                    <div :class="theme('buttons')" data-qa="action-form-buttons">
                        <slot
                            label="Yes, continue"
                            :loading="combinedLoading"
                            name="confirm-button"
                            verb="confirm"
                            type="submit"
                        >
                            <Button :loading="combinedLoading" type="submit">Yes, continue</Button>
                        </slot>
                        <slot
                            label="Cancel, go back"
                            :loading="combinedLoading"
                            name="cancel-button"
                            verb="cancel"
                            @click="handleCancelClick"
                        >
                            <Button label="Cancel, go back" :loading="combinedLoading" @click="handleCancelClick" />
                        </slot>
                    </div>
                </slot>
            </form>
        </div>
    </div>
</template>
