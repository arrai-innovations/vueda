<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
import FormMessage from "@vueda/form/form-model/FormMessage.vue";
import "@vueda/theme/vueda-tailwind/views/ActionForm.theme.js";
import { useActionForm } from "@vueda/use/useActionForm.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * Form shell that executes a server action, handles dry-run validation, shows success/error toasts, and provides confirm and cancel button slots.
 *
 * Renders a pinned actions strip (confirm + cancel + optional hint) and, when
 * the form has per-field errors that no rendered field shows beside itself, a
 * structured validation alert sourced from `formContext.state.errors`. The
 * alert sits with the non-field error block above the fields, so a reader meets
 * it before the first field and the submit control. Also mounts a `FormConfirmDialog`
 * bound to the action's confirmation controller, so actions the server gates
 * behind warning acknowledgement (HTTP 409) can be confirmed and retried. `ActionForm` renders no
 * warnings content of its own; a consumer that needs to render them (e.g. a bulk action grouping
 * per-object warnings by their display name) supplies the `form-confirm-dialog-warnings` slot,
 * which forwards FormConfirmDialog's `warnings` slot scope (`warnings`, the controller's raw
 * warnings mapping). Without that slot, `FormConfirmDialog`'s own default rendering shows through.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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
    /** Custom handler called when the server requires confirmation of warnings (HTTP 409) in place of the default render-warnings-and-prompt behaviour. */
    onSubmissionWarningsRequireConfirmation: {
        type: Function,
        default: undefined,
    },
    /** When set to `true`, triggers a dry-run validation pass without submitting the form. */
    readyToDryRun: {
        type: Boolean,
        default: false,
    },
    /**
     * Identity of the current dry-run target (e.g. `useModelAction`'s joined pks). The dry-run watcher
     * latches on this, firing once per distinct value rather than every time `readyToDryRun` recomputes
     * to `true`. Omit it for a caller with no target concept; the watcher then fires at most once, ever.
     */
    dryRunTarget: {
        type: String,
        default: undefined,
    },
    /** When `false`, skips the "no changes detected" guard. Defaults to `true`. Set to `false` for forms that start empty where modification is not a meaningful concept. */
    requireModified: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
// Required, not optional: useActionForm calls setAllTouched(), reads state.submittingValues
// for the request body, and routes a server 400 through handleServerFormValidationError(),
// while the template gates submit on state.anyError. Degrading to a no-op would swallow
// server field errors silently, so fail loudly and name the provider instead. ModelActionForm
// establishes one when its host has not; a bare ActionForm must be wrapped in a useForm scope.
const formContext = inject(FormContextSymbol, null);
if (!formContext) {
    throw new Error(
        "ActionForm: no form context. Call useForm() in an ancestor and provide it under " +
            "FormContextSymbol, or render ModelActionForm, which establishes one when none is injected.",
    );
}
const { combinedError, combinedErrored, combinedLoading, confirmation, handleConfirm, handleCancelClick } =
    useActionForm(formContext, props);
const theme = useTheme("ActionForm", props);
const icon = useIcons("ActionForm", props);

/**
 * Per-field validation entries derived from `formContext.state.errors`, limited
 * to the errors no rendered field already shows beside itself. Each rendered
 * field reports through `useField` whether the reader can see its own error
 * messages (`formContext.state.showsErrors`); an error keyed to a field that
 * reports `true` is dropped here because the reader already sees it under the
 * field. Every other error stays: a field whose renderer failed, a field
 * rendered with `hidden`, a field inside a collapsed inline field set, or a key
 * the form does not render at all has no visible surface, and this list is the
 * only place it appears.
 *
 * Each entry is `{ field, label, messages: string[] }`. `label` names the
 * field the way its rendered form field labels it (via `formContext.state.labels`,
 * which each rendered field registers through `useField`), falling back to
 * `field` itself when no rendered field registered a label for that key.
 * Non-field errors are surfaced separately via `<form-message type="error" />`
 * and are excluded from the per-field list.
 */
const validationEntries = computed(() => {
    const errors = formContext?.state?.errors || {};
    const labels = formContext?.state?.labels || {};
    const showsErrors = formContext?.state?.showsErrors || {};
    const entries = [];
    for (const [field, codes] of Object.entries(errors)) {
        if (field === NON_FIELD_ERRORS_KEY) {
            continue;
        }
        if (showsErrors[field]) {
            continue;
        }
        if (!codes || typeof codes !== "object") {
            continue;
        }
        const messages = Object.values(codes).filter(Boolean);
        if (messages.length === 0) {
            continue;
        }
        entries.push({ field, label: labels[field] ?? field, messages });
    }
    return entries;
});

const showValidation = computed(() => !!formContext?.state?.anyError && validationEntries.value.length > 0);
const validationCount = computed(() => validationEntries.value.length);
const validationTitle = computed(() => {
    const n = validationCount.value;
    if (n === 0) {
        return "Cannot run action";
    }
    return `Cannot run action — ${n} ${n === 1 ? "field needs" : "fields need"} attention`;
});
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="action-form-root">
        <error-display :error="combinedError" :errored="combinedErrored" :ignore-form-validation-errors="true" />
        <div :class="theme('inner')" data-qa="action-form-inner">
            <div :class="theme('nonFieldErrorBlock')">
                <form-message type="error" />
                <!-- @slot [validation-summary] Override the structured per-field validation alert shown when `formContext.state.anyError` is set and at least one field error has no rendered field showing it; receives `entries` (each `{ field, label, messages }`, limited to those errors), `count`, and `title`. -->
                <slot
                    v-if="showValidation"
                    name="validation-summary"
                    :entries="validationEntries"
                    :count="validationCount"
                    :title="validationTitle"
                >
                    <div :class="theme('validation')" role="alert" data-tone="danger" data-qa="action-form-validation">
                        <div v-if="icon('triangleExclamation')" :class="theme('validationIcon')" aria-hidden="true">
                            <component
                                :is="icon('triangleExclamation').component"
                                v-bind="icon('triangleExclamation').props"
                                aria-hidden="true"
                            />
                        </div>
                        <div :class="theme('validationBody')">
                            <div :class="theme('validationTitle')" data-qa="action-form-validation-title">
                                {{ validationTitle }}
                            </div>
                            <p :class="theme('validationDesc')" data-qa="action-form-validation-desc">
                                These errors are not shown beside a field. Resolve them, then try again.
                            </p>
                            <ul :class="theme('validationList')" data-qa="action-form-validation-list">
                                <li
                                    v-for="entry in validationEntries"
                                    :key="entry.field"
                                    :class="theme('validationListItem')"
                                    data-qa="action-form-validation-item"
                                >
                                    <span :class="theme('validationField')" data-qa="action-form-validation-field">
                                        {{ entry.label }}
                                    </span>
                                    <span :class="theme('validationMsg')">
                                        {{ entry.messages.join("; ") }}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </slot>
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
                            type="submit"
                            :disabled="formContext.state.anyError"
                        >
                            <Button
                                type="submit"
                                tone="primary"
                                :disabled="combinedLoading || formContext.state.anyError"
                            >
                                <LoadingSpinnerInline v-if="combinedLoading" />
                                Yes, continue
                            </Button>
                        </slot>
                        <!-- Cancel button that invokes the redirect; receives `label`, `loading`, and `verb` as slot props. -->
                        <slot
                            label="Cancel, go back"
                            :loading="combinedLoading"
                            name="cancel-button"
                            @click="handleCancelClick"
                        >
                            <Button
                                type="button"
                                emphasis="ghost"
                                :disabled="combinedLoading"
                                @click="handleCancelClick"
                            >
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
        <!-- Resolves submit-time warning confirmations (HTTP 409); without it warned actions would be cancelled. -->
        <form-confirm-dialog :controller="confirmation">
            <!-- @slot [form-confirm-dialog-warnings] Override how warning messages render inside the confirmation dialog entirely; receives FormConfirmDialog's `warnings` slot scope (`warnings`, the controller's raw warnings mapping; `bulk`, whether it uses the per-object shape). Falls through to FormConfirmDialog's own default rendering when not provided. -->
            <template v-if="$slots['form-confirm-dialog-warnings']" #warnings="{ warnings, bulk }">
                <slot name="form-confirm-dialog-warnings" :warnings="warnings" :bulk="bulk" />
            </template>
        </form-confirm-dialog>
    </div>
</template>
