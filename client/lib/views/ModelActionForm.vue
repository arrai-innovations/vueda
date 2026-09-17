<script setup>
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FieldWarningsList from "@vueda/form/confirm/FieldWarningsList.vue";
import TypedConfirmField from "@vueda/form/confirm/TypedConfirmField.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import "@vueda/theme/vueda-tailwind/views/ModelActionForm.theme.js";
import { useForm } from "@vueda/use/useForm.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { useModelAction } from "@vueda/use/useModelAction.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import ActionForm from "@vueda/views/ActionForm.vue";
import ActionBanner from "@vueda/views/_ActionBanner.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import omit from "lodash-es/omit.js";
import { computed, inject, provide, ref, unref, useSlots, watch } from "vue";

/**
 * Wraps `ActionForm` to execute a named action (such as delete or a custom
 * bulk operation) against one or more model instances. It displays the
 * selected objects, a confirmation message, and handles submission, dry-run
 * validation, and post-action redirect to the appropriate list or detail view.
 *
 * Renders a tone-tracked confirmation card with a banner, a selected-objects
 * chip-row panel, and a confirm-prompt panel. The `bare` prop suppresses the
 * card chrome and banner so a parent view (such as `ViewDestroy`) can wrap
 * the form in its own toned card.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name the action targets. */
    model: {
        type: String,
        required: true,
    },
    /** Action identifier (e.g. `"delete"` or a custom action name) sent to the server. */
    action: {
        type: String,
        required: true,
    },
    /** Primary key or primary keys used when selected objects have not been fetched yet. */
    pk: {
        type: [String, Number, Array],
        default: undefined,
    },
    /** Human-readable action name shown in confirmation and result messages; defaults to a title-cased version of `action`. */
    actionVerboseName: {
        type: String,
        default: undefined,
    },
    /** Toast summary shown on successful action completion; auto-generated from the action and model name if omitted. */
    actionSuccessSummary: {
        type: String,
        default: undefined,
    },
    /** Toast summary shown when the action fails; auto-generated from the action and model name if omitted. */
    actionErrorSummary: {
        type: String,
        default: undefined,
    },
    /** Confirmation message shown to the user before submitting; auto-generated from the action and model name if omitted. */
    confirmMessage: {
        type: String,
        default: undefined,
    },
    /** Reactive fetch state object providing the list of selected objects and their data. */
    fetchState: {
        type: Object,
        default: undefined,
    },
    /**
     * reactive-helpers list instance holding the selected objects. Bulk actions use it so a real
     * destroy reconciles the rows the caller is showing. Omit it to use a private transport-only list.
     */
    instanceList: {
        type: Object,
        default: undefined,
    },
    /** Optional function to transform form values before they are sent in the request body. */
    transformSubmitDataFn: {
        type: Function,
        default: undefined,
    },
    /** HTTP method used for the action request (ignored for destroy actions, which always use DELETE). */
    requestMethod: {
        type: String,
        default: "PUT",
    },
    /** When true, performs a dry-run validation request before the final submission. */
    enableDryRun: {
        type: Boolean,
        default: true,
    },
    /**
     * Sentiment tone that drives the banner and card accents.
     * One of `info` (default confirmations), `success` (activate / restore),
     * `warning` (irreversible non-destructive), or `danger` (destructive).
     * Routed via `data-tone` on the card root and consumed by Tailwind v4
     * `group-data-[tone=…]/model-action-form:` variants.
     */
    tone: {
        type: String,
        default: "info",
        validator: (value) => ["info", "success", "warning", "danger", "neutral"].includes(value),
    },
    /** Optional banner title; defaults to a sentence built from action + model name. */
    bannerTitle: {
        type: String,
        default: undefined,
    },
    /** Optional banner description; defaults to "Review the selected records before continuing." */
    bannerDescription: {
        type: String,
        default: undefined,
    },
    /**
     * When true, suppress the card chrome and tone-tracked banner. Used by
     * parent views (such as `ViewDestroy`) that wrap the form in their own
     * toned card.
     */
    bare: {
        type: Boolean,
        default: false,
    },
    /**
     * Literal phrase the operator must type before the confirm button enables.
     * When set, a `TypedConfirmField` renders inside the body (after any
     * `extra-fields` slot content) and the submit button is gated until the
     * typed value matches. Leave undefined to skip the type-to-confirm gate.
     */
    confirmText: {
        type: String,
        default: undefined,
    },
});

// The embedded ActionForm injects FormContextSymbol and useActionForm calls into it on
// every submit: setAllTouched(), state.submittingValues for the request body, and
// handleServerFormValidationError() to route a 400's field errors back onto the fields.
// Only ViewAction establishes a context of its own (it renders form fields, so it has to
// own one above this component); ViewDestroy and ViewActivate render this component
// directly with nothing above it. Establish one here when none is injected so those views
// have a working form rather than a missing dependency.
//
// A no-op stand-in is not a substitute. ActionForm builds its validation summary from
// state.errors and gates submit on state.anyError, so against a stub a server 400 would
// leave both empty: a generic toast, no per-field messages, and a submit button still
// enabled for the same rejection. The `extra-fields` slot has the same problem, since
// fields placed there would fall back to useField's per-field local context and never
// reach submittingValues.
//
// Provide only when absent: ViewAction's context sits above this component and must keep
// serving its own fields.
const injectedFormContext = inject(FormContextSymbol, null);
const formContext = injectedFormContext ?? useForm({});
if (!injectedFormContext) {
    provide(FormContextSymbol, formContext);
}

const modelAction = useModelAction(props);
const {
    pksAsString,
    pkCount,
    objectsMap,
    modelVerboseName,
    actionSuccessSummary: actionSuccessSummaryComputed,
    actionErrorSummary: actionErrorSummaryComputed,
    confirmMessage: computedConfirmMessage,
    bannerTitle: computedBannerTitle,
    bannerDescription: computedBannerDescription,
    bannerIconName,
    readyToDryRun: dryRun,
    dryRunTarget,
} = modelAction.state;
const redirectTo = modelAction.redirectTo;
const defaultRunAction = modelAction.runAction;
const theme = useTheme("ModelActionForm", props);
const icon = useIcons("ModelActionForm", props);
const slots = useSlots();

const typedConfirmInput = ref("");
watch(dryRunTarget, () => {
    typedConfirmInput.value = "";
    if (!injectedFormContext) {
        formContext.reset();
    }
});
const typedConfirmMatch = computed(() => typedConfirmInput.value === props.confirmText);
const typedConfirmGateBlocking = computed(() => !!props.confirmText && !typedConfirmMatch.value);

/**
 * Normalizes the confirmation dialog's raw warnings mapping into one display group per warned
 * object. `bulk` (from the confirmation controller's `ConfirmationRequiredError`, forwarded
 * through `ActionForm`'s `form-confirm-dialog-warnings` slot) reports which shape `warnings` is
 * actually in -- the request that produced it, not the current selection count, since a custom
 * `run-action` can issue a bulk request regardless of how many objects are selected. A bulk
 * action's `warnings` is keyed by object id (`{ [pk]: {field: [messages]} }`); a single-object
 * action's `warnings` is already one object's field-messages mapping, so it becomes the sole
 * group, with no pk to resolve a display name for.
 */
const resolveWarningGroups = (warnings, bulk) => {
    if (!bulk) {
        return [{ pk: undefined, fieldMessages: warnings }];
    }
    return Object.entries(warnings ?? {}).map(([pk, fieldMessages]) => ({ pk, fieldMessages }));
};
</script>

<template>
    <action-form
        :fetch-state="fetchState"
        :redirect-to="redirectTo"
        :run-action="defaultRunAction"
        :ready-to-dry-run="dryRun"
        :dry-run-target="dryRunTarget"
        v-bind="$attrs"
        :action-error-summary="actionErrorSummaryComputed"
        :action-success-summary="actionSuccessSummaryComputed"
    >
        <template
            v-for="(_, slot) in omit(slots, [
                'action-form-inner',
                'confirm-button',
                'form-confirm-dialog-warnings',
                'warning-entry',
            ])"
            #[slot]="slotProps"
        >
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
        <template #confirm-button="slotProps">
            <slot
                v-if="$slots['confirm-button']"
                name="confirm-button"
                v-bind="{ ...slotProps, disabled: slotProps.disabled || typedConfirmGateBlocking }"
            />
            <Button
                v-else
                type="submit"
                tone="primary"
                :disabled="slotProps.loading || slotProps.disabled || typedConfirmGateBlocking"
            >
                <LoadingSpinnerInline v-if="slotProps.loading" />
                {{ slotProps.label }}
            </Button>
        </template>
        <template #action-form-inner="{ combinedLoading }">
            <component
                :is="bare ? 'div' : 'section'"
                :class="bare ? theme('bare') : theme('card')"
                :style="theme.hideStyle?.value"
                :data-tone="bare ? undefined : tone"
                :data-qa="bare ? undefined : 'model-action-form-card'"
            >
                <!-- @slot [action-banner] Override the tone-tracked banner shown above the confirmation body. Only rendered when `bare` is false. -->
                <slot
                    v-if="!bare"
                    name="action-banner"
                    :tone="tone"
                    :title="computedBannerTitle"
                    :description="computedBannerDescription"
                    :action="action"
                    :pk-count="pkCount"
                    :model-verbose-name="modelVerboseName"
                >
                    <action-banner
                        :theme="theme"
                        :icon="icon"
                        :icon-name="bannerIconName"
                        :title="computedBannerTitle"
                        :description="computedBannerDescription"
                        banner-qa="model-action-form-banner"
                        title-qa="model-action-form-banner-title"
                        description-qa="model-action-form-banner-desc"
                    >
                        <!-- @slot [banner-meta] Optional mono meta strip rendered below the banner description (e.g. "action archive · scope 4 selected"). -->
                        <div
                            v-if="$slots['banner-meta']"
                            :class="theme('bannerMeta')"
                            data-qa="model-action-form-banner-meta"
                        >
                            <slot name="banner-meta" :tone="tone" :action="action" :pk-count="pkCount" />
                        </div>
                    </action-banner>
                </slot>
                <div :class="theme('body')" data-qa="model-action-form-body">
                    <div :class="theme('selectedObjects')" data-qa="action-form-selected-objects" data-tone="neutral">
                        <!-- @slot [selected-objects] Override the list of selected objects shown above the confirmation form. -->
                        <slot
                            :loading="combinedLoading"
                            name="selected-objects"
                            :objects="objectsMap"
                            :pks="pksAsString"
                            :theme="theme"
                        >
                            <div :class="theme('selectedHead')">
                                <span :class="theme('selectedObjectsLabel')">
                                    Selected {{ unref(modelVerboseName) }}
                                </span>
                                <span
                                    v-if="pkCount > 0"
                                    :class="theme('selectedHeadCount')"
                                    data-qa="action-form-selected-count"
                                >
                                    {{ pkCount }} of {{ pkCount }} selected
                                </span>
                            </div>
                            <div v-if="combinedLoading">
                                <p>Loading objects...</p>
                            </div>
                            <ul v-else :class="theme('list')" data-qa="action-form-list">
                                <li
                                    v-for="targetPk in pksAsString"
                                    :key="targetPk"
                                    :class="theme('listItem')"
                                    data-qa="action-form-list-item"
                                >
                                    <form-field
                                        :field-value="targetPk"
                                        :label="targetPk"
                                        :name="targetPk"
                                        :read-only="true"
                                    >
                                        <widget-read-only
                                            :app="app"
                                            :foreign-key-obj="objectsMap.get(targetPk)"
                                            :hidden="true"
                                            :invalid="false"
                                            :loading="combinedLoading"
                                            :model="model"
                                            :warning="false"
                                        >
                                            <template #link-item="linkItemSlotProps">
                                                <!-- @slot [link-item] Override the link rendered for each selected object in the default list. -->
                                                <slot name="link-item" v-bind="linkItemSlotProps" />
                                            </template>
                                        </widget-read-only>
                                    </form-field>
                                    <span :class="theme('listItemPk')" data-qa="action-form-list-item-pk">
                                        {{ targetPk }}
                                    </span>
                                </li>
                            </ul>
                        </slot>
                    </div>
                    <div :class="theme('message')" data-qa="action-form-message">
                        <!-- @slot [confirm-message] Override the confirmation prompt shown before submitting. -->
                        <slot name="confirm-message">
                            <p :class="theme('messageText')">{{ computedConfirmMessage }}</p>
                        </slot>
                    </div>
                    <!-- @slot [extra-fields] Additional FormField inputs rendered below the confirm prompt, inside the card body. -->
                    <div v-if="$slots['extra-fields']" :class="theme('extraFields')" data-qa="action-form-extra-fields">
                        <slot name="extra-fields" :loading="combinedLoading" :pks="pksAsString" :objects="objectsMap" />
                    </div>
                    <typed-confirm-field v-if="confirmText" v-model="typedConfirmInput" :expected-value="confirmText" />
                </div>
            </component>
        </template>
        <!--
            Overrides ActionForm's `form-confirm-dialog-warnings` slot (in turn FormConfirmDialog's
            `warnings` slot). `resolveWarningGroups` normalizes a bulk action's per-object-id
            warnings and a single-object action's plain warnings into the same one-group-per-object
            shape, so this renders both identically: each group's display name resolves via the same
            WidgetReadOnly link used by the selected-objects list above (omitted for the single,
            unkeyed group), and each group's own field-messages mapping renders via
            `FieldWarningsList. The `warning-entry` slot forwards to every group's
            `FieldWarningsList`, with `pk` added to its scope (`undefined` for the single, unkeyed
            group) so a consumer can tell which warned object it's rendering for.
        -->
        <template #form-confirm-dialog-warnings="{ warnings, bulk }">
            <slot
                name="form-confirm-dialog-warnings"
                :warnings="warnings"
                :bulk="bulk"
                :normalized-warnings="resolveWarningGroups(warnings, bulk)"
                data-qa="model-action-form-confirm-warning-group"
                :class="theme('confirmWarningGroup')"
            >
                <div
                    v-for="group in resolveWarningGroups(warnings, bulk)"
                    :key="group.pk ?? 'single'"
                    :class="theme('confirmWarningGroup')"
                    data-qa="model-action-form-confirm-warning-group"
                >
                    <div v-if="group.pk" :class="theme('confirmWarningLabel')">
                        <widget-read-only
                            :app="app"
                            :foreign-key-obj="objectsMap.get(group.pk)"
                            :invalid="false"
                            :model="model"
                            :warning="false"
                        >
                            <template #link-item="linkItemSlotProps">
                                <slot name="link-item" v-bind="linkItemSlotProps" />
                            </template>
                        </widget-read-only>
                    </div>
                    <field-warnings-list :messages="group.fieldMessages">
                        <!-- @slot [warning-entry] Override one warned object's field's entire warning layout; receives FieldWarningsList's `entry` slot scope (`field`, `messages`) plus `pk`. -->
                        <template v-if="$slots['warning-entry']" #entry="entrySlotProps">
                            <slot name="warning-entry" v-bind="{ ...entrySlotProps, pk: group.pk }" />
                        </template>
                    </field-warnings-list>
                </div>
            </slot>
        </template>
    </action-form>
</template>
