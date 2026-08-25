<script setup>
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FieldWarningsList from "@vueda/form/confirm/FieldWarningsList.vue";
import TypedConfirmField from "@vueda/form/confirm/TypedConfirmField.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import "@vueda/theme/vueda-tailwind/views/ModelActionForm.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { ConfirmationRequiredError, FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import ActionForm from "@vueda/views/ActionForm.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import omit from "lodash-es/omit.js";
import startCase from "lodash-es/startCase.js";
import { computed, ref, toRef, unref, useSlots } from "vue";
import { useRoute, useRouter } from "vue-router";

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

const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const actionSuccessSummaryComputed = computed(() => {
    if (props.actionSuccessSummary) {
        return props.actionSuccessSummary;
    }
    return startCase(`${unref(computedActionVerboseNameLowerCase)} ${unref(modelVerboseName)} successful`);
});
const actionErrorSummaryComputed = computed(() => {
    if (props.actionErrorSummary) {
        return props.actionErrorSummary;
    }
    return `Failed to ${props.action} ${props.model} `;
});

const pks = computed(() => props.fetchState?.objectsInOrder?.map((obj) => obj.id));
const pksAsString = computed(() => unref(pks)?.map((pk) => pk.toString()));
const bulk = computed(() => unref(pks)?.length > 1);
const pkCount = computed(() => unref(pks)?.length ?? 0);

const modelVerboseName = computed(() =>
    unref(bulk)
        ? modelConfig.info?.verboseNamePlural || getLowerTitle(getPluralizedTitle(props.model))
        : modelConfig.info?.verboseName || getLowerTitle(props.model),
);

const computedActionVerboseNameLowerCase = computed(() => {
    return props.actionVerboseName?.length > 0 ? props.actionVerboseName : getLowerTitle(props.action);
});

const computedConfirmMessage = computed(
    () =>
        `Are you sure you want to ${unref(computedActionVerboseNameLowerCase)} the selected ${unref(modelVerboseName)}?`,
);

const computedBannerTitle = computed(() => {
    if (props.bannerTitle) {
        return props.bannerTitle;
    }
    return startCase(`${unref(computedActionVerboseNameLowerCase)} ${unref(modelVerboseName)}`);
});

const computedBannerDescription = computed(() => {
    if (props.bannerDescription) {
        return props.bannerDescription;
    }
    return "Review the selected records before continuing.";
});

const bannerIconName = computed(() => {
    switch (props.tone) {
        case "success":
            return "circleCheck";
        case "warning":
        case "danger":
            return "triangleExclamation";
        default:
            return "info";
    }
});

const route = useRoute();
const redirectTo = async (result) => {
    const returnPath = route.query?.returnPath;
    if (returnPath && typeof returnPath === "string") {
        await router.push(returnPath);
        return;
    }

    const redirects = modelConfig.config.actionRedirects || {};
    let redirect = redirects[props.action];
    if (redirect === undefined) {
        redirect = redirects.default;
    }
    if (typeof redirect === "function") {
        redirect = redirect({ bulk: unref(bulk), result });
    }

    if (unref(bulk) || redirect === "list") {
        await router.push({
            name: LIST_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: "list" },
        });
    } else {
        await router.push({
            name: DETAIL_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: redirect, pk: pks.value[0] },
        });
    }
};
const defaultRunAction = ({ formValues, dryRun, acknowledgeWarnings }) => {
    const isDestroy = props.action === "destroy";
    const headers = {
        "X-CSRFToken": getCSRFValue(),
        "Content-Type": "application/json",
    };
    if (dryRun) {
        headers["Dry-Run"] = "true";
    }
    if (acknowledgeWarnings) {
        headers["Acknowledge-Warnings"] = acknowledgeWarnings;
    }
    return fetchHelper(
        unref(bulk)
            ? getListUrl({ app: props.app, model: props.model, action: props.action })
            : getDetailUrl({ app: props.app, model: props.model, pk: pks.value[0], action: props.action }),
        {
            method: isDestroy ? "DELETE" : props.requestMethod,
            headers,
            body: (() => {
                const formData = props.transformSubmitDataFn ? props.transformSubmitDataFn(formValues) : undefined;

                if (unref(bulk)) {
                    return JSON.stringify({ pks: unref(pks), ...(formData || {}) });
                }

                return formData ? JSON.stringify(formData) : undefined;
            })(),
        },
        "Failed to execute action",
        (message, response, data) => {
            if (response.status === 400) {
                return new FormValidationError(data, response);
            }
            if (response.status === 409) {
                return new ConfirmationRequiredError(data, response);
            }
            return new FetchError(message, response, data);
        },
    );
};
const theme = useTheme("ModelActionForm", props);
const icon = useIcons("ModelActionForm", props);
const slots = useSlots();
const dryRun = computed(
    () => !!(props.app && props.model && props.action && props.enableDryRun && pks.value.length > 0),
);

const typedConfirmInput = ref("");
const typedConfirmMatch = computed(() => typedConfirmInput.value === props.confirmText);
const typedConfirmGateBlocking = computed(() => !!props.confirmText && !typedConfirmMatch.value);

/**
 * Normalizes the confirmation dialog's raw warnings mapping into one display group per warned
 * object. A bulk action's `warnings` is keyed by object id (`{ [pk]: {field: [messages]} }`); a
 * single-object action's `warnings` is already one object's field-messages mapping, so it becomes
 * the sole group, with no pk to resolve a display name for.
 */
const resolveWarningGroups = (warnings) => {
    if (!bulk.value) {
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
                    <div :class="theme('banner')" data-qa="model-action-form-banner">
                        <div v-if="icon(bannerIconName)" :class="theme('bannerIcon')" aria-hidden="true">
                            <component
                                :is="icon(bannerIconName).component"
                                v-bind="icon(bannerIconName).props"
                                aria-hidden="true"
                            />
                        </div>
                        <div :class="theme('bannerBody')">
                            <div :class="theme('bannerTitle')" data-qa="model-action-form-banner-title">
                                {{ computedBannerTitle }}
                            </div>
                            <p :class="theme('bannerDesc')" data-qa="model-action-form-banner-desc">
                                {{ computedBannerDescription }}
                            </p>
                            <!-- @slot [banner-meta] Optional mono meta strip rendered below the banner description (e.g. "action archive · scope 4 selected"). -->
                            <div
                                v-if="$slots['banner-meta']"
                                :class="theme('bannerMeta')"
                                data-qa="model-action-form-banner-meta"
                            >
                                <slot name="banner-meta" :tone="tone" :action="action" :pk-count="pkCount" />
                            </div>
                        </div>
                    </div>
                </slot>
                <div :class="theme('body')" data-qa="model-action-form-body">
                    <div :class="theme('selectedObjects')" data-qa="action-form-selected-objects" data-tone="neutral">
                        <!-- @slot [selected-objects] Override the list of selected objects shown above the confirmation form. -->
                        <slot
                            :loading="combinedLoading"
                            name="selected-objects"
                            :objects="fetchState?.objectsMap"
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
                                    v-for="pk in pksAsString"
                                    :key="pk"
                                    :class="theme('listItem')"
                                    data-qa="action-form-list-item"
                                >
                                    <form-field :field-value="pk" :label="pk" :name="pk" :read-only="true">
                                        <widget-read-only
                                            :app="app"
                                            :foreign-key-obj="fetchState.objectsMap.get(pk)"
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
                                        {{ pk }}
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
                        <slot
                            name="extra-fields"
                            :loading="combinedLoading"
                            :pks="pksAsString"
                            :objects="fetchState?.objectsMap"
                        />
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
            `FieldWarningsList`, the same component ActionForm renders by default for a
            single-object action's warnings. The `warning-entry` slot forwards to every group's
            `FieldWarningsList`, with `pk` added to its scope (`undefined` for the single, unkeyed
            group) so a consumer can tell which warned object it's rendering for.
        -->
        <template #form-confirm-dialog-warnings="{ warnings }">
            <slot
                name="form-confirm-dialog-warnings"
                :warnings="warnings"
                :normalized-warnings="resolveWarningGroups(warnings)"
                data-qa="model-action-form-confirm-warning-group"
                :class="theme('confirmWarningGroup')"
            >
                <div
                    v-for="group in resolveWarningGroups(warnings)"
                    :key="group.pk ?? 'single'"
                    :class="theme('confirmWarningGroup')"
                    data-qa="model-action-form-confirm-warning-group"
                >
                    <div v-if="group.pk" :class="theme('confirmWarningLabel')">
                        <widget-read-only
                            :app="app"
                            :foreign-key-obj="fetchState.objectsMap.get(group.pk)"
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
