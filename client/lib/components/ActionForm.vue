<script setup>
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormMessage from "@vueda/components/FormMessage.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/views/ActionForm.theme.js";
import { useActionForm } from "@vueda/use/useActionForm.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * Form shell that executes a server action, handles dry-run validation, shows success/error toasts, and provides confirm and cancel button slots.
 *
 * Renders a pinned actions strip (confirm + cancel + optional hint) and, when
 * the form has unresolved per-field errors, a structured validation alert
 * sourced from `formContext.state.errors`.
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
    /** When `false`, skips the "no changes detected" guard. Defaults to `true`. Set to `false` for forms that start empty where modification is not a meaningful concept. */
    requireModified: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const formContext = inject(FormContextSymbol);
const { combinedError, combinedErrored, combinedLoading, handleConfirm, handleCancelClick } = useActionForm(
    formContext,
    props,
);
const theme = useTheme("ActionForm", props);
const icon = useIcons("ActionForm");

/**
 * Per-field validation entries derived from `formContext.state.errors`.
 * Each entry is `{ field, messages: string[] }`. Non-field errors are
 * surfaced separately via `<form-message type="error" />` and are excluded
 * from the per-field list.
 */
const validationEntries = computed(() => {
    const errors = formContext?.state?.errors || {};
    const entries = [];
    for (const [field, codes] of Object.entries(errors)) {
        if (field === NON_FIELD_ERRORS_KEY) continue;
        if (!codes || typeof codes !== "object") continue;
        const messages = Object.values(codes).filter(Boolean);
        if (messages.length === 0) continue;
        entries.push({ field, messages });
    }
    return entries;
});

const showValidation = computed(() => !!formContext?.state?.anyError && validationEntries.value.length > 0);
const validationCount = computed(() => validationEntries.value.length);
const validationTitle = computed(() => {
    const n = validationCount.value;
    if (n === 0) return "Cannot run action";
    return `Cannot run action — ${n} ${n === 1 ? "field needs" : "fields need"} attention`;
});
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="action-form-root">
        <error-display :error="combinedError" :errored="combinedErrored" :ignore-form-validation-errors="true" />
        <div :class="theme('inner')" data-qa="action-form-inner">
            <div :class="theme('nonFieldErrorBlock')">
                <form-message type="error" />
                <form-message type="message" />
            </div>
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
                <!-- @slot [validation-summary] Override the structured per-field validation alert shown when `formContext.state.anyError` is set; receives `entries`, `count`, and `title`. -->
                <slot
                    v-if="showValidation"
                    name="validation-summary"
                    :entries="validationEntries"
                    :count="validationCount"
                    :title="validationTitle"
                >
                    <div :class="theme('validation')" role="alert" data-tone="danger" data-qa="action-form-validation">
                        <div
                            v-if="$slots['validation-icon'] || icon('triangleExclamation')"
                            :class="theme('validationIcon')"
                            aria-hidden="true"
                        >
                            <!-- @slot [validation-icon] Replaces the icon shown in the validation alert. -->
                            <slot name="validation-icon">
                                <component
                                    :is="icon('triangleExclamation').component"
                                    v-bind="icon('triangleExclamation').props"
                                    aria-hidden="true"
                                />
                            </slot>
                        </div>
                        <div :class="theme('validationBody')">
                            <div :class="theme('validationTitle')" data-qa="action-form-validation-title">
                                {{ validationTitle }}
                            </div>
                            <p :class="theme('validationDesc')" data-qa="action-form-validation-desc">
                                Resolve the highlighted fields, then try again.
                            </p>
                            <ul :class="theme('validationList')" data-qa="action-form-validation-list">
                                <li
                                    v-for="entry in validationEntries"
                                    :key="entry.field"
                                    :class="theme('validationListItem')"
                                    data-qa="action-form-validation-item"
                                >
                                    <span :class="theme('validationField')" data-qa="action-form-validation-field">
                                        {{ entry.field }}
                                    </span>
                                    <span :class="theme('validationMsg')">
                                        {{ entry.messages.join("; ") }}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </slot>
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
                            <Button type="submit" :disabled="combinedLoading || formContext.state.anyError">
                                <LoadingSpinnerInline v-if="combinedLoading" />
                                Yes, continue
                            </Button>
                        </slot>
                        <!-- Cancel button that invokes the redirect; receives `label`, `loading`, and `verb` as slot props. -->
                        <slot
                            label="Cancel, go back"
                            :loading="combinedLoading"
                            name="cancel-button"
                            verb="cancel"
                            @click="handleCancelClick"
                        >
                            <Button variant="ghost" :disabled="combinedLoading" @click="handleCancelClick">
                                <LoadingSpinnerInline v-if="combinedLoading" />
                                Cancel, go back
                            </Button>
                        </slot>
                        <!-- @slot [actions-hint] Optional right-aligned hint shown in the actions strip (e.g. keyboard shortcut, reversibility note, audit hint). -->
                        <div
                            v-if="$slots['actions-hint']"
                            :class="theme('buttonsSpacer')"
                            data-qa="action-form-buttons-spacer"
                        ></div>
                        <div
                            v-if="$slots['actions-hint']"
                            :class="theme('buttonsHint')"
                            data-qa="action-form-buttons-hint"
                        >
                            <slot name="actions-hint" />
                        </div>
                    </div>
                </slot>
            </form>
        </div>
    </div>
</template>
